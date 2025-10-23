// src/components/SubscribeButton.tsx
'use client';

import React, { useState } from 'react';

// ... (Dine type-definitioner er uændrede)
type MembershipDetails = {
  type: 'Haladgang' | 'Kamphold';
  priceInOre: number;
  displayName: string;
  productName: string;
};
type SubscribeButtonProps = {
  membership: MembershipDetails;
};

export default function SubscribeButton({ membership }: SubscribeButtonProps) {
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSubscribe = async () => {
    setIsLoading(true);
    setError(null);

    // ==========================================================
    // == DEN NYE LOGIK ER HER ==
    // ==========================================================
    // Send en "fire-and-forget" anmodning for at vække API'en.
    // Vi bruger IKKE 'await', fordi vi er ligeglade med svaret.
    // Brugeren skal omdirigeres med det samme, uanset hvad.
    fetch('/api/warmup');
    // ==========================================================

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
      setIsLoading(false); // Sørg for at stoppe loading ved fejl
    }
  };

  return (
    <div>
      <div onClick={!isLoading ? handleSubscribe : undefined}>
        {React.createElement('vipps-mobilepay-button', {
          brand: 'mobilepay',
          variant: 'primary',
          language: 'dk',
          verb: 'continue',
          branded: 'true',
          rounded: 'true',
          stretched: 'true',
          loading: isLoading.toString(),
        })}
      </div>
      {error && <p className="text-red-500 mt-2 text-sm">{error}</p>}
    </div>
  );
}