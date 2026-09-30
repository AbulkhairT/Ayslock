import QRCode from "qrcode";
import Link from "next/link";
import { env } from "@/lib/env";
import { requireProvider } from "@/lib/session";
import { btn, btnSecondary } from "@/components/ui";
import { CopyButton } from "@/components/CopyButton";
import { getT } from "@/i18n/server";

export async function generateMetadata() {
  return { title: (await getT()).dashboard.ready.metaTitle };
}

export default async function Ready() {
  const provider = await requireProvider();
  const link = `${env.appUrl}/@${provider.username}`;
  const t = (await getT()).dashboard.ready;
  const qr = await QRCode.toDataURL(link, { margin: 1, width: 480, color: { dark: "#1c1b22", light: "#ffffff" } });
  return (
    <div className="mx-auto max-w-md text-center">
      <h1 className=" text-[28px] font-semibold leading-tight tracking-tight">{t.title}</h1>
      <p className="mt-2 text-muted">{t.lead}</p>
      <div className="mt-6 rounded-2xl border border-line bg-white p-5">
        <p className="break-all text-lg font-semibold text-accent">{link}</p>
        <CopyButton text={link} className={`${btn} mt-4 w-full`} />
        <CopyButton text={`@${provider.username}`} className={`${btnSecondary} mt-2 w-full`} label={t.copyHandle(provider.username)} />
        {/* eslint-disable-next-line @next/next/no-img-element -- inline data URL */}
        <img src={qr} alt={t.qrAlt(link)} width={240} height={240} className="mx-auto mt-6 h-60 w-60" />
        <a href={qr} download={`ayslock-${provider.username}-qr.png`} className="mt-2 inline-block min-h-11 py-2.5 text-sm font-semibold text-accent">
          {t.downloadQr}
        </a>
      </div>
      <Link href="/dashboard" className="mt-6 inline-block min-h-11 py-2.5 font-semibold text-muted hover:text-ink">{t.toSchedule}</Link>
    </div>
  );
}
