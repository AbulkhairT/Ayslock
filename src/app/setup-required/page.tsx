import { configProblems } from "@/lib/env";
import { getT } from "@/i18n/server";
import { Logo } from "@/components/Logo";

export const dynamic = "force-dynamic";

export async function generateMetadata() {
  return { title: (await getT()).common.setup.title, robots: { index: false } };
}

/** Shown instead of the site when a hosted deployment is missing settings. Names only, never values. */
export default async function SetupRequired() {
  const t = (await getT()).common.setup;
  return (
    <main id="main" className="mx-auto max-w-xl px-4 pb-16 sm:px-6">
      <header className="py-2"><Logo /></header>
      <h1 className="mt-10 text-[28px] font-semibold leading-tight tracking-tight">{t.title}</h1>
      <p className="mt-3 text-muted">{t.body}</p>
      {configProblems.length > 0 && (
        <>
          <h2 className="mt-8 text-[13px] font-semibold uppercase tracking-wide text-muted">{t.missing}</h2>
          <ul className="mt-2 divide-y divide-line border-y border-line font-mono text-[15px]">
            {configProblems.map((n) => <li key={n} className="py-3 break-words">{n}</li>)}
          </ul>
        </>
      )}
      <ol className="mt-8 list-decimal space-y-2 pl-5 text-[15px]">
        <li>{t.step1}</li>
        <li>{t.step2}</li>
        <li>{t.step3}</li>
      </ol>
      <p className="mt-6 text-[15px] text-muted">{t.demo}</p>
    </main>
  );
}
