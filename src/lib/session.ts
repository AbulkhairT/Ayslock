import { redirect } from "next/navigation";
import { currentUser } from "./auth";
import { getDb } from "./db";
import { providerByOwner } from "./providers";

export async function requireUser() {
  const user = await currentUser();
  if (!user) redirect("/signin");
  return user;
}

/** The signed-in provider. Every dashboard query is scoped by this provider's id. */
export async function requireProvider() {
  const user = await requireUser();
  const provider = await providerByOwner(await getDb(), user.id);
  if (!provider) redirect("/onboarding");
  return provider;
}
