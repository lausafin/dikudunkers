'use client';

import { useEffect, useState } from 'react';
import { useSearchParams } from 'next/navigation';
import LoadingSpinner from '@/components/LoadingSpinner';
import WelcomeSuccess, { type WelcomeDetails } from '@/components/WelcomeSuccess';

type Status = 'LOADING' | 'ACTIVE' | 'FAILED' | 'TIMEOUT' | 'CANCELLED';

function StatusCard({ children }: { children: React.ReactNode }) {
  return (
    <div className="w-full max-w-md rounded-2xl border border-white/50 bg-white/60 p-8 text-center shadow-[0_8px_32px_rgba(0,0,0,0.06)] backdrop-blur-xl dark:border-white/10 dark:bg-gray-900/60 dark:shadow-[0_8px_32px_rgba(0,0,0,0.2)]">
      {children}
    </div>
  );
}

const FailureState = () => (
  <StatusCard>
    <h1 className="text-2xl font-bold text-red-600 dark:text-red-400">Betaling fejlet</h1>
    <p className="mt-2 text-gray-700 dark:text-gray-300">Vi kunne ikke oprette dit medlemskab.</p>
    <p className="mt-1 text-gray-600 dark:text-gray-400">Prøv igen, eller kontakt support hvis problemet vedvarer.</p>
  </StatusCard>
);

const CancelState = () => (
  <StatusCard>
    <h1 className="text-2xl font-bold text-yellow-600 dark:text-yellow-400">Betaling afbrudt</h1>
    <p className="mt-2 text-gray-700 dark:text-gray-300">Du afbrød oprettelsen i MobilePay.</p>
    <p className="mt-2 text-gray-600 dark:text-gray-400">Du kan lukke denne fane eller gå tilbage for at prøve igen.</p>
  </StatusCard>
);

const TimeoutState = () => (
  <StatusCard>
    <h1 className="text-2xl font-bold text-orange-600 dark:text-orange-400">Afventer bekræftelse</h1>
    <p className="mt-2 text-gray-700 dark:text-gray-300">Vi har ikke modtaget den endelige bekræftelse fra MobilePay endnu.</p>
    <p className="mt-4 font-semibold text-gray-800 dark:text-gray-200">Tjek din MobilePay-app:</p>
    <ul className="mx-auto mt-2 mb-4 max-w-md list-disc list-inside text-left text-gray-600 dark:text-gray-400">
      <li>Hvis betalingen er gået igennem der, er du medlem.</li>
      <li>Hvis betalingen ikke ses i appen, bedes du prøve igen.</li>
    </ul>
  </StatusCard>
);

export default function SubscriptionSuccessClient() {
  const [status, setStatus] = useState<Status>('LOADING');
  const [welcome, setWelcome] = useState<WelcomeDetails>({});
  const searchParams = useSearchParams();

  useEffect(() => {
    if (process.env.NODE_ENV === 'development' && searchParams.get('preview') === 'welcome') {
      setWelcome({ firstName: 'Alex', membershipType: 'Kamphold' });
      setStatus('ACTIVE');
      return;
    }

    const error = searchParams.get('error');
    const errorCode = searchParams.get('error_code');

    if (error || errorCode) {
      console.log("Vipps Redirect Params:", { error, errorCode });
    }

    if (error === 'access_denied' || error === 'user_cancel' || errorCode === '400') {
      setStatus('CANCELLED');
      return;
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

        if (data.status === 'ACTIVE') {
          setWelcome({
            firstName: typeof data.firstName === 'string' ? data.firstName : undefined,
            membershipType: typeof data.membershipType === 'string' ? data.membershipType : undefined,
          });
          setStatus('ACTIVE');
        }
        else if (data.status === 'STOPPED') {
            setStatus('CANCELLED');
        }
        else if (['EXPIRED', 'FAILED'].includes(data.status)) {
          setStatus('FAILED');
        }
      } catch (error) {
        console.warn("Polling request failed, will retry:", error);
      }
    };

    const intervalId = setInterval(() => {
      setStatus((prev) => {
        if (prev !== 'LOADING') {
            clearInterval(intervalId);
            return prev;
        }
        pollStatus();
        return 'LOADING';
      });
    }, 2000);

    const timeoutId = setTimeout(() => {
      setStatus((prev) => {
        if (prev === 'LOADING') {
          return 'TIMEOUT';
        }
        return prev;
      });
    }, 30000);

    pollStatus();

    return () => {
      clearInterval(intervalId);
      clearTimeout(timeoutId);
    };
  }, [searchParams]);

  return (
    <div className="flex w-full flex-col items-center justify-center px-4">
      {status === 'LOADING' && (
        <StatusCard>
          <LoadingSpinner />
        </StatusCard>
      )}
      {status === 'ACTIVE' && <WelcomeSuccess {...welcome} />}
      {status === 'FAILED' && <FailureState />}
      {status === 'CANCELLED' && <CancelState />}
      {status === 'TIMEOUT' && <TimeoutState />}
    </div>
  );
}
