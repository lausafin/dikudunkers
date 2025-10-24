// src/app/subscription-success/SubscriptionSuccessClient.tsx
'use client';

import { useEffect, useState } from 'react';

// --- UI Components for each state (these are great, let's keep them) ---

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


// --- The Main Component ---

export default function SubscriptionSuccessClient() {
  const [isFinal, setIsFinal] = useState(false);
  const [finalStatus, setFinalStatus] = useState<'ACTIVE' | 'FAILED'>('FAILED');

  useEffect(() => {
    const agreementId = sessionStorage.getItem('vippsAgreementId');
    
    // Define the final check function
    const performFinalCheck = async () => {
      if (!agreementId) {
        setFinalStatus('FAILED');
        setIsFinal(true);
        return;
      }

      try {
        const response = await fetch(`/api/recurring/get-status?agreementId=${agreementId}`);
        if (!response.ok) throw new Error("API check failed");

        const data = await response.json();

        // The final verdict: is it active or not?
        if (data.status === 'ACTIVE') {
          setFinalStatus('ACTIVE');
        } else {
          // Any other status (PENDING, STOPPED, EXPIRED) is considered a failure from the UI's perspective.
          setFinalStatus('FAILED');
        }
      } catch (error) {
        console.error("Final check failed:", error);
        setFinalStatus('FAILED');
      } finally {
        // This is the most important step: we are now ready to show the final UI.
        setIsFinal(true);
        sessionStorage.removeItem('vippsAgreementId');
      }
    };

    // Set a timeout to perform the final check after 5 seconds.
    const timer = setTimeout(performFinalCheck, 5000);

    // Cleanup function in case the component unmounts prematurely.
    return () => clearTimeout(timer);
  }, []); // Run only once on mount.

  return (
    <div className="flex flex-col items-center justify-center text-center">
      {/* Show the loading state until the final check is complete */}
      {!isFinal && <LoadingState />}

      {/* Once the check is complete, show the definitive result */}
      {isFinal && (finalStatus === 'ACTIVE' ? <SuccessState /> : <FailureState />)}
    </div>
  );
}