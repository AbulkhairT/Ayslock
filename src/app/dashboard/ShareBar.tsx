"use client";

import { useEffect, useState } from "react";
import { CopyButton } from "@/components/CopyButton";
import { btnSmall, btnSmallAccent } from "@/components/ui";
import { useT } from "@/i18n/client";

/** The provider's booking link, ready to paste into WhatsApp or anywhere else. */
export function ShareBar({ link, username, name }: { link: string; username: string; name: string }) {
  const dict = useT();
  const t = dict.dashboard.share;
  const [canShare, setCanShare] = useState(false);
  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect -- the Share sheet only exists in some browsers
    setCanShare(typeof navigator !== "undefined" && typeof navigator.share === "function");
  }, []);
  const shown = link.replace(/^https?:\/\//, "");
  return (
    <section aria-label={t.label} className="flex flex-col gap-2 border-b border-line py-3 sm:flex-row sm:items-center sm:gap-4">
      <div className="min-w-0 sm:flex-1">
        <p className="text-sm text-muted">{t.label}</p>
        <a href={link} target="_blank" rel="noreferrer" className="block truncate font-semibold text-accent hover:underline">{shown}</a>
      </div>
      <div className="flex flex-wrap gap-2">
        <CopyButton text={link} className={btnSmallAccent} label={dict.common.copyLink} />
        <CopyButton text={`@${username}`} className={btnSmall} label={t.copyHandle(username.length > 14 ? null : username)} />
        {canShare && (
          <button type="button" className={btnSmall} onClick={() => navigator.share({ title: t.shareTitle(name), text: t.shareText(link) }).catch(() => {})}>
            {t.share}
          </button>
        )}
      </div>
    </section>
  );
}
