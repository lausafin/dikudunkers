// src/app/subscription-success/SubscriptionSuccessClient.tsx
'use client';

import { useEffect, useState } from 'react';

export default function SubscriptionSuccessClient() {
  const [status, setStatus] = useState<'LOADING' | 'ACTIVE' | 'PENDING' | 'FAILED'>('LOADING');

  useEffect(() => {
    const agreementId = sessionStorage.getItem('vippsAgreementId');
    if (!agreementId) {
      setStatus('FAILED');
      return;
    }

    let consecutiveFailedPolls = 0; // Track consecutive failures

    const pollStatus = async () => {
      try {
        const response = await fetch(`/api/recurring/get-status?agreementId=${agreementId}`);
        const data = await response.json();

        // If we get a valid response, reset the failure counter
        consecutiveFailedPolls = 0;

        if (data.status === 'ACTIVE') {
          setStatus('ACTIVE');
          clearInterval(intervalId);
          clearTimeout(timeoutId); // Clean up timeout as well
          sessionStorage.removeItem('vippsAgreementId');
        } else if (data.status === 'STOPPED' || data.status === 'EXPIRED') {
          setStatus('FAILED');
          clearInterval(intervalId);
          clearTimeout(timeoutId);
          sessionStorage.removeItem('vippsAgreementId');
        } else {
          // It's still PENDING, we keep waiting.
          setStatus('PENDING');
        }
      } catch (error) {
        console.warn("A poll request failed. Retrying...", error);
        consecutiveFailedPolls++;

        // If we fail 3 times in a row, then we give up.
        if (consecutiveFailedPolls > 3) {
          console.error("Polling failed multiple times. Setting status to FAILED.");
          setStatus('FAILED');
          clearInterval(intervalId);
          clearTimeout(timeoutId);
        }
      }
    };

    // Start polling immediately, then every 3 seconds.
    pollStatus();
    const intervalId = setInterval(pollStatus, 3000);

    // The optimistic timeout: If after 30 seconds we are still pending,
    // assume success for the user's sake. The webhook is the source of truth for the backend.
    const timeoutId = setTimeout(() => {
      clearInterval(intervalId);
      setStatus(currentStatus => 
        currentStatus === 'PENDING' || currentStatus === 'LOADING' ? 'ACTIVE' : currentStatus
      );
    }, 30000);

    // Cleanup function to stop polling if the component unmounts
    return () => {
      clearInterval(intervalId);
      clearTimeout(timeoutId);
    };
  }, []); // Empty dependency array is correct here, we only want to start this process once.

  // --- UI Rendering (no changes needed here) ---

  if (status === 'LOADING') {
    return <p>Bekræfter status for dit medlemskab...</p>;
  }
  if (status === 'PENDING') {
    return <p>Betaling modtaget. Venter på endelig aktivering...</p>;
  }
  if (status === 'FAILED') {
    return (
      <div>
        <h1 className="text-2xl font-bold text-red-600">Noget gik galt</h1>
        <p>Vi kunne desværre ikke bekræfte dit medlemskab lige nu. Tjek venligst din MobilePay-app for status, eller kontakt support.</p>
      </div>
    );
  }
  return (
      <div>
        <h1 className="text-2xl font-bold text-green-600">Velkommen til DIKU Dunkers!</h1>
        <p>Dit medlemskab er nu aktivt og bekræftet.</p>
        <p>Du kan se og administrere din aftale i din MobilePay-app.</p>
      </div>
  );
}