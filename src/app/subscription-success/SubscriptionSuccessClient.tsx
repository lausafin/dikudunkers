'use client';

import { useEffect, useState } from 'react';
import { useSearchParams } from 'next/navigation';
import LoadingSpinner from '@/components/LoadingSpinner';

// --- UI Components ---

const SuccessState = () => (
  <>
    <h1 className="text-2xl font-bold text-green-600">Velkommen til DIKU Dunkers!</h1>
    <p>Dit medlemskab er nu aktivt og bekræftet.</p>
    <p>Du kan se og administrere din aftale i din MobilePay-app.</p>
  </>
);

const FailureState = () => (
  <>
    <h1 className="text-2xl font-bold text-red-600">Betaling afbrudt eller fejlet</h1>
    <p>Vi kunne ikke oprette dit medlemskab.</p>
    <p>Prøv igen, eller kontakt support hvis problemet vedvarer.</p>
  </>
);

// New State for when we stop polling but don't have a definitive Yes/No
const TimeoutState = () => (
  <>
    <h1 className="text-2xl font-bold text-orange-600">Afventer bekræftelse</h1>
    <p>Vi har ikke modtaget den endelige bekræftelse fra MobilePay endnu.</p>
    <p className="mt-4 font-semibold">Tjek din MobilePay-app:</p>
    <ul className="list-disc list-inside text-left mt-2 mb-4 max-w-md mx-auto">
      <li>Hvis betalingen er gået igennem der, er du medlem.</li>
      <li>Hvis betalingen ikke ses i appen, bedes du prøve igen.</li>
    </ul>
  </>
);

// --- Main Component ---
export default function SubscriptionSuccessClient() {
  // We use a simplified status enum: 'LOADING' | 'ACTIVE' | 'FAILED' | 'TIMEOUT'
  const [status, setStatus] = useState<'LOADING' | 'ACTIVE' | 'FAILED' | 'TIMEOUT'>('LOADING');
  
  const searchParams = useSearchParams();

  useEffect(() => {
    const tempId = searchParams.get('temp_id');

    if (!tempId) {
      console.error("CRITICAL: No temp_id found in URL.");
      setStatus('FAILED');
      return;
    }

    const pollStatus = async () => {
      try {
        const cacheBuster = `t=${Date.now()}`;
        const response = await fetch(`/api/recurring/get-status-by-temp-id?temp_id=${tempId}&${cacheBuster}`);
        
        if (!response.ok) return; 

        const data = await response.json();

        if (data.status === 'ACTIVE') {
          setStatus('ACTIVE');
          // We don't need to clear intervals manually here if we just unmount or let the effect cleanup handle it,
          // but strictly speaking, we stop logic via the state change.
        } else if (['STOPPED', 'EXPIRED', 'FAILED'].includes(data.status)) {
          setStatus('FAILED');
        }
        // If 'PENDING', we do nothing and wait for next poll
      } catch (error) {
        console.warn("Polling request failed, will retry:", error);
      }
    };

    // Poll every 2 seconds
    const intervalId = setInterval(() => {
      // Only poll if we are still loading
      setStatus((prev) => {
        if (prev === 'LOADING') {
          pollStatus();
          return 'LOADING';
        }
        return prev;
      });
    }, 2000);

    // Timeout after 30 seconds (Increased from 20s to be safer)
    const timeoutId = setTimeout(() => {
      setStatus((prev) => {
        if (prev === 'LOADING') {
          return 'TIMEOUT'; // <--- CHANGED: No longer assumes 'ACTIVE'
        }
        return prev;
      });
    }, 30000); 

    // Initial check
    pollStatus();

    // Cleanup
    return () => {
      clearInterval(intervalId);
      clearTimeout(timeoutId);
    };
  }, [searchParams]);

  return (
    <div className="flex flex-col items-center justify-center text-center space-y-4">
      {status === 'LOADING' && <LoadingSpinner />}
      {status === 'ACTIVE' && <SuccessState />}
      {status === 'FAILED' && <FailureState />}
      {status === 'TIMEOUT' && <TimeoutState />}
    </div>
  );
}