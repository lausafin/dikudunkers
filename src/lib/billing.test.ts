import assert from 'node:assert/strict';
import { describe, it } from 'node:test';
import { BILLING_GRACE_DAYS, classifySeasonalBilling } from './billing.ts';

function d(isoDate: string): Date {
  return new Date(`${isoDate}T00:00:00Z`);
}

describe('classifySeasonalBilling', () => {
  it('uses a 7-day grace window', () => {
    assert.equal(BILLING_GRACE_DAYS, 7);
  });

  it('skips 25-31 Aug on 1 Sep', () => {
    assert.equal(classifySeasonalBilling(d('2026-09-01'), d('2026-08-25')), 'skipped');
    assert.equal(classifySeasonalBilling(d('2026-09-01'), d('2026-08-31')), 'skipped');
  });

  it('charges 24 Aug on 1 Sep', () => {
    assert.equal(classifySeasonalBilling(d('2026-09-01'), d('2026-08-24')), 'due');
  });

  it('still skips a 25 Aug signup after 1 Sep', () => {
    assert.equal(classifySeasonalBilling(d('2026-09-02'), d('2026-08-25')), 'skipped');
    assert.equal(classifySeasonalBilling(d('2026-12-15'), d('2026-08-25')), 'skipped');
  });

  it('charges an earlier-season member on 1 Sep', () => {
    assert.equal(classifySeasonalBilling(d('2026-09-01'), d('2026-03-01')), 'due');
  });

  it('does not bill before 1 Sep for a late-August signup', () => {
    assert.equal(classifySeasonalBilling(d('2026-08-31'), d('2026-08-25')), 'not-due');
  });

  it('skips 25-31 Jan on 1 Feb', () => {
    assert.equal(classifySeasonalBilling(d('2026-02-01'), d('2026-01-25')), 'skipped');
    assert.equal(classifySeasonalBilling(d('2026-02-01'), d('2026-01-31')), 'skipped');
  });

  it('charges 24 Jan on 1 Feb', () => {
    assert.equal(classifySeasonalBilling(d('2026-02-01'), d('2026-01-24')), 'due');
  });

  it('charges last September on 1 Feb', () => {
    assert.equal(classifySeasonalBilling(d('2026-02-01'), d('2025-09-01')), 'due');
  });

  it('charges a grace-skipped August signup on the next 1 Feb', () => {
    assert.equal(classifySeasonalBilling(d('2027-02-01'), d('2026-08-25')), 'due');
  });

  it('keeps a late-January grace skip out of later February/March runs', () => {
    assert.equal(classifySeasonalBilling(d('2026-02-15'), d('2026-01-28')), 'skipped');
    assert.equal(classifySeasonalBilling(d('2026-03-01'), d('2026-01-28')), 'skipped');
  });

  it('charges that late-January member on 1 Sep', () => {
    assert.equal(classifySeasonalBilling(d('2026-09-01'), d('2026-01-28')), 'due');
  });

  it('does not bill someone who already paid on the season date', () => {
    assert.equal(classifySeasonalBilling(d('2026-09-01'), d('2026-09-01')), 'not-due');
    assert.equal(classifySeasonalBilling(d('2026-02-01'), d('2026-02-01')), 'not-due');
  });

  it('does not bill in January before the February season', () => {
    assert.equal(classifySeasonalBilling(d('2026-01-15'), d('2025-09-01')), 'not-due');
  });
});
