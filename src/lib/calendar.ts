export const GOOGLE_CALENDAR_EMAIL = 'lau@dikudunkers.dk';
export const GOOGLE_CALENDAR_ICS_URL = `https://calendar.google.com/calendar/ical/${encodeURIComponent(GOOGLE_CALENDAR_EMAIL)}/public/basic.ics`;
export const GOOGLE_CALENDAR_EMBED_SRC = Buffer.from(GOOGLE_CALENDAR_EMAIL).toString('base64');
export const GOOGLE_CALENDAR_PUBLIC_URL = `https://calendar.google.com/calendar/embed?src=${GOOGLE_CALENDAR_EMBED_SRC}&ctz=Europe%2FCopenhagen&hl=da`;
export const MAX_UPCOMING_EVENTS = 4;

const COPENHAGEN = 'Europe/Copenhagen';

export type CalendarEvent = {
  startsAt: string;
  daysUntil: number;
  whenLabel: string;
  title: string;
  location?: string;
};

export type NextTraining = Omit<CalendarEvent, 'title'>;

type ParsedEvent = {
  start: Date;
  end: Date;
  title: string;
  location?: string;
};

function unfoldIcs(ics: string): string[] {
  const lines: string[] = [];
  for (const raw of ics.split(/\r?\n/)) {
    if ((raw.startsWith(' ') || raw.startsWith('\t')) && lines.length > 0) {
      lines[lines.length - 1] += raw.slice(1);
    } else {
      lines.push(raw);
    }
  }
  return lines;
}

function unescapeIcs(value: string): string {
  return value
    .replace(/\\n/gi, ' ')
    .replace(/\\,/g, ',')
    .replace(/\\;/g, ';')
    .replace(/\\\\/g, '\\')
    .trim();
}

function parseIcsDateTime(lineValue: string): Date | null {
  const match = lineValue.match(/(\d{8})T(\d{6})(Z)?$/);
  if (match) {
    const iso = `${match[1].slice(0, 4)}-${match[1].slice(4, 6)}-${match[1].slice(6, 8)}T${match[2].slice(0, 2)}:${match[2].slice(2, 4)}:${match[2].slice(4, 6)}${match[3] ?? 'Z'}`;
    const date = new Date(iso);
    return Number.isNaN(date.getTime()) ? null : date;
  }

  const dateOnly = lineValue.match(/(\d{8})$/);
  if (!dateOnly) return null;
  const iso = `${dateOnly[1].slice(0, 4)}-${dateOnly[1].slice(4, 6)}-${dateOnly[1].slice(6, 8)}T00:00:00Z`;
  const date = new Date(iso);
  return Number.isNaN(date.getTime()) ? null : date;
}

function calendarDaysUntil(target: Date, now: Date): number {
  const fmt = new Intl.DateTimeFormat('en-CA', {
    timeZone: COPENHAGEN,
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  });
  const [ty, tm, td] = fmt.format(now).split('-').map(Number);
  const [yy, ym, yd] = fmt.format(target).split('-').map(Number);
  return Math.round((Date.UTC(yy, ym - 1, yd) - Date.UTC(ty, tm - 1, td)) / 86_400_000);
}

function formatWhenLabel(startsAt: Date): string {
  const datePart = startsAt.toLocaleDateString('da-DK', {
    weekday: 'long',
    day: 'numeric',
    month: 'short',
    timeZone: COPENHAGEN,
  });
  const timePart = startsAt.toLocaleTimeString('da-DK', {
    hour: '2-digit',
    minute: '2-digit',
    timeZone: COPENHAGEN,
  });
  return `${datePart} · ${timePart}`;
}

async function loadCalendarEvents(): Promise<ParsedEvent[]> {
  const response = await fetch(GOOGLE_CALENDAR_ICS_URL, {
    next: { revalidate: 300 },
    signal: AbortSignal.timeout(4000),
  });
  if (!response.ok) return [];

  const events: ParsedEvent[] = [];
  let current: Partial<ParsedEvent> | null = null;

  for (const line of unfoldIcs(await response.text())) {
    if (line === 'BEGIN:VEVENT') {
      current = {};
      continue;
    }
    if (line === 'END:VEVENT') {
      if (current?.start) {
        events.push({
          start: current.start,
          end: current.end ?? new Date(current.start.getTime() + 2 * 60 * 60 * 1000),
          title: current.title || 'Træning',
          location: current.location,
        });
      }
      current = null;
      continue;
    }
    if (!current) continue;

    const split = line.indexOf(':');
    if (split === -1) continue;
    const key = line.slice(0, split).split(';')[0];
    const value = line.slice(split + 1);

    if (key === 'DTSTART') {
      const start = parseIcsDateTime(value);
      if (start) current.start = start;
    } else if (key === 'DTEND') {
      const end = parseIcsDateTime(value);
      if (end) current.end = end;
    } else if (key === 'SUMMARY' && value) {
      current.title = unescapeIcs(value);
    } else if (key === 'LOCATION' && value) {
      current.location = unescapeIcs(value);
    }
  }

  return events;
}

function toCalendarEvent(event: ParsedEvent, now: Date): CalendarEvent {
  return {
    startsAt: event.start.toISOString(),
    daysUntil: Math.max(0, calendarDaysUntil(event.start, now)),
    whenLabel: formatWhenLabel(event.start),
    title: event.title,
    location: event.location,
  };
}

export async function getUpcomingEvents(limit = MAX_UPCOMING_EVENTS): Promise<CalendarEvent[]> {
  try {
    const now = new Date();
    return (await loadCalendarEvents())
      .filter((event) => event.end.getTime() >= now.getTime())
      .sort((a, b) => a.start.getTime() - b.start.getTime())
      .slice(0, limit)
      .map((event) => toCalendarEvent(event, now));
  } catch (error) {
    console.error('Fejl ved hentning af kalender:', error);
    return [];
  }
}

export async function getNextTraining(): Promise<NextTraining | null> {
  const [next] = await getUpcomingEvents(1);
  return next ?? null;
}
