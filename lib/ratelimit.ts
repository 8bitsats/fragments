import { Duration } from './duration';

interface RateLimitInfo {
  amount: number;
  remaining: number;
  reset: number;
}

interface RateLimitEntry {
  count: number;
  reset: number;
}

// In-memory storage for rate limiting
const rateLimits = new Map<string, RateLimitEntry>();

// Clean up expired entries every minute
setInterval(() => {
  const now = Date.now();
  Array.from(rateLimits.entries()).forEach(([key, entry]) => {
    if (entry.reset <= now) {
      rateLimits.delete(key);
    }
  });
}, 60000);

export default async function ratelimit(
  ip: string | null,
  amount: number,
  window: Duration
): Promise<RateLimitInfo | false> {
  if (!ip) {
    return false;
  }

  const now = Date.now();
  const key = `ratelimit:${ip}`;
  const windowInSeconds = parseInt(window.match(/\d+/)?.[0] || '0') * (
    window.includes('h') ? 3600 : window.includes('m') ? 60 : 1
  );
  const windowMs = windowInSeconds * 1000;

  // Get or create rate limit entry
  let entry = rateLimits.get(key);
  if (!entry || entry.reset <= now) {
    entry = {
      count: 0,
      reset: now + windowMs
    };
    rateLimits.set(key, entry);
  }

  // Increment count
  entry.count++;

  // Check if limit exceeded
  if (entry.count > amount) {
    return {
      amount,
      remaining: 0,
      reset: entry.reset
    };
  }

  return {
    amount,
    remaining: Math.max(0, amount - entry.count),
    reset: entry.reset
  };
}
