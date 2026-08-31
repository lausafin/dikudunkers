import { Outfit } from 'next/font/google';
import type { MembershipCounts } from '@/lib/memberships';

const outfit = Outfit({ subsets: ['latin'] });

const rows: {
  type: keyof MembershipCounts;
  number: string;
  label: string;
}[] = [
  {
    type: 'Træning',
    number: 'text-emerald-700 dark:text-emerald-300',
    label: 'text-emerald-800/70 dark:text-emerald-200/70',
  },
  {
    type: 'Kamphold',
    number: 'text-orange-700 dark:text-orange-300',
    label: 'text-orange-800/70 dark:text-orange-200/70',
  },
  {
    type: 'Træner',
    number: 'text-amber-700 dark:text-amber-300',
    label: 'text-amber-800/70 dark:text-amber-200/70',
  },
];

function gridColsClass(columnCount: number) {
  if (columnCount === 1) return 'grid-cols-1';
  if (columnCount === 2) return 'grid-cols-2';
  return 'grid-cols-3';
}

export default function MemberCountStat({ counts }: { counts: MembershipCounts }) {
  const hasAnyMembers = Object.values(counts).some((count) => count > 0);
  const visible = hasAnyMembers ? rows.filter((row) => counts[row.type] > 0) : rows;

  return (
    <div className={`grid ${gridColsClass(visible.length)} divide-x divide-gray-200/50 border-b border-gray-200/50 dark:divide-white/10 dark:border-white/10`}>
      {visible.map((row) => (
        <div key={row.type} className="px-3 py-4 text-center">
          <p className={`${outfit.className} text-3xl font-extrabold leading-none tracking-tight ${row.number}`}>
            {counts[row.type]}
          </p>
          <p className={`mt-1 text-[11px] font-semibold uppercase tracking-[0.14em] ${row.label}`}>
            {row.type}
          </p>
        </div>
      ))}
    </div>
  );
}
