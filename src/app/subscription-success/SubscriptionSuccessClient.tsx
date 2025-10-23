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
        <h1 className="text-2xl font-bold text-green-600">Velkommen til DIKU Dunkers!</h1>
        <p>Dit medlemskab er nu aktivt. Vi har sendt en bekræftelse til din e-mail.</p>
        <p className="mt-4 text-sm text-gray-600">Du kan roligt lukke dette vindue.</p>
      </div>
  );
}