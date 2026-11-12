"""Per-client request limits, kept in memory.

One Render instance serves the whole site, so an in-process counter is enough to stop a single address from using up the shared model quota.
It is not a defence against a distributed attack: put Cloudflare or a firewall rule in front for that.
"""
import threading
import time
from collections import defaultdict, deque

from fastapi import HTTPException, Request

_lock = threading.Lock()
_hits: dict[str, deque[float]] = defaultdict(deque)
_MAX_KEYS = 10_000


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


def retry_after(key: str, limit: int, window_s: float, now: float | None = None) -> int:
    """Records one hit; returns 0 when allowed, otherwise the seconds until the oldest hit leaves the window."""
    now = time.monotonic() if now is None else now
    with _lock:
        if len(_hits) > _MAX_KEYS:
            for k in [k for k, q in _hits.items() if not q or q[-1] < now - window_s]:
                del _hits[k]
        queue = _hits[key]
        while queue and queue[0] <= now - window_s:
            queue.popleft()
        if len(queue) >= limit:
            return max(1, int(queue[0] + window_s - now) + 1)
        queue.append(now)
        return 0


def limiter(name: str, *rules: tuple[int, int]):
    """FastAPI dependency: `rules` are (max requests, window seconds) pairs that must all hold."""

    def check(request: Request) -> None:
        ip = client_ip(request)
        for limit, window in rules:
            wait = retry_after(f"{name}:{window}:{ip}", limit, window)
            if wait:
                raise HTTPException(
                    status_code=429,
                    detail="Too many requests -- please wait a moment and try again.",
                    headers={"Retry-After": str(wait)},
                )

    return check


def reset() -> None:
    with _lock:
        _hits.clear()
