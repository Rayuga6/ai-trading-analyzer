/**
 * In-memory sliding-window rate limiter.
 *
 * Intended for lightweight application-level protection. For a
 * multi-instance production deployment, use a shared store (for example
 * Redis/Upstash) so limits are enforced consistently across instances.
 */

export type RateLimitOptions = {
  limit: number;
  windowMs: number;
  keyPrefix?: string;
};

export type RateLimitResult = {
  success: boolean;
  limit: number;
  remaining: number;
  resetAt: number;
  retryAfterSeconds: number;
};

type Bucket = {
  timestamps: number[];
};

const buckets = new Map<string, Bucket>();

const DEFAULT_LIMIT = 10;
const DEFAULT_WINDOW_MS = 10 * 60 * 1000;

function cleanupBucket(key: string, now: number, windowMs: number) {
  const bucket = buckets.get(key);

  if (!bucket) {
    return [];
  }

  const cutoff = now - windowMs;
  bucket.timestamps = bucket.timestamps.filter((timestamp) => timestamp > cutoff);

  if (bucket.timestamps.length === 0) {
    buckets.delete(key);
    return [];
  }

  return bucket.timestamps;
}

export function rateLimit(
  key: string,
  options: RateLimitOptions = {
    limit: DEFAULT_LIMIT,
    windowMs: DEFAULT_WINDOW_MS,
  },
): RateLimitResult {
  const now = Date.now();
  const limit = Math.max(1, Math.floor(options.limit));
  const windowMs = Math.max(1000, Math.floor(options.windowMs));
  const prefix = options.keyPrefix ?? "app";
  const bucketKey = `${prefix}:${key}`;

  const timestamps = cleanupBucket(bucketKey, now, windowMs);

  if (!buckets.has(bucketKey)) {
    buckets.set(bucketKey, { timestamps: [] });
  }

  const bucket = buckets.get(bucketKey)!;

  if (timestamps.length >= limit) {
    const oldest = timestamps[0] ?? now;
    const resetAt = oldest + windowMs;
    const retryAfterSeconds = Math.max(
      1,
      Math.ceil((resetAt - now) / 1000),
    );

    return {
      success: false,
      limit,
      remaining: 0,
      resetAt,
      retryAfterSeconds,
    };
  }

  bucket.timestamps.push(now);

  const resetAt =
    (bucket.timestamps[0] ?? now) + windowMs;

  return {
    success: true,
    limit,
    remaining: Math.max(0, limit - bucket.timestamps.length),
    resetAt,
    retryAfterSeconds: 0,
  };
}

export function getRateLimitHeaders(
  result: RateLimitResult,
): Record<string, string> {
  return {
    "X-RateLimit-Limit": String(result.limit),
    "X-RateLimit-Remaining": String(result.remaining),
    "X-RateLimit-Reset": String(Math.ceil(result.resetAt / 1000)),
    ...(result.success
      ? {}
      : { "Retry-After": String(result.retryAfterSeconds) }),
  };
}

export function resetRateLimit(key?: string) {
  if (!key) {
    buckets.clear();
    return;
  }

  for (const bucketKey of buckets.keys()) {
    if (bucketKey.endsWith(`:${key}`) || bucketKey === key) {
      buckets.delete(bucketKey);
    }
  }
}

export function getRateLimitConfig() {
  return {
    limit: DEFAULT_LIMIT,
    windowMs: DEFAULT_WINDOW_MS,
  };
}
