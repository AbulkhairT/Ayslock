import { modes } from "./env";

// Which profiles the public can find and book.
// - Demo mode: all of them.
// - Otherwise: never profiles made with simulated sign-in (providers.demo), and, when the database
//   is the Supabase project itself, only profiles whose owner is a real account in auth.users.
//   That hides profiles left over from another sign-in setup without deleting them.
let checkAccounts = false;

export function setAccountCheck(on: boolean) {
  checkAccounts = on;
}

export function visibleSql(alias = "providers") {
  if (modes.auth === "demo") return "true";
  return checkAccounts ? `(not ${alias}.demo and exists (select 1 from auth.users u where u.id = ${alias}.owner_id))` : `not ${alias}.demo`;
}
