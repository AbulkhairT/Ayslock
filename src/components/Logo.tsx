import Link from "next/link";

export function Logo({ size = "md" }: { size?: "md" | "lg" }) {
  return (
    <Link href="/" className={`inline-flex items-center gap-2 font-bold tracking-tight ${size === "lg" ? "text-3xl" : "text-lg"}`} aria-label="Ayslock home">
      <span aria-hidden className={`grid place-items-center rounded-xl bg-accent text-white ${size === "lg" ? "h-10 w-10 text-2xl" : "h-8 w-8 text-lg"}`}>
        @
      </span>
      Ayslock
    </Link>
  );
}
