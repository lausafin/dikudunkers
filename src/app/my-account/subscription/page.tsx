// src/app/my-account/subscription/page.tsx
'use client';

import { useEffect, useState } from 'react';

// Define a type for our subscription data
type Subscription = {
  status: string;
  vipps_agreement_id: string;
};

export default function SubscriptionManagementPage() {
  const [subscription, setSubscription] = useState<Subscription | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    // Fetch the user's subscription status from our own backend
    const fetchSubscription = async () => {
      setIsLoading(true);
      const response = await fetch('/api/user/subscription');
      if (response.ok) {
        const data = await response.json();
        setSubscription(data);
      }
      setIsLoading(false);
    };
    fetchSubscription();
  }, []);

  const handleCancel = async () => {
    if (subscription && confirm('Er du sikker på, at du vil opsige dit abonnement?')) {
      const response = await fetch('/api/recurring/stop-agreement', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ agreementId: subscription.vipps_agreement_id }),
      });

      if (response.ok) {
        setSubscription(prev => prev ? { ...prev, status: 'STOPPED' } : null);
        alert('Dit abonnement er nu opsagt.');
      } else {
        alert('Der skete en fejl. Prøv igen.');
      }
    }
  };

  if (isLoading) return <p>Indlæser abonnementsstatus...</p>;
  if (!subscription) return <p>Du har intet aktivt abonnement.</p>;

  return (
    <div>
      <h1 className="text-2xl font-bold">Dit Abonnement</h1>
      <p>Status: <span className="font-semibold">{subscription.status}</span></p>
      {subscription.status === 'ACTIVE' && (
        <button
          onClick={handleCancel}
          className="mt-4 bg-red-600 text-white font-bold py-2 px-4 rounded hover:bg-red-700"
        >
          Opsig Abonnement
        </button>
      )}
      {subscription.status === 'STOPPED' && (
        <p className="mt-4 text-gray-600">Dit abonnement er opsagt.</p>
      )}
    </div>
  );
}