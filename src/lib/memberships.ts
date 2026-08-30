export const CATALOG_PRICES = {
  Træning: 25000,
  Kamphold: 45000,
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
  if (requestedType === 'Træning' || requestedType === 'Kamphold') {
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
