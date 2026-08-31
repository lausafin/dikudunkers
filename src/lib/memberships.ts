export const CATALOG_PRICES = {
  Træning: 25000,
  Kamphold: 45000,
  Træner: 8000,
} as const;

export type PublicMembershipType = keyof typeof CATALOG_PRICES;

export type AgreementRequestType = PublicMembershipType | 'KampholdLegacy';

export type ResolvedMembership = {
  membershipType: PublicMembershipType;
  priceInOre: number;
  productName: string;
};

const PUBLIC_CATALOG: Record<PublicMembershipType, ResolvedMembership> = {
  Træning: {
    membershipType: 'Træning',
    priceInOre: CATALOG_PRICES.Træning,
    productName: 'Træning',
  },
  Kamphold: {
    membershipType: 'Kamphold',
    priceInOre: CATALOG_PRICES.Kamphold,
    productName: 'Kamphold',
  },
  Træner: {
    membershipType: 'Træner',
    priceInOre: CATALOG_PRICES.Træner,
    productName: 'Træner',
  },
};

/** Old Kamphold amount, only for Vipps test-API cron verification. */
export const KAMPHOLD_LEGACY_TEST_PRICE_ORE = 35000;

export const MEMBERSHIP_DISPLAY = {
  traening: {
    type: 'Træning' as const,
    priceInOre: CATALOG_PRICES.Træning,
    displayName: `${CATALOG_PRICES.Træning / 100} DKK / halvår`,
    productName: 'Træning',
    description: 'Adgang til ugentlig indendørstræning.',
  },
  kamphold: {
    type: 'Kamphold' as const,
    priceInOre: CATALOG_PRICES.Kamphold,
    displayName: `${CATALOG_PRICES.Kamphold / 100} DKK / halvår`,
    productName: 'Kamphold',
    description: 'Deltagelse i DBBF-kampe samt fuld adgang til træning.',
  },
  traener: {
    type: 'Træner' as const,
    priceInOre: CATALOG_PRICES.Træner,
    displayName: `${CATALOG_PRICES.Træner / 100} DKK / halvår`,
    productName: 'Træner',
    description: 'Træneraftale med fri adgang til hal og kamphold. Symbolsk bidrag.',
  },
} as const;

export const KAMPHOLD_LEGACY_TEST = {
  type: 'KampholdLegacy' as const,
  priceInOre: KAMPHOLD_LEGACY_TEST_PRICE_ORE,
  displayName: `${KAMPHOLD_LEGACY_TEST_PRICE_ORE / 100} DKK / halvår`,
  productName: 'Kamphold',
} as const;

export function isVippsTestEnv(): boolean {
  return (process.env.VIPPS_API_BASE_URL ?? '').includes('apitest');
}

export function resolveMembershipForAgreement(
  requestedType: unknown,
): ResolvedMembership | null {
  if (
    requestedType === 'Træning' ||
    requestedType === 'Kamphold' ||
    requestedType === 'Træner'
  ) {
    return PUBLIC_CATALOG[requestedType];
  }

  if (requestedType === 'KampholdLegacy' && isVippsTestEnv()) {
    return {
      membershipType: 'Kamphold',
      priceInOre: KAMPHOLD_LEGACY_TEST_PRICE_ORE,
      productName: 'Kamphold',
    };
  }

  return null;
}

export function membershipBadgeClass(membershipType?: string): string {
  const type = (membershipType ?? '').toLowerCase();
  if (type.includes('kamp')) {
    return 'border-orange-200/50 bg-orange-100/80 text-orange-900 dark:border-orange-500/30 dark:bg-orange-500/20 dark:text-orange-200';
  }
  if (type.includes('træner') || type.includes('traener')) {
    return 'border-amber-500/70 bg-amber-300 text-amber-950 dark:border-amber-400/60 dark:bg-amber-400/30 dark:text-amber-100';
  }
  return 'border-emerald-200/50 bg-emerald-100/80 text-emerald-900 dark:border-emerald-500/30 dark:bg-emerald-500/20 dark:text-emerald-200';
}
