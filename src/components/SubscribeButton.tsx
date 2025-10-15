// src/components/SubscribeButton.tsx
'use client';

import { useState } from 'react';

// Define a type for the membership details
type MembershipDetails = {
  type: 'Haladgang' | 'Kamphold';
  priceInOre: number;
  displayName: string; // e.g., "150 DKK / halvår"
  productName: string; // e.g., "DIKU Dunkers Haladgang"
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

    // This should be an input field in a real scenario
    const testPhoneNumber = '66719702'; 

    try {
      const response = await fetch('/api/recurring/create-agreement', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ 
          phoneNumber: testPhoneNumber,
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
      <button
        onClick={handleSubscribe}
        disabled={isLoading}
        className="bg-blue-600 text-white font-bold py-3 px-6 rounded hover:bg-blue-700 disabled:bg-gray-400 w-full"
      >
        {isLoading ? 'Omdirigerer...' : `Tilmeld dig ${membership.type}`}
      </button>
      {error && <p className="text-red-500 mt-2 text-sm">{error}</p>}
    </div>
  );
}