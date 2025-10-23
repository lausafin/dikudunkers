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

    // This function will poll our backend for the true status of the agreement.
    const pollStatus = async () => {
      try {
        const response = await fetch(`/api/recurring/get-status?agreementId=${agreementId}`);
        const data = await response.json();

        // If the webhook has already updated the status, we're done!
        if (data.status === 'ACTIVE') {
          setStatus('ACTIVE');
          clearInterval(intervalId);
          sessionStorage.removeItem('vippsAgreementId');
        } else if (data.status === 'STOPPED' || data.status === 'EXPIRED') {
          setStatus('FAILED');
          clearInterval(intervalId);
          sessionStorage.removeItem('vippsAgreementId');
        } else {
          // It's still PENDING, so we keep the UI in a pending state and wait.
          setStatus('PENDING');
        }
      } catch (error) {
        console.error("Polling failed:", error);
        setStatus('FAILED');
        clearInterval(intervalId);
      }
    };

    // Start polling immediately, then every 3 seconds, for up to 30 seconds.
    pollStatus();
    const intervalId = setInterval(pollStatus, 3000);
    const timeoutId = setTimeout(() => {
      clearInterval(intervalId);
      // If still loading or pending after 30s, show a generic success message.
      // The webhook will handle the backend, but we don't want the user to wait forever.
      setStatus(currentStatus => 
        currentStatus === 'PENDING' || currentStatus === 'LOADING' ? 'ACTIVE' : currentStatus
      );
    }, 30000);

    return () => {
      clearInterval(intervalId);
      clearTimeout(timeoutId);
    };
  }, []);

  // Render different UI based on the real-time status
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

  // This is the final ACTIVE state
  return (
      <div>
        <h1 className="text-2xl font-bold text-green-600">Velkommen til DIKU Dunkers!</h1>
        <p>Dit medlemskab er nu aktivt og bekræftet.</p>
        <p>Du kan se og administrere din aftale i din MobilePay-app.</p>
      </div>
  );
}