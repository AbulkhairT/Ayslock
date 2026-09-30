// Decorative product preview built from markup, so there are no image assets to maintain.
const TIMES = ["9:00", "9:30", "10:30", "11:00", "1:30", "2:00"];

export function PhoneMockup() {
  return (
    <div aria-hidden className="relative mx-auto w-full max-w-[340px]">
      <div className="absolute -inset-6 -z-10 rounded-[3rem] bg-gradient-to-br from-accent/30 via-fuchsia-300/30 to-amber-200/40 blur-2xl" />
      <div className="rounded-[2.5rem] border-[10px] border-ink bg-white p-4 shadow-2xl">
        <div className="mx-auto mb-4 h-1.5 w-16 rounded-full bg-line" />
        <div className="flex items-center gap-3">
          <span className="grid h-12 w-12 place-items-center rounded-full bg-accent-soft text-lg font-bold text-accent">MB</span>
          <div>
            <p className="font-bold leading-tight">Marco Bellini</p>
            <p className="text-sm font-semibold text-accent">@marco</p>
          </div>
        </div>
        <div className="mt-4 rounded-2xl bg-canvas px-3 py-2 text-sm"><strong>Haircut</strong> · 30 min · $35</div>
        <div className="mt-3 grid grid-cols-5 gap-1 text-center">
          {["Tue 6", "Wed 7", "Thu 8", "Fri 9", "Sat 10"].map((d, i) => (
            <div key={d} className={`rounded-xl py-2 text-[11px] font-bold leading-tight ${i === 1 ? "bg-accent text-white" : "border border-line"}`}>
              {d.split(" ")[0]}<br /><span className="text-sm">{d.split(" ")[1]}</span>
            </div>
          ))}
        </div>
        <div className="mt-3 grid grid-cols-3 gap-1.5">
          {TIMES.map((t, i) => (
            <div key={t} className={`rounded-xl py-2 text-center text-sm font-semibold ${i === 2 ? "bg-accent text-white" : "border border-line"}`}>{t}</div>
          ))}
        </div>
        <div className="mt-4 rounded-full bg-ink py-3 text-center text-sm font-semibold text-white">Confirm booking</div>
      </div>
      <div className="absolute -right-16 -top-6 hidden rounded-2xl bg-white px-4 py-3 text-sm shadow-xl ring-1 ring-line sm:block">
        <p className="font-bold text-ok">✓ You&apos;re booked</p>
        <p className="text-muted">Wed, Oct 7 · 10:30 AM</p>
      </div>
      <div className="absolute -left-16 -bottom-6 hidden rounded-2xl bg-white px-4 py-3 text-sm shadow-xl ring-1 ring-line sm:block">
        <p className="font-bold">⏰ Reminder sent</p>
        <p className="text-muted">24 hours before</p>
      </div>
    </div>
  );
}
