// src/app/subscription-success/SubscriptionSuccessClient.tsx
'use client';

import { useEffect, useState } from 'react';
import { useSearchParams } from 'next/navigation'; // <-- STEP 1: Import the necessary hook

// --- UI Components (These are perfectly structured) ---
const LoadingState = () => (
  <>
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


// --- The Main, Corrected Component ---
export default function SubscriptionSuccessClient() {
  const [isLoading, setIsLoading] = useState(true);
  const [finalStatus, setFinalStatus] = useState<'ACTIVE' | 'FAILED'>('FAILED');
  
  // STEP 2: Use the hook to get access to URL parameters
  const searchParams = useSearchParams();

  useEffect(() => {
    // STEP 3: Read the temp_id from the URL. This is the reliable handoff.
    const tempId = searchParams.get('temp_id');

    if (!tempId) {
      console.error("CRITICAL: No temp_id found in URL. Cannot check status.");
      setIsLoading(false);
      setFinalStatus('FAILED');
      return;
    }

    const pollStatus = async () => {
      try {
        const cacheBuster = `t=${Date.now()}`;
        // STEP 4: Poll the correct endpoint using the tempId
        const response = await fetch(`/api/recurring/get-status-by-temp-id?temp_id=${tempId}&${cacheBuster}`);
        
        if (!response.ok) return; // Wait for the next poll

        const data = await response.json();

        if (data.status === 'ACTIVE') {
          setFinalStatus('ACTIVE');
          setIsLoading(false);
          clearInterval(intervalId);
          clearTimeout(timeoutId);
        } else if (['STOPPED', 'EXPIRED'].includes(data.status)) {
          setFinalStatus('FAILED');
          setIsLoading(false);
          clearInterval(intervalId);
          clearTimeout(timeoutId);
        }
        // If 'PENDING', do nothing and let the poller continue.

      } catch (error) {
        console.warn("Polling request failed, will retry:", error);
      }
    };

    const intervalId = setInterval(pollStatus, 2000);

    const timeoutId = setTimeout(() => {
      clearInterval(intervalId);
      if (isLoading) {
        setFinalStatus('ACTIVE'); // Optimistic fallback
        setIsLoading(false);
      }
    }, 20000);

    pollStatus(); // Initial poll

    return () => {
      clearInterval(intervalId);
      clearTimeout(timeoutId);
    };
    // STEP 5: Use an empty dependency array to ensure this runs only ONCE on mount.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return (
    <div className="flex flex-col items-center justify-center text-center">
      {isLoading ? <LoadingState /> : (finalStatus === 'ACTIVE' ? <SuccessState /> : <FailureState />)}
    </div>
  );
}