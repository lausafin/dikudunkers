import { Outfit } from 'next/font/google';
import { GOOGLE_CALENDAR_PUBLIC_URL, type CalendarEvent } from '@/lib/calendar';

const outfit = Outfit({ subsets: ['latin'] });

export default function CalendarEvents({ events }: { events: CalendarEvent[] }) {
  if (events.length === 0) {
    return (
      <p className="p-12 text-center text-lg font-medium text-gray-600 dark:text-gray-400">
        Ingen kommende træninger i kalenderen.
      </p>
    );
  }

  return (
    <div>
      <ul className="divide-y divide-gray-200/50 dark:divide-gray-700/50">
        {events.map((event) => (
          <li key={event.startsAt} className="px-6 py-5">
            <p className={`${outfit.className} font-medium capitalize tracking-wide text-gray-900 dark:text-gray-100`}>
              {event.whenLabel}
            </p>
            <p className="mt-0.5 text-sm text-gray-700 dark:text-gray-300">{event.title}</p>
            {event.location ? (
              <p className="mt-0.5 truncate text-sm text-gray-500 dark:text-gray-400">{event.location}</p>
            ) : null}
          </li>
        ))}
      </ul>
      <a
        href={GOOGLE_CALENDAR_PUBLIC_URL}
        target="_blank"
        rel="noopener noreferrer"
        className="block border-t border-gray-200/50 px-6 py-3 text-center text-sm font-medium text-gray-500 transition-colors hover:bg-white/40 hover:text-gray-800 dark:border-white/10 dark:text-gray-400 dark:hover:bg-white/5 dark:hover:text-gray-200"
      >
        Se hele kalenderen
      </a>
    </div>
  );
}
