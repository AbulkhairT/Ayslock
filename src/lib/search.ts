import type { Queryable } from "./db";
import type { AccessMode } from "./types";
import { normalizeUsername } from "./username";
import { visibleSql } from "./visibility";

export interface SearchResult {
  username: string;
  display_name: string;
  profession: string;
  avatar_url: string | null;
  access_mode: AccessMode;
  /** The query was this provider's exact @username. */
  exact: boolean;
}

/** Trim, cap and drop a leading @. Returns "" for queries too short to search. */
export function cleanQuery(raw: string): string {
  const q = raw.trim().replace(/\s+/g, " ").slice(0, 60);
  return q.replace(/^@+/, "").length >= 2 ? q : "";
}

/**
 * Find providers by exact @username or by name.
 * - An exact username always matches: anyone who has it can already open the page.
 * - Name and username-prefix matches only include providers who are listed, not invite-only,
 *   and have at least one bookable service.
 * Only public profile fields are returned; nothing about availability.
 */
export async function searchProviders(q: Queryable, raw: string): Promise<SearchResult[]> {
  const text = cleanQuery(raw);
  if (!text) return [];
  const handle = text.startsWith("@");
  const bare = text.replace(/^@+/, "").toLowerCase();
  const username = normalizeUsername(bare);
  const like = (s: string) => s.replace(/[\\%_]/g, (c) => `\\${c}`);
  return q.query<SearchResult>(
    `select username, display_name, profession, avatar_url, access_mode,
            lower(username) = $1 as exact
       from providers p
      where ${visibleSql("p")} and (lower(username) = $1
         or (listed and access_mode <> 'private'
             and exists (select 1 from services s where s.provider_id = p.id and s.active)
             and (($4 and lower(username) like $3 || '%')
                  or (not $5 and (lower(display_name) like $2 || '%' or lower(display_name) like '% ' || $2 || '%')))))
      order by exact desc, lower(display_name) like $2 || '%' desc, display_name
      limit 8`,
    [username ?? "", like(bare), like(username ?? ""), !!username, handle],
  );
}
