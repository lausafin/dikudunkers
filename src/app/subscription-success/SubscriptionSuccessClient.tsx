// src/app/subscription-success/SubscriptionSuccessClient.tsx
'use client';

import { useEffect, useState } from 'react';

export default function SubscriptionSuccessClient() {
  const [status, setStatus] = useState<'LOADING' | 'PENDING' | 'ACTIVE' | 'FAILED'>('LOADING');
  
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

        // Når status er endelig, stopper vi.
        if (data.status === 'ACTIVE' || data.status === 'STOPPED' || data.status === 'EXPIRED') {
          setStatus(data.status === 'ACTIVE' ? 'ACTIVE' : 'FAILED');
          clearInterval(intervalId);
          clearTimeout(timeoutId); // Ryd også timeouten
          sessionStorage.removeItem('vippsAgreementId');
        } else {
          // Ellers er den stadig PENDING
          setStatus('PENDING');
        }
      } catch (error) {
        console.error("Polling failed:", error);
        setStatus('FAILED');
        clearInterval(intervalId);
        clearTimeout(timeoutId);
      }
    };

    // Start polling med det samme, og derefter hvert 3. sekund.
    pollStatus();
    const intervalId = setInterval(pollStatus, 3000);
    
    // 1. FORØGET TIMEOUT: Vi giver backend'en op til 90 sekunder (op fra 30).
    // Dette er rigelig tid til at håndtere selv de langsomste cold starts.
    const timeoutId = setTimeout(() => {
      clearInterval(intervalId);
      setStatus(currentStatus => 
        currentStatus === 'PENDING' || currentStatus === 'LOADING' ? 'FAILED' : currentStatus
      );
    }, 90000); // 90 sekunder

    // Ryd op, når komponenten forsvinder (f.eks. hvis brugeren navigerer væk).
    return () => {
      clearInterval(intervalId);
      clearTimeout(timeoutId);
    };
  }, []);

  // 2. FORBEDRET BRUGERFEEDBACK:
  // Vi giver brugeren en mere informativ besked, mens de venter.
  if (status === 'LOADING') {
    return <p>Forbinder og verificerer din betaling...</p>;
  }
  
  if (status === 'PENDING') {
    return (
      <div>
        <h1 className="text-2xl font-bold">Bekræftelse modtaget!</h1>
        <p className="mt-2">Vi er ved at oprette dit medlemskab. Dette kan tage op til et minut.</p>
        <p>Du kan roligt lukke dette vindue, hvis du ønsker det - vi har modtaget din betaling.</p>
      </div>
    );
  }

  if (status === 'ACTIVE') {
    return (
      <div>
        <h1 className="text-2xl font-bold text-green-600">Velkommen til DIKU Dunkers!</h1>
        <p>Dit medlemskab er nu aktivt. Vi har sendt en bekræftelse til din e-mail.</p>
      </div>
    );
  }

  // Gælder for FAILED, STOPPED, EXPIRED
  if (status === 'FAILED') {
    return (
      <div>
        <h1 className="text-2xl font-bold text-red-600">Noget gik galt</h1>
        <p>Vi kunne desværre ikke aktivere dit abonnement. Prøv venligst igen, eller kontakt os, hvis problemet fortsætter.</p>
      </div>
    );
  }

  return null;
}