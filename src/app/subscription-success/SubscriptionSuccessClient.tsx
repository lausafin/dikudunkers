// src/app/subscription-success/SubscriptionSuccessClient.tsx
'use client';

import { useEffect, useState } from 'react';

// --- UI Components for each state ---

const LoadingState = () => (
  <>
    <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-gray-900 mb-4"></div>
    <h1 className="text-2xl font-bold">Bekræfter din tilmelding...</h1>
    <p>Et øjeblik, vi behandler din anmodning.</p>
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

// --- The Main Component ---

export default function SubscriptionSuccessClient() {
  const [status, setStatus] = useState<'LOADING' | 'ACTIVE' | 'FAILED'>('LOADING');

  useEffect(() => {
    const agreementId = sessionStorage.getItem('vippsAgreementId');
    if (!agreementId) {
      setStatus('FAILED');
      return;
    }

    const pollStatus = async () => {
      try {
        const response = await fetch(`/api/recurring/get-status?agreementId=${agreementId}`);
        const data = await response.json();

        // We only care about FINAL states. If it's 'PENDING', we just wait.
        if (data.status === 'ACTIVE') {
          setStatus('ACTIVE');
          clearInterval(intervalId);
          clearTimeout(timeoutId);
          sessionStorage.removeItem('vippsAgreementId');
        } else if (['STOPPED', 'EXPIRED'].includes(data.status)) {
          setStatus('FAILED');
          clearInterval(intervalId);
          clearTimeout(timeoutId);
          sessionStorage.removeItem('vippsAgreementId');
        }
        // If status is 'PENDING', we do nothing and let the next poll handle it.
      } catch (error) {
        // We log the error but don't fail immediately, letting the poller retry.
        console.warn("Polling request failed, will retry:", error);
      }
    };

    // Poll every 2 seconds for a faster feel.
    const intervalId = setInterval(pollStatus, 2000);

    // After 20 seconds, we stop polling and optimistically assume success for the UX.
    // Our backend webhook is the true guarantee.
    const timeoutId = setTimeout(() => {
      clearInterval(intervalId);
      // Only transition if we are still in the loading state.
      setStatus(currentStatus => currentStatus === 'LOADING' ? 'ACTIVE' : currentStatus);
    }, 20000); // 20-second timeout

    // Initial poll immediately on load.
    pollStatus();

    // Cleanup on unmount.
    return () => {
      clearInterval(intervalId);
      clearTimeout(timeoutId);
    };
  }, []);

  return (
    <div className="flex flex-col items-center justify-center text-center">
      {status === 'LOADING' && <LoadingState />}
      {status === 'ACTIVE' && <SuccessState />}
      {status === 'FAILED' && <FailureState />}
    </div>
  );
}