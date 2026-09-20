import Image from 'next/image';
import { Outfit } from 'next/font/google';

const outfit = Outfit({ subsets: ['latin'] });

export default function JerseySection() {
  return (
    <section
      className="mx-auto mt-28 w-full max-w-5xl px-2"
      aria-labelledby="jersey-heading"
    >
      <div className="mx-auto max-w-xl text-center">
        <h2
          id="jersey-heading"
          className={`${outfit.className} text-3xl font-semibold tracking-tight text-gray-900 drop-shadow-sm dark:text-gray-100 sm:text-4xl`}
        >
          Vores holdsæt
        </h2>
        <p
          className={`${outfit.className} mb-3 mt-2 text-xs font-semibold tracking-[0.28em] text-amber-700/70 dark:text-amber-200/70`}
        >
          Sæson 26/27
        </p>
      </div>

      <p className="mt-5 mb-1 flex items-center justify-center gap-1.5 text-[11px] tracking-wide text-gray-400 dark:text-gray-500">
        <span>Leveret af Nordic Basketball.</span>
      </p>

      <div className="relative mx-auto w-full max-w-xl">
        <Image
          src="/3d-jerseys.png"
          alt="DIKU Dunkers holdsæt — hvid hjemmetrøje og blå udebane-trøje"
          width={2400}
          height={2400}
          sizes="(min-width: 576px) 576px, 100vw"
          className="mx-auto h-auto w-full select-none"
          priority={false}
        />

        <div
          className={`${outfit.className} -mt-2 grid grid-cols-2 gap-2 px-[6%] sm:-mt-3 sm:px-[8%]`}
        >
          <p className="flex flex-col items-center gap-1.5 text-center">
            <span className="text-[11px] font-bold uppercase tracking-[0.35em] text-slate-700 dark:text-slate-200 sm:text-xs">
              HJEM
            </span>
            <span
              className="h-px w-8 bg-gradient-to-r from-transparent via-slate-400/70 to-transparent dark:via-slate-500/70"
              aria-hidden
            />
          </p>
          <p className="flex flex-col items-center gap-1.5 text-center">
            <span className="text-[11px] font-bold uppercase tracking-[0.35em] text-amber-700/90 dark:text-amber-300/90 sm:text-xs">
              UDE
            </span>
            <span
              className="h-px w-8 bg-gradient-to-r from-transparent via-amber-500/70 to-transparent dark:via-amber-400/60"
              aria-hidden
            />
          </p>
        </div>
      </div>
    </section>
  );
}
