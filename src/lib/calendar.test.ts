import assert from 'node:assert/strict';
import { describe, it } from 'node:test';
import { upcomingEventsFromIcs } from './calendar.ts';

const sundaySeries = `BEGIN:VCALENDAR
BEGIN:VEVENT
DTSTART;TZID=Europe/Copenhagen:20260906T200000
DTEND;TZID=Europe/Copenhagen:20260906T220000
RRULE:FREQ=WEEKLY;UNTIL=20260927T235959Z;BYDAY=SU
SUMMARY:Søndagstræning
LOCATION:DGI-Byen
END:VEVENT
BEGIN:VEVENT
DTSTART:20260905T180000Z
DTEND:20260905T200000Z
SUMMARY:Lørdagstræning
LOCATION:Islands Brygge
END:VEVENT
BEGIN:VEVENT
DTSTART:20260912T180000Z
DTEND:20260912T200000Z
SUMMARY:Lørdagstræning
LOCATION:Islands Brygge
END:VEVENT
BEGIN:VEVENT
DTSTART:20260919T180000Z
DTEND:20260919T200000Z
SUMMARY:Lørdagstræning
LOCATION:Islands Brygge
END:VEVENT
END:VCALENDAR`;

describe('upcomingEventsFromIcs', () => {
  it('expands weekly Sunday recurrences between Saturday bookings', () => {
    const events = upcomingEventsFromIcs(sundaySeries, new Date('2026-09-02T12:00:00Z'), 4);
    assert.deepEqual(
      events.map((event) => event.whenLabel),
      [
        'lørdag 5. sep. · 20.00',
        'søndag 6. sep. · 20.00',
        'lørdag 12. sep. · 20.00',
        'søndag 13. sep. · 20.00',
      ],
    );
  });

  it('expands a separate weekly Friday series', () => {
    const ics = `BEGIN:VCALENDAR
BEGIN:VEVENT
DTSTART;TZID=Europe/Copenhagen:20260904T200000
DTEND;TZID=Europe/Copenhagen:20260904T220000
RRULE:FREQ=WEEKLY;UNTIL=20260925T235959Z;BYDAY=FR
SUMMARY:Fredagstræning
LOCATION:DGI-Byen
END:VEVENT
BEGIN:VEVENT
DTSTART;TZID=Europe/Copenhagen:20260906T200000
DTEND;TZID=Europe/Copenhagen:20260906T220000
RRULE:FREQ=WEEKLY;UNTIL=20260927T235959Z;BYDAY=SU
SUMMARY:Søndagstræning
LOCATION:DGI-Byen
END:VEVENT
BEGIN:VEVENT
DTSTART:20260905T180000Z
DTEND:20260905T200000Z
SUMMARY:Lørdagstræning
END:VEVENT
BEGIN:VEVENT
DTSTART:20260912T180000Z
DTEND:20260912T200000Z
SUMMARY:Lørdagstræning
END:VEVENT
END:VCALENDAR`;
    const events = upcomingEventsFromIcs(ics, new Date('2026-09-02T12:00:00Z'), 4);
    assert.deepEqual(
      events.map((event) => event.whenLabel),
      [
        'fredag 4. sep. · 20.00',
        'lørdag 5. sep. · 20.00',
        'søndag 6. sep. · 20.00',
        'fredag 11. sep. · 20.00',
      ],
    );
  });

  it('honours EXDATE skipped weeks', () => {
    const ics = `BEGIN:VCALENDAR
BEGIN:VEVENT
DTSTART;TZID=Europe/Copenhagen:20260906T200000
DTEND;TZID=Europe/Copenhagen:20260906T220000
RRULE:FREQ=WEEKLY;UNTIL=20260927T235959Z;BYDAY=SU
EXDATE;TZID=Europe/Copenhagen:20260913T200000
SUMMARY:Søndagstræning
END:VEVENT
END:VCALENDAR`;
    const events = upcomingEventsFromIcs(ics, new Date('2026-09-02T12:00:00Z'), 4);
    assert.deepEqual(
      events.map((event) => event.whenLabel),
      ['søndag 6. sep. · 20.00', 'søndag 20. sep. · 20.00', 'søndag 27. sep. · 20.00'],
    );
  });
});
