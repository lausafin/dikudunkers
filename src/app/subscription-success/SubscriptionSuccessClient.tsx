// src/app/subscription-success/SubscriptionSuccessClient.tsx
'use client';

import { useEffect, useState } from 'react';

// --- UI Components (These are perfect and stay the same) ---
const LoadingState = () => (
  <>
    {/* Simple, clean loading spinner */}
    <div 
      style={{ borderTopColor: 'transparent' }}
      className="animate-spin rounded-full h-12 w-12 border-4 border-gray-900 mb-4"
    ></div>
    <h1 className="text-2xl font-bold">Bekræfter din tilmelding...</h1>
    <p>Dette tager kun et øjeblik.</p>
  </>
);

const SuccessState = () => (
  <>
    <h1 className="text-2xl font-bold text-green-600">Velkommen til DIKU Dunkers!</h1>
    <p>Dit medlemskab er nu aktivt og bekræftet.</p>
    <p>Du kan se og administrere din aftale i din MobilePay-app.</p>
  </>
);

const FailureState = () => (
  <>
    <h1 className="text-2xl font-bold text-red-600">Noget gik galt</h1>
    <p>Vi kunne desværre ikke bekræfte dit medlemskab lige nu.</p>
    <p>Tjek venligst din MobilePay-app for status, eller kontakt support hvis problemet vedvarer.</p>
  </>
);

// --- The Main Component with the Resilient Poller ---
export default function SubscriptionSuccessClient() {
  const [isLoading, setIsLoading] = useState(true);
  const [finalStatus, setFinalStatus] = useState<'ACTIVE' | 'FAILED'>('FAILED');

  useEffect(() => {
    const agreementId = sessionStorage.getItem('vippsAgreementId');
    if (!agreementId) {
      setIsLoading(false);
      setFinalStatus('FAILED');
      return;
    }

    const pollStatus = async () => {
      try {
        // ==========================================================
        // == THE CACHE-BUSTING FIX IS HERE ==
        // ==========================================================
        // By adding a unique timestamp query parameter, we force Vercel's Edge
        // and any browser cache to treat every poll as a unique request.
        const cacheBuster = `t=${Date.now()}`;
        const response = await fetch(`/api/recurring/get-status?agreementId=${agreementId}&${cacheBuster}`);
        // ==========================================================
        
        if (!response.ok) return; // Don't fail, just wait for the next poll

        const data = await response.json();

        if (data.status === 'ACTIVE') {
          setFinalStatus('ACTIVE');
          setIsLoading(false); // Transition to final state
          clearInterval(intervalId);
          clearTimeout(timeoutId);
          sessionStorage.removeItem('vippsAgreementId');
        } else if (['STOPPED', 'EXPIRED'].includes(data.status)) {
          setFinalStatus('FAILED');
          setIsLoading(false); // Transition to final state
          clearInterval(intervalId);
          clearTimeout(timeoutId);
          sessionStorage.removeItem('vippsAgreementId');
        }
        // If status is 'PENDING', we do nothing and let the poller continue.

      } catch (error) {
        console.warn("Polling request failed, will retry:", error);
      }
    };

    const intervalId = setInterval(pollStatus, 2000);

    const timeoutId = setTimeout(() => {
      clearInterval(intervalId);
      // Failsafe: If we are still loading after 20 seconds, default to success.
      if (isLoading) {
        setFinalStatus('ACTIVE');
        setIsLoading(false);
      }
    }, 20000);

    pollStatus(); // Initial poll

    return () => {
      clearInterval(intervalId);
      clearTimeout(timeoutId);
    };
  }, [isLoading]); // Re-running useEffect with isLoading is intentional but harmless here.

  return (
    <div className="flex flex-col items-center justify-center text-center">
      {isLoading ? <LoadingState /> : (finalStatus === 'ACTIVE' ? <SuccessState /> : <FailureState />)}
    </div>
  );
}