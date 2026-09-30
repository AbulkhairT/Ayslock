"use client";

import { useState } from "react";
import { useT } from "@/i18n/client";

export function CopyButton({ text, className, label }: { text: string; className?: string; label?: string }) {
  const t = useT().common;
  const [done, setDone] = useState(false);
  return (
    <button
      type="button"
      className={className}
      onClick={async () => {
        try {
          await navigator.clipboard.writeText(text);
          setDone(true);
          setTimeout(() => setDone(false), 2000);
        } catch {
          window.prompt(t.copyPrompt, text);
        }
      }}
    >
      <span aria-live="polite">{done ? t.copied : label ?? t.copyLink}</span>
    </button>
  );
}
