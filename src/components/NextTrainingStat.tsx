import { Outfit } from 'next/font/google';
import type { NextTraining } from '@/lib/calendar';

const outfit = Outfit({ subsets: ['latin'] });

function daysCopy(daysUntil: number) {
  if (daysUntil === 0) return { value: 'I dag', unit: null };
  if (daysUntil === 1) return { value: 'I morgen', unit: null };
  return { value: String(daysUntil), unit: 'dage' };
}

export default function NextTrainingStat({ training }: { training: NextTraining | null }) {
  if (!training) return null;

  const days = daysCopy(training.daysUntil);

  return (
    <div className="flex items-center gap-5 border-b border-gray-200/50 px-6 py-4 dark:border-white/10">
      <div className="min-w-[4.5rem] text-center">
        <p className={`${outfit.className} text-3xl font-extrabold leading-none tracking-tight text-gray-900 dark:text-white`}>
          {days.value}
        </p>
        {days.unit ? (
          <p className="mt-1 text-[11px] font-semibold uppercase tracking-[0.18em] text-gray-500 dark:text-gray-400">
            {days.unit}
          </p>
        ) : null}
      </div>
      <div className="min-w-0">
        <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-gray-500 dark:text-gray-400">
          Næste træning
        </p>
        <p className="mt-0.5 font-medium capitalize text-gray-900 dark:text-gray-100">
          {training.whenLabel}
        </p>
        {training.location ? (
          <p className="truncate text-sm text-gray-500 dark:text-gray-400">{training.location}</p>
        ) : null}
      </div>
    </div>
  );
}
