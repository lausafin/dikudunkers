import Link from 'next/link';
import { Outfit } from 'next/font/google';
import NewSeasonBanner from '@/components/NewSeasonBanner';

const outfit = Outfit({ subsets: ['latin'] });

export type WelcomeDetails = {
  firstName?: string;
  membershipType?: string;
};

function isKamphold(membershipType?: string) {
  return (membershipType ?? '').toLowerCase().includes('kamp');
}

function WelcomeHoop() {
  return (
    <div className="relative mx-auto h-40 w-44" aria-hidden>
      <svg viewBox="0 0 176 160" className="h-full w-full text-gray-700 dark:text-white/80">
        <rect
          x="48"
          y="10"
          width="80"
          height="46"
          rx="5"
          fill="rgba(255,255,255,0.55)"
          className="dark:fill-white/10"
          stroke="currentColor"
          strokeWidth="2"
        />
        <rect
          x="66"
          y="22"
          width="44"
          height="26"
          rx="2"
          fill="none"
          stroke="currentColor"
          strokeWidth="2"
        />
        <ellipse cx="88" cy="58" rx="24" ry="7" fill="none" stroke="#ea580c" strokeWidth="5" />
        <path
          d="M66 60c2 10 6 22 10 28M88 62v30M110 60c-2 10-6 22-10 28M72 62c4 12 8 22 16 26M104 62c-4 12-8 22-16 26"
          fill="none"
          stroke="currentColor"
          strokeOpacity="0.45"
          strokeWidth="1.6"
          strokeLinecap="round"
        />
      </svg>
      <div className="welcome-ball pointer-events-none absolute left-1/2 top-[4.15rem] -ml-[18px]">
        <svg viewBox="0 0 24 24" className="h-9 w-9 drop-shadow-md">
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
      </div>
    </div>
  );
}

export default function WelcomeSuccess({ firstName, membershipType }: WelcomeDetails) {
  const kamphold = isKamphold(membershipType);
  const heading = firstName ? `Velkommen, ${firstName}!` : 'Velkommen til holdet!';

  return (
    <div className="welcome-card w-full max-w-md" role="status" aria-live="polite">
      <div className="overflow-hidden rounded-2xl border border-white/50 bg-white/60 shadow-[0_8px_32px_rgba(0,0,0,0.06)] backdrop-blur-xl dark:border-white/10 dark:bg-gray-900/60 dark:shadow-[0_8px_32px_rgba(0,0,0,0.2)]">
        <NewSeasonBanner accent={kamphold ? 'orange' : 'emerald'} label="VELKOMMEN" />

        <div className="px-8 pb-8 pt-6 text-center">
          <WelcomeHoop />

          <h1 className={`${outfit.className} mt-2 text-3xl font-extrabold tracking-tight text-gray-900 dark:text-white`}>
            {heading}
          </h1>
          <p className={`${outfit.className} mt-1 text-sm font-semibold uppercase tracking-[0.22em] text-gray-500 dark:text-gray-400`}>
            DIKU Dunkers
          </p>

          {membershipType ? (
            <p className="mt-4">
              <span
                className={`inline-flex items-center rounded-full border px-3 py-1 text-xs font-semibold ${
                  kamphold
                    ? 'border-orange-200/50 bg-orange-100/80 text-orange-900 dark:border-orange-500/30 dark:bg-orange-500/20 dark:text-orange-200'
                    : 'border-emerald-200/50 bg-emerald-100/80 text-emerald-900 dark:border-emerald-500/30 dark:bg-emerald-500/20 dark:text-emerald-200'
                }`}
              >
                {membershipType}
              </span>
            </p>
          ) : null}

          <p className="mt-5 text-gray-700 dark:text-gray-300">
            Dit medlemskab er nu aktivt og bekræftet.
          </p>
          <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">
            Du kan se og administrere din aftale i din MobilePay-app.
          </p>

          <Link
            href="/"
            className="mt-7 inline-flex items-center justify-center rounded-full border border-white/60 bg-white/70 px-5 py-2.5 text-sm font-semibold text-gray-900 shadow-sm transition-colors hover:bg-white dark:border-white/10 dark:bg-white/10 dark:text-white dark:hover:bg-white/15"
          >
            Til forsiden
          </Link>
        </div>
      </div>
    </div>
  );
}
