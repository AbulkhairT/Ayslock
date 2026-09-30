import type { Queryable } from "./db";

export class RateLimitError extends Error {
  constructor(message = "Too many attempts. Please wait a bit and try again.") {
    super(message);
  }
}

/** Fixed-window counter stored in Postgres, so it works across server instances. */
export async function rateLimit(q: Queryable, key: string, limit: number, windowSeconds: number) {
  const windowStart = new Date(Math.floor(Date.now() / (windowSeconds * 1000)) * windowSeconds * 1000);
  const rows = await q.query<{ count: number }>(
    `insert into rate_limits (key, window_start, count) values ($1, $2, 1)
     on conflict (key, window_start) do update set count = rate_limits.count + 1
     returning count`,
    [key, windowStart],
  );
  if (rows[0].count > limit) throw new RateLimitError();
  if (Math.random() < 0.02) {
    await q.query("delete from rate_limits where window_start < now() - interval '1 day'");
  }
}
