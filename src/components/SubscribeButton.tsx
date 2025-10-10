// components/SubscribeButton.tsx
'use client';

import { useState } from 'react';

export default function SubscribeButton() {
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSubscribe = async () => {
    setIsLoading(true);
    setError(null);

    // Hardcoded for test, i en rigtig app ville du have en input-felt
    const testPhoneNumber = '4712345678'; // Udskift med dit test-bruger nummer

    try {
      const response = await fetch('/api/recurring/create-agreement', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ phoneNumber: testPhoneNumber }),
      });

      if (!response.ok) {
        throw new Error('Failed to initiate subscription.');
      }

      const data = await response.json();
      
      // Gem agreementId i sessionStorage, så vi kan tjekke status bagefter
      sessionStorage.setItem('vippsAgreementId', data.agreementId);

      // Redirect brugeren til Vipps
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
        className="bg-blue-600 text-white font-bold py-3 px-6 rounded hover:bg-blue-700 disabled:bg-gray-400"
      >
        {isLoading ? 'Omdirigerer...' : 'Tegn Abonnement - 299 DKK/md.'}
      </button>
      {error && <p className="text-red-500 mt-2">{error}</p>}
    </div>
  );
}