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
    <h1 className="text-2xl font-bold text-red-600">Betaling fejlet</h1>
    <p>Vi kunne ikke oprette dit medlemskab.</p>
    <p>Prøv igen, eller kontakt support hvis problemet vedvarer.</p>
  </>
);

const CancelState = () => (
  <>
    <h1 className="text-2xl font-bold text-yellow-600">Betaling afbrudt</h1>
    <p>Du afbrød oprettelsen i MobilePay.</p>
    <p className="mt-2">Du kan lukke denne fane eller gå tilbage for at prøve igen.</p>
  </>
);

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
  const [status, setStatus] = useState<'LOADING' | 'ACTIVE' | 'FAILED' | 'TIMEOUT' | 'CANCELLED'>('LOADING');
  
  const searchParams = useSearchParams();

  useEffect(() => {
     // 1. INSTANT CHECK: URL Parameters
    // MobilePay usually adds ?error=access_denied or ?error=user_cancel
    const error = searchParams.get('error');
    const errorCode = searchParams.get('error_code');
    
    // Debugging: See exactly what Vipps sends when you cancel
    if (error || errorCode) {
      console.log("Vipps Redirect Params:", { error, errorCode });
    }

    if (error === 'access_denied' || error === 'user_cancel' || errorCode === '400') {
      setStatus('CANCELLED');
      return; // Stop here, do not poll
    }

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

        // 2. LOGIC FIX: Check specific statuses first
        if (data.status === 'ACTIVE') {
          setStatus('ACTIVE');
        } 
        else if (data.status === 'STOPPED') {
            // If the DB says STOPPED this early, the user likely cancelled immediately
            setStatus('CANCELLED');
        }
        else if (['EXPIRED', 'FAILED'].includes(data.status)) {
          setStatus('FAILED');
        } 
        // If 'PENDING', do nothing and wait
      } catch (error) {
        console.warn("Polling request failed, will retry:", error);
      }
    };

    // Poll every 2 seconds
    const intervalId = setInterval(() => {
      setStatus((prev) => {
        // Stop polling if we reached a final state
        if (prev !== 'LOADING') {
            clearInterval(intervalId);
            return prev;
        }
        pollStatus();
        return 'LOADING';
      });
    }, 2000);

    // Timeout after 30 seconds
    const timeoutId = setTimeout(() => {
      setStatus((prev) => {
        if (prev === 'LOADING') {
          return 'TIMEOUT';
        }
        return prev;
      });
    }, 30000); 

    pollStatus(); // Initial poll

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
      {status === 'CANCELLED' && <CancelState />}
      {status === 'TIMEOUT' && <TimeoutState />}
    </div>
  );
}