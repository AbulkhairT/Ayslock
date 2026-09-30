import Link from "next/link";

export function Logo({ size = "md" }: { size?: "md" | "lg" }) {
  return (
    <Link href="/" className={`inline-flex min-h-11 items-center font-semibold tracking-tight ${size === "lg" ? "text-3xl" : "text-xl"}`} aria-label="Ayslock home">
      <span aria-hidden className="text-accent">@</span>
      <span aria-hidden>ayslock</span>
    </Link>
  );
}
