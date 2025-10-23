// src/app/subscription-success/SubscriptionSuccessClient.tsx
'use client';

import { useEffect } from 'react';

export default function SubscriptionSuccessClient() {
  // Når komponenten indlæses, fjerner vi agreementId fra sessionStorage,
  // da det ikke længere skal bruges.
  useEffect(() => {
    sessionStorage.removeItem('vippsAgreementId');
  }, []);

  // Vis en simpel, pålidelig takke-besked.
  // Vi forsøger ikke længere at gætte backend-status.
  return (
    <div>
      <h1 className="text-2xl font-bold text-green-600">Tak for din tilmelding!</h1>
      <p className="mt-2">Din betaling er modtaget, og vi er ved at oprette dit medlemskab.</p>
      <p className="mt-1">Du vil modtage en bekræftelse på e-mail inden for et par minutter, så snart alt er klar.</p>
      <p className="mt-4 text-sm text-gray-600">Du kan roligt lukke dette vindue.</p>
    </div>
  );
}