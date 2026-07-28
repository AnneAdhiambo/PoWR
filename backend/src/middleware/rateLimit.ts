import { NextFunction, Request, Response } from "express";

interface Bucket {
  count: number;
  resetAt: number;
}

export function rateLimit(options: { windowMs: number; max: number; keyPrefix: string }) {
  const buckets = new Map<string, Bucket>();
  return (req: Request, res: Response, next: NextFunction) => {
    const now = Date.now();
    const forwarded = String(req.headers["x-forwarded-for"] || "").split(",")[0].trim();
    const identity = forwarded || req.ip || req.socket.remoteAddress || "unknown";
    const key = `${options.keyPrefix}:${identity}`;
    const existing = buckets.get(key);
    const bucket = !existing || existing.resetAt <= now
      ? { count: 0, resetAt: now + options.windowMs }
      : existing;
    bucket.count += 1;
    buckets.set(key, bucket);
    res.setHeader("RateLimit-Limit", String(options.max));
    res.setHeader("RateLimit-Remaining", String(Math.max(options.max - bucket.count, 0)));
    res.setHeader("RateLimit-Reset", String(Math.ceil(bucket.resetAt / 1000)));
    if (bucket.count > options.max) {
      res.setHeader("Retry-After", String(Math.ceil((bucket.resetAt - now) / 1000)));
      return res.status(429).json({ error: "Too many requests. Please try again later." });
    }
    if (buckets.size > 10_000) {
      for (const [bucketKey, value] of buckets) {
        if (value.resetAt <= now) buckets.delete(bucketKey);
      }
    }
    next();
  };
}
