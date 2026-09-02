export const GOOGLE_CALENDAR_EMAIL = 'lau@dikudunkers.dk';
export const GOOGLE_CALENDAR_ICS_URL = `https://calendar.google.com/calendar/ical/${encodeURIComponent(GOOGLE_CALENDAR_EMAIL)}/public/basic.ics`;
export const GOOGLE_CALENDAR_EMBED_SRC = Buffer.from(GOOGLE_CALENDAR_EMAIL).toString('base64');
export const GOOGLE_CALENDAR_PUBLIC_URL = `https://calendar.google.com/calendar/embed?src=${GOOGLE_CALENDAR_EMBED_SRC}&ctz=Europe%2FCopenhagen&hl=da`;
export const MAX_UPCOMING_EVENTS = 4;

const COPENHAGEN = 'Europe/Copenhagen';
const WEEKDAY_CODES = ['SU', 'MO', 'TU', 'WE', 'TH', 'FR', 'SA'] as const;
const ICS_WEEKDAY: Record<string, (typeof WEEKDAY_CODES)[number]> = {
  Sun: 'SU',
  Mon: 'MO',
  Tue: 'TU',
  Wed: 'WE',
  Thu: 'TH',
  Fri: 'FR',
  Sat: 'SA',
};

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
  rrule?: string;
  exdates: Date[];
};

type RecurrenceRule = {
  freq: string;
  interval: number;
  until?: Date;
  count?: number;
  byday: string[];
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

function parseProperty(line: string): { name: string; params: Record<string, string>; value: string } | null {
  const split = line.indexOf(':');
  if (split === -1) return null;
  const [name, ...paramParts] = line.slice(0, split).split(';');
  const params: Record<string, string> = {};
  for (const part of paramParts) {
    const eq = part.indexOf('=');
    if (eq === -1) continue;
    params[part.slice(0, eq).toUpperCase()] = part.slice(eq + 1);
  }
  return { name: name.toUpperCase(), params, value: line.slice(split + 1) };
}

function zonedLocalToDate(year: number, month: number, day: number, hour: number, minute: number, second: number, timeZone: string): Date {
  const wanted = Date.UTC(year, month - 1, day, hour, minute, second);
  const formatter = new Intl.DateTimeFormat('en-CA', {
    timeZone,
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
    hourCycle: 'h23',
  });

  const asUtcMs = (ms: number) => {
    const parts = Object.fromEntries(formatter.formatToParts(new Date(ms)).map((part) => [part.type, part.value]));
    return Date.UTC(
      Number(parts.year),
      Number(parts.month) - 1,
      Number(parts.day),
      Number(parts.hour),
      Number(parts.minute),
      Number(parts.second),
    );
  };

  let instant = wanted;
  instant += wanted - asUtcMs(instant);
  instant += wanted - asUtcMs(instant);
  return new Date(instant);
}

function parseIcsDateTime(lineValue: string, tzid = COPENHAGEN): Date | null {
  const match = lineValue.match(/(\d{8})T(\d{6})(Z)?$/);
  if (match) {
    const year = Number(match[1].slice(0, 4));
    const month = Number(match[1].slice(4, 6));
    const day = Number(match[1].slice(6, 8));
    const hour = Number(match[2].slice(0, 2));
    const minute = Number(match[2].slice(2, 4));
    const second = Number(match[2].slice(4, 6));
    if (match[3] === 'Z') {
      const date = new Date(Date.UTC(year, month - 1, day, hour, minute, second));
      return Number.isNaN(date.getTime()) ? null : date;
    }
    return zonedLocalToDate(year, month, day, hour, minute, second, tzid);
  }

  const dateOnly = lineValue.match(/(\d{8})$/);
  if (!dateOnly) return null;
  return zonedLocalToDate(
    Number(dateOnly[1].slice(0, 4)),
    Number(dateOnly[1].slice(4, 6)),
    Number(dateOnly[1].slice(6, 8)),
    0,
    0,
    0,
    tzid,
  );
}

function parseDateList(value: string, tzid?: string): Date[] {
  return value
    .split(',')
    .map((part) => parseIcsDateTime(part.trim(), tzid))
    .filter((date): date is Date => Boolean(date));
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

function copenhagenWeekday(date: Date): string {
  const weekday = date.toLocaleDateString('en-US', { weekday: 'short', timeZone: COPENHAGEN });
  return ICS_WEEKDAY[weekday] ?? 'SU';
}

function parseRrule(rrule: string): RecurrenceRule | null {
  const parts: Record<string, string> = {};
  for (const piece of rrule.split(';')) {
    const eq = piece.indexOf('=');
    if (eq === -1) continue;
    parts[piece.slice(0, eq).toUpperCase()] = piece.slice(eq + 1);
  }
  if (!parts.FREQ) return null;
  return {
    freq: parts.FREQ.toUpperCase(),
    interval: Math.max(1, Number(parts.INTERVAL || 1) || 1),
    until: parts.UNTIL ? parseIcsDateTime(parts.UNTIL) ?? undefined : undefined,
    count: parts.COUNT ? Number(parts.COUNT) : undefined,
    byday: parts.BYDAY ? parts.BYDAY.split(',').map((day) => day.slice(-2).toUpperCase()) : [],
  };
}

function expandEvent(event: ParsedEvent): ParsedEvent[] {
  if (!event.rrule) return [event];
  const rule = parseRrule(event.rrule);
  if (!rule || rule.freq !== 'WEEKLY') return [event];

  const duration = event.end.getTime() - event.start.getTime();
  const byday = rule.byday.length > 0 ? new Set(rule.byday) : new Set([copenhagenWeekday(event.start)]);
  const excluded = new Set(event.exdates.map((date) => date.getTime()));
  const until = rule.until?.getTime() ?? event.start.getTime() + 400 * 86_400_000;
  const maxCount = Math.min(rule.count ?? 80, 80);
  const occurrences: ParsedEvent[] = [];

  for (let day = 0; day < 400 && occurrences.length < maxCount; day++) {
    const start = new Date(event.start.getTime() + day * 86_400_000);
    if (start.getTime() > until) break;
    if (!byday.has(copenhagenWeekday(start))) continue;
    if (Math.floor(calendarDaysUntil(start, event.start) / 7) % rule.interval !== 0) continue;
    if (excluded.has(start.getTime())) continue;
    occurrences.push({
      start,
      end: new Date(start.getTime() + duration),
      title: event.title,
      location: event.location,
      exdates: [],
    });
  }

  return occurrences.length > 0 ? occurrences : [event];
}

function parseIcsEvents(ics: string): ParsedEvent[] {
  const events: ParsedEvent[] = [];
  let current: Partial<Omit<ParsedEvent, 'exdates'>> & { exdates: Date[] } | null = null;

  for (const line of unfoldIcs(ics)) {
    if (line === 'BEGIN:VEVENT') {
      current = { exdates: [] };
      continue;
    }
    if (line === 'END:VEVENT') {
      if (current?.start) {
        events.push({
          start: current.start,
          end: current.end ?? new Date(current.start.getTime() + 2 * 60 * 60 * 1000),
          title: current.title || 'Træning',
          location: current.location,
          rrule: current.rrule,
          exdates: current.exdates,
        });
      }
      current = null;
      continue;
    }
    if (!current) continue;

    const property = parseProperty(line);
    if (!property) continue;
    const tzid = property.params.TZID || COPENHAGEN;

    if (property.name === 'DTSTART') {
      const start = parseIcsDateTime(property.value, tzid);
      if (start) current.start = start;
    } else if (property.name === 'DTEND') {
      const end = parseIcsDateTime(property.value, tzid);
      if (end) current.end = end;
    } else if (property.name === 'SUMMARY' && property.value) {
      current.title = unescapeIcs(property.value);
    } else if (property.name === 'LOCATION' && property.value) {
      current.location = unescapeIcs(property.value);
    } else if (property.name === 'RRULE' && property.value) {
      current.rrule = property.value;
    } else if (property.name === 'EXDATE' && property.value) {
      current.exdates.push(...parseDateList(property.value, tzid));
    }
  }

  return events.flatMap(expandEvent);
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

export function upcomingEventsFromIcs(ics: string, now = new Date(), limit = MAX_UPCOMING_EVENTS): CalendarEvent[] {
  return parseIcsEvents(ics)
    .filter((event) => event.end.getTime() >= now.getTime())
    .sort((a, b) => a.start.getTime() - b.start.getTime())
    .slice(0, limit)
    .map((event) => toCalendarEvent(event, now));
}

export async function getUpcomingEvents(limit = MAX_UPCOMING_EVENTS): Promise<CalendarEvent[]> {
  try {
    const response = await fetch(GOOGLE_CALENDAR_ICS_URL, {
      next: { revalidate: 300 },
      signal: AbortSignal.timeout(4000),
    });
    if (!response.ok) return [];
    return upcomingEventsFromIcs(await response.text(), new Date(), limit);
  } catch (error) {
    console.error('Fejl ved hentning af kalender:', error);
    return [];
  }
}

export async function getNextTraining(): Promise<NextTraining | null> {
  const [next] = await getUpcomingEvents(1);
  return next ?? null;
}
