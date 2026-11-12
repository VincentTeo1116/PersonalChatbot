// Fixed-window counter kept in memory. On a serverless host each warm instance has its own counter, so this slows a script down rather than stopping a determined one; Turnstile (see lib/turnstile.ts) is the stronger control.
const buckets = new Map<string, { count: number; resetAt: number }>();
const MAX_BUCKETS = 5000;

export function rateLimited(key: string, max: number, windowMs: number, now = Date.now()): boolean {
  const bucket = buckets.get(key);
  if (!bucket || bucket.resetAt <= now) {
    if (buckets.size >= MAX_BUCKETS) {
      for (const [k, b] of buckets) if (b.resetAt <= now) buckets.delete(k);
      if (buckets.size >= MAX_BUCKETS) buckets.clear();
    }
    buckets.set(key, { count: 1, resetAt: now + windowMs });
    return false;
  }
  bucket.count += 1;
  return bucket.count > max;
}
