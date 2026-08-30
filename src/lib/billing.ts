export const BILLING_GRACE_DAYS = 7;

export type SeasonalBillingDecision = 'due' | 'skipped' | 'not-due';

function utcDate(year: number, monthIndex: number, day: number): Date {
  return new Date(Date.UTC(year, monthIndex, day));
}

function addUtcDays(date: Date, days: number): Date {
  return utcDate(date.getUTCFullYear(), date.getUTCMonth(), date.getUTCDate() + days);
}

function startOfUtcDay(date: Date): Date {
  return utcDate(date.getUTCFullYear(), date.getUTCMonth(), date.getUTCDate());
}

export function getSeasonBillingDates(today: Date): {
  februaryFirst: Date;
  septemberFirst: Date;
} {
  const year = today.getUTCFullYear();
  return {
    februaryFirst: utcDate(year, 1, 1),
    septemberFirst: utcDate(year, 8, 1),
  };
}

/**
 * Same predicates as the process-subscriptions SQL:
 * due if last_charged_at is before the season date minus the grace window;
 * skipped if last_charged_at falls inside that window.
 */
export function classifySeasonalBilling(
  today: Date,
  lastChargedAt: Date,
  graceDays = BILLING_GRACE_DAYS,
): SeasonalBillingDecision {
  const currentDate = startOfUtcDay(today);
  const lastCharged = startOfUtcDay(lastChargedAt);
  const { februaryFirst, septemberFirst } = getSeasonBillingDates(currentDate);
  const septemberCutoff = addUtcDays(septemberFirst, -graceDays);
  const februaryCutoff = addUtcDays(februaryFirst, -graceDays);

  const septemberDue = currentDate >= septemberFirst && lastCharged < septemberCutoff;
  const februaryDue =
    currentDate >= februaryFirst &&
    currentDate < septemberFirst &&
    lastCharged < februaryCutoff;

  if (septemberDue || februaryDue) {
    return 'due';
  }

  const septemberSkipped =
    currentDate >= septemberFirst &&
    lastCharged < septemberFirst &&
    lastCharged >= septemberCutoff;
  const februarySkipped =
    currentDate >= februaryFirst &&
    currentDate < septemberFirst &&
    lastCharged < februaryFirst &&
    lastCharged >= februaryCutoff;

  if (septemberSkipped || februarySkipped) {
    return 'skipped';
  }

  return 'not-due';
}
