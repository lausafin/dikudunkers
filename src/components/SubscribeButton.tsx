// Denne kommentar instruerer ESLint om at ignorere "fejlen" på den næste linje.
// eslint-disable-next-line @typescript-eslint/triple-slash-reference
/// <reference path="../lib/types/vipps.d.ts" />

'use client';

import { useState } from 'react';

// Typerne forbliver de samme
type MembershipDetails = {
  type: 'Haladgang' | 'Kamphold';
  priceInOre: number;
  displayName: string;
  productName: string;
};

type SubscribeButtonProps = {
  // RETTELSEN ER HER: "Membership-Details" er ændret til "MembershipDetails"
  membership: MembershipDetails;
};

export default function SubscribeButton({ membership }: SubscribeButtonProps) {
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSubscribe = async () => {
    setIsLoading(true);
    setError(null);

    try {
      const response = await fetch('/api/recurring/create-agreement', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ 
          membershipType: membership.type,
          priceInOre: membership.priceInOre,
          productName: membership.productName,
        }),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Failed to initiate subscription.');
      }

      const data = await response.json();
      sessionStorage.setItem('vippsAgreementId', data.agreementId);
      window.location.href = data.vippsConfirmationUrl;

    } catch (err) {
      setError(err instanceof Error ? err.message : 'An error occurred.');
      setIsLoading(false);
    }
  };

  return (
    <div>
      <div onClick={!isLoading ? handleSubscribe : undefined}>
        <vipps-mobilepay-button
          brand="mobilepay"
          variant="primary"
          language="dk"
          verb="continue"
          branded="true"
          rounded="true"
          stretched="true"
          loading={isLoading.toString()}
        ></vipps-mobilepay-button>
      </div>
      {error && <p className="text-red-500 mt-2 text-sm">{error}</p>}
    </div>
  );
}