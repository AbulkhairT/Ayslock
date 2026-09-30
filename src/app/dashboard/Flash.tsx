import { Notice } from "@/components/Notice";

export function Flash({ sp }: { sp: Record<string, string | string[] | undefined> }) {
  if (typeof sp.err === "string") return <div className="mb-4"><Notice tone="bad">{sp.err}</Notice></div>;
  if (typeof sp.ok === "string") return <div className="mb-4"><Notice tone="ok">{sp.ok}</Notice></div>;
  return null;
}
