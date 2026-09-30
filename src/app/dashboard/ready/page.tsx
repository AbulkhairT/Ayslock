import QRCode from "qrcode";
import Link from "next/link";
import { env } from "@/lib/env";
import { requireProvider } from "@/lib/session";
import { btn } from "@/components/ui";
import { CopyButton } from "@/components/CopyButton";

export const metadata = { title: "Your Ayslock is ready" };

export default async function Ready() {
  const provider = await requireProvider();
  const link = `${env.appUrl}/u/${provider.username}`;
  const qr = await QRCode.toDataURL(link, { margin: 1, width: 480, color: { dark: "#1c1b22", light: "#ffffff" } });
  return (
    <div className="mx-auto max-w-md text-center">
      <p className="text-5xl" aria-hidden>🎉</p>
      <h1 className="mt-3 text-[28px] font-semibold leading-tight tracking-tight">Your Ayslock is ready.</h1>
      <p className="mt-2 text-muted">Share it: &ldquo;Here&apos;s my Ayslock: @{provider.username}.&rdquo;</p>
      <div className="mt-6 rounded-2xl border border-line bg-white p-5">
        <p className="break-all text-lg font-semibold text-accent">{link}</p>
        <CopyButton text={link} className={`${btn} mt-4 w-full`} />
        {/* eslint-disable-next-line @next/next/no-img-element -- inline data URL */}
        <img src={qr} alt={`QR code for ${link}`} width={240} height={240} className="mx-auto mt-6 h-60 w-60" />
        <a href={qr} download={`ayslock-${provider.username}-qr.png`} className="mt-2 inline-block min-h-11 py-2.5 text-sm font-semibold text-accent">
          Download QR code
        </a>
      </div>
      <Link href="/dashboard" className="mt-6 inline-block min-h-11 py-2.5 font-semibold text-muted hover:text-ink">Go to my schedule →</Link>
    </div>
  );
}
