export function Notice({ tone = "info", children, role }: { tone?: "info" | "ok" | "warn" | "bad"; children: React.ReactNode; role?: string }) {
  const cls = {
    info: "bg-accent-soft text-accent-strong",
    ok: "bg-ok-soft text-ok",
    warn: "bg-warn-soft text-warn",
    bad: "bg-bad-soft text-bad",
  }[tone];
  return (
    <div role={role ?? (tone === "bad" ? "alert" : "status")} className={`rounded-2xl px-4 py-3 text-sm font-medium ${cls}`}>
      {children}
    </div>
  );
}
