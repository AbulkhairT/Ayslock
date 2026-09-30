/* eslint-disable @next/next/no-img-element -- avatars are arbitrary provider URLs */
export function Avatar({ name, url, size = 80 }: { name: string; url?: string | null; size?: number }) {
  const initials = name
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((w) => w[0]?.toUpperCase())
    .join("");
  if (url) {
    return <img src={url} alt="" width={size} height={size} className="shrink-0 rounded-full object-cover" style={{ width: size, height: size }} />;
  }
  return (
    <span aria-hidden className="grid shrink-0 place-items-center rounded-full bg-accent-soft font-bold text-accent" style={{ width: size, height: size, fontSize: size * 0.36 }}>
      {initials}
    </span>
  );
}
