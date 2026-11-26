"""Request limits, kept in memory.

One process serves the whole site, so in-process counters are enough to stop a single address from using up the shared model quota,
and (see budget.py) to cap what all callers together can spend in a day. The counters start again when the service restarts.
Run the service with a single worker: with several, each would keep its own counts and every limit would be multiplied.
A human check in front of the chat (for example Turnstile) is still the stronger defence against a scripted, many-address attack.
"""
import ipaddress
import math
import threading
import time
from collections import deque

from fastapi import HTTPException, Request

from src.config import Config

_lock = threading.Lock()
_hits: dict[str, deque[float]] = {}
_windows: dict[str, float] = {}  # each key's own window, so the clean-up never drops a daily counter while tidying minute ones
_MAX_KEYS = 10_000
_PROTECTED = "global:"  # site-wide counters are never evicted to make room


def client_ip(request: Request) -> str:
    """Best guess at the real caller. Render sits behind Cloudflare, which sets CF-Connecting-IP itself; otherwise use the
    last X-Forwarded-For entry, which the platform proxy appended and the caller cannot forge."""
    cloudflare = request.headers.get("cf-connecting-ip")
    if cloudflare:
        return cloudflare.strip()
    forwarded = request.headers.get("x-forwarded-for")
    if forwarded:
        return forwarded.split(",")[-1].strip()
    return request.client.host if request.client else "unknown"


def caller_key(ip: str) -> str:
    """What a caller is counted under. An IPv6 user usually controls a whole /64 block (billions of addresses), so the block is
    counted as one caller; IPv4 addresses are counted singly. Anything that is not an address is used as it is (shortened), which
    puts every caller we cannot identify into one shared, and therefore stricter, bucket."""
    text = (ip or "unknown").strip()[:64] or "unknown"
    try:
        address = ipaddress.ip_address(text)
    except ValueError:
        return text
    if isinstance(address, ipaddress.IPv6Address):
        if address.ipv4_mapped:
            return str(address.ipv4_mapped)
        return str(ipaddress.ip_network(f"{address}/64", strict=False).network_address) + "/64"
    return str(address)


def _prune(key: str, window_s: float, now: float) -> deque[float]:
    queue = _hits.get(key)
    if queue is None:
        queue = _hits[key] = deque()
    _windows[key] = window_s
    while queue and queue[0] <= now - window_s:
        queue.popleft()
    return queue


def _sweep(now: float) -> None:
    """Called with the lock held when there are too many keys: drop the ones whose own window has passed, then, if that was not
    enough (a very large number of live callers), the ones heard from longest ago. Site-wide counters are kept."""
    for key in [k for k, q in _hits.items() if not q or q[-1] <= now - _windows.get(k, 0)]:
        _hits.pop(key, None)
        _windows.pop(key, None)
    target = int(_MAX_KEYS * 0.9)
    if len(_hits) > target:
        oldest_first = sorted((k for k in _hits if not k.startswith(_PROTECTED)), key=lambda k: _hits[k][-1])
        for key in oldest_first[: len(_hits) - target]:
            _hits.pop(key, None)
            _windows.pop(key, None)


def _wait(queue: deque[float], limit: int, window_s: float, now: float) -> int:
    return max(1, int(queue[0] + window_s - now) + 1) if len(queue) >= limit else 0


def retry_after(key: str, limit: int, window_s: float, now: float | None = None) -> int:
    """Records one hit; returns 0 when allowed, otherwise the seconds until the oldest hit leaves the window."""
    return take([(key, limit, window_s)], now)[0]


def take(rules: list[tuple[str, int, float]], now: float | None = None) -> tuple[int, str | None]:
    """All-or-nothing version for several (key, limit, window seconds) rules at once: when every rule allows it, one hit is
    recorded under each and (0, None) is returned. When any rule is full nothing is recorded, and the wait in seconds and the
    key that blocked are returned. A limit of 0 or less switches that rule off."""
    now = time.monotonic() if now is None else now
    active = [(key, limit, window) for key, limit, window in rules if limit > 0]
    with _lock:
        if len(_hits) > _MAX_KEYS:
            _sweep(now)
        queues = [_prune(key, window, now) for key, _, window in active]
        for (key, limit, window), queue in zip(active, queues):
            wait = _wait(queue, limit, window, now)
            if wait:
                return wait, key
        for queue in queues:
            queue.append(now)
        return 0, None


def used(key: str, window_s: float, now: float | None = None) -> int:
    """How many hits are currently counted under a key (for logs and tests); records nothing."""
    now = time.monotonic() if now is None else now
    with _lock:
        return sum(1 for t in _hits.get(key, ()) if t > now - window_s)


def owner_first_name() -> str:
    return (Config.OWNER_NAME or "").split()[0] if (Config.OWNER_NAME or "").strip() else "the site owner"


def _about(wait_s: int) -> str:
    minutes = max(1, math.ceil(wait_s / 60))
    if minutes < 90:
        return f"about {minutes} minute{'s' if minutes != 1 else ''}"
    hours = math.ceil(minutes / 60)
    return f"about {hours} hours"


def limit_message(window_s: float, wait_s: int) -> str:
    """A polite explanation for a caller who has reached a limit, worded for how long the limit lasts."""
    if window_s <= 60:
        return "You're asking quite quickly. Please wait a minute and try again."
    contact = f"If it's urgent, the contact form on this site reaches {owner_first_name()} directly."
    if window_s <= 3600:
        return f"You've reached this assistant's hourly limit. Please try again in {_about(wait_s)}. {contact}"
    return f"You've reached this assistant's daily limit. Please try again in {_about(wait_s)}. {contact}"


def limiter(name: str, *rules: tuple[int, int]):
    """FastAPI dependency: `rules` are (max requests, window seconds) pairs that must all hold. A limit of 0 or less is skipped."""

    def check(request: Request) -> None:
        caller = caller_key(client_ip(request))
        for limit, window in rules:
            if limit <= 0:
                continue
            wait = retry_after(f"{name}:{window}:{caller}", limit, window)
            if wait:
                raise HTTPException(status_code=429, detail=limit_message(window, wait), headers={"Retry-After": str(wait)})

    return check


def reset() -> None:
    with _lock:
        _hits.clear()
        _windows.clear()
