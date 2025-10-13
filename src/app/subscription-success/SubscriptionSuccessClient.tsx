// src/app/subscription-success/SubscriptionSuccessClient.tsx
'use client'; // <-- Meget vigtigt!

import { useEffect, useState } from 'react';
import { useSearchParams } from 'next/navigation';

export default function SubscriptionSuccessClient() {
  const [status, setStatus] = useState<'LOADING' | 'ACTIVE' | 'PENDING' | 'FAILED'>('LOADING');
  
  // Vipps kan tilføje query params, dem kan vi logge
  const searchParams = useSearchParams();
  
  useEffect(() => {
    console.log('Redirect params from Vipps:', Object.fromEntries(searchParams.entries()));

    const agreementId = sessionStorage.getItem('vippsAgreementId');
    if (!agreementId) {
      setStatus('FAILED');
      return;
    }

    // Polling-funktion til at tjekke status
    const pollStatus = async () => {
      try {
        const response = await fetch(`/api/recurring/get-status?agreementId=${agreementId}`);
        const data = await response.json();

        if (data.status === 'ACTIVE') {
          setStatus('ACTIVE');
          clearInterval(intervalId); // Stop polling
          sessionStorage.removeItem('vippsAgreementId');
        } else if (data.status === 'STOPPED' || data.status === 'EXPIRED') {
          setStatus('FAILED');
          clearInterval(intervalId);
          sessionStorage.removeItem('vippsAgreementId');
        } else {
          setStatus('PENDING'); // Stadig PENDING, fortsæt polling
        }
      } catch (error) {
        console.error("Polling failed:", error);
        setStatus('FAILED');
        clearInterval(intervalId);
      }
    };

    // Start polling med det samme
    pollStatus();
    const intervalId = setInterval(pollStatus, 3000);
    
    // Sæt en timeout på 30 sekunder
    const timeoutId = setTimeout(() => {
      clearInterval(intervalId);
      // Kun opdater til FAILED hvis den stadig venter
      setStatus(currentStatus => 
        currentStatus === 'PENDING' || currentStatus === 'LOADING' ? 'FAILED' : currentStatus
      );
    }, 30000);

    // Ryd op når component unmounts
    return () => {
      clearInterval(intervalId);
      clearTimeout(timeoutId);
    };
    // Denne hook skal kun køre én gang ved mount for at starte polling-processen.
    // Vi logger searchParams, men den ændrer sig ikke efter mount, så vi kan ignorere ESLint her.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // UI baseret på status
  if (status === 'LOADING') return <p>Bekræfter abonnement, vent venligst...</p>;
  if (status === 'PENDING') return <p>Behandler stadig... Et øjeblik.</p>;

  if (status === 'ACTIVE') {
    return (
      <div>
        <h1 className="text-2xl font-bold text-green-600">Abonnement Aktivt!</h1>
        <p>Tak! Du er nu tilmeldt. Du kan se og administrere din aftale i din MobilePay-app.</p>
      </div>
    );
  }

  if (status === 'FAILED') {
    return (
      <div>
        <h1 className="text-2xl font-bold text-red-600">Noget gik galt</h1>
        <p>Vi kunne desværre ikke aktivere dit abonnement. Prøv venligst igen.</p>
      </div>
    );
  }

  return null;
}