import { Outfit } from 'next/font/google';

const outfit = Outfit({ subsets: ['latin'] });

type Accent = 'emerald' | 'orange' | 'yellow';

const accents: Record<
  Accent,
  {
    gradient: string;
    glow: string;
  }
> = {
  emerald: {
    gradient:
      'from-emerald-600 via-emerald-500 to-teal-500 dark:from-emerald-500 dark:via-emerald-600 dark:to-teal-600',
    glow: 'bg-emerald-200/50',
  },
  orange: {
    gradient:
      'from-orange-600 via-orange-500 to-amber-500 dark:from-orange-500 dark:via-orange-600 dark:to-amber-600',
    glow: 'bg-amber-200/50',
  },
  yellow: {
    gradient:
      'from-yellow-500 via-amber-400 to-yellow-500 dark:from-yellow-500 dark:via-amber-500 dark:to-yellow-600',
    glow: 'bg-yellow-200/50',
  },
};

function BasketballMark() {
  return (
    <svg viewBox="0 0 24 24" className="relative h-6 w-6 drop-shadow-sm" aria-hidden>
      <circle cx="12" cy="12" r="10" fill="#F4E4C1" />
      <circle cx="12" cy="12" r="10" fill="none" stroke="rgba(60,32,12,0.55)" strokeWidth="1.5" />
      <path
        d="M12 2v20M2 12h20M4.15 6.15c3.7 2.7 12 2.7 15.7 0M4.15 17.85c3.7-2.7 12-2.7 15.7 0"
        fill="none"
        stroke="rgba(60,32,12,0.55)"
        strokeWidth="1.35"
        strokeLinecap="round"
      />
    </svg>
  );
}

export default function NewSeasonBanner({
  accent,
  label = 'NY SÆSON',
}: {
  accent: Accent;
  label?: string;
}) {
  const tone = accents[accent];

  return (
    <div
      className={`relative isolate overflow-hidden bg-gradient-to-r text-white ${tone.gradient}`}
    >
      <div className={`pointer-events-none absolute -left-6 top-1/2 h-20 w-20 -translate-y-1/2 rounded-full blur-2xl ${tone.glow}`} />
      <div className="new-season-shimmer" aria-hidden />

      <svg
        className="pointer-events-none absolute inset-0 h-full w-full text-white/20"
        viewBox="0 0 400 56"
        preserveAspectRatio="xMidYMid slice"
        aria-hidden
      >
        <line x1="0" y1="28" x2="400" y2="28" stroke="currentColor" strokeWidth="1" strokeDasharray="5 7" />
        <line x1="200" y1="0" x2="200" y2="56" stroke="currentColor" strokeWidth="1" />
        <circle cx="200" cy="28" r="18" fill="none" stroke="currentColor" strokeWidth="1.25" />
      </svg>

      <div className="relative flex items-center gap-3 px-5 py-3">
        <div className="relative flex h-9 w-9 shrink-0 items-center justify-center">
          <span className="absolute inset-0 rounded-full bg-white/35 blur-[6px]" aria-hidden />
          <BasketballMark />
        </div>

        <p
          className={`${outfit.className} min-w-0 flex-1 text-[13px] font-extrabold tracking-[0.28em] drop-shadow-sm`}
        >
          {label}
        </p>

        <span className="rounded-full border border-white/25 bg-white/15 px-2.5 py-0.5 text-[10px] font-semibold tracking-[0.18em] text-white/95">
          26/27
        </span>
      </div>
    </div>
  );
}
