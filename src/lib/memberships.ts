export const CATALOG_PRICES = {
  Træning: 25000,
  Kamphold: 45000,
  Træner: 100,
} as const;

export type PublicMembershipType = keyof typeof CATALOG_PRICES;

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
    description: 'Træneraftale med fri adgang til hal og kamphold.',
  },
} as const;

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

export type MembershipCounts = Record<PublicMembershipType, number>;

export function countActiveMemberships(
  members: { membershipType: string }[],
): MembershipCounts {
  const counts: MembershipCounts = { Træning: 0, Kamphold: 0, Træner: 0 };
  for (const member of members) {
    const type = member.membershipType.toLowerCase();
    if (type.includes('kamp')) counts.Kamphold += 1;
    else if (type.includes('træner') || type.includes('traener')) counts.Træner += 1;
    else counts.Træning += 1;
  }
  return counts;
}
