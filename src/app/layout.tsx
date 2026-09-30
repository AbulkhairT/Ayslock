import type { Metadata, Viewport } from "next";
import { I18nProvider } from "@/i18n/client";
import { getLocale, getT } from "@/i18n/server";
import { DemoBanner } from "@/components/DemoBanner";
import "./globals.css";

export async function generateMetadata(): Promise<Metadata> {
  const t = await getT();
  return { title: "Ayslock", description: t.common.tagline };
}

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  themeColor: "#ffffff",
};

export default async function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  const locale = await getLocale();
  const t = await getT();
  return (
    <html lang={locale}>
      <body className="min-h-dvh">
        <a href="#main" className="sr-only focus:not-sr-only focus:fixed focus:left-4 focus:top-4 focus:z-50 focus:rounded-xl focus:bg-white focus:px-4 focus:py-2">
          {t.common.skipToContent}
        </a>
        <I18nProvider locale={locale}>
          <DemoBanner />
          {children}
        </I18nProvider>
      </body>
    </html>
  );
}
