// Simple in-memory rate limit + cache (swap for Redis/DB in production).
const hits = new Map<string, { count: number; reset: number }>();
const cache = new Map<string, { value: any; exp: number }>();

export function rateLimit(key: string, limitPerMin: number): boolean {
  const now = Date.now();
  const h = hits.get(key);
  if (!h || now > h.reset) { hits.set(key, { count: 1, reset: now + 60000 }); return true; }
  if (h.count >= limitPerMin) return false;
  h.count += 1; return true;
}

export function getCache(key: string) {
  const c = cache.get(key);
  if (!c || Date.now() > c.exp) { cache.delete(key); return null; }
  return c.value;
}
export function setCache(key: string, value: any, ttlSec = 600) {
  cache.set(key, { value, exp: Date.now() + ttlSec * 1000 });
}
export function cacheKey(obj: unknown) {
  return Buffer.from(JSON.stringify(obj)).toString("base64").slice(0, 128);
}
