// src/app/subscription-success/page.tsx
import { Suspense } from 'react';
import SubscriptionSuccessClient from './SubscriptionSuccessClient';
import LoadingSpinner from '@/components/LoadingSpinner'; // <-- Importer den delte komponent

export default function SubscriptionSuccessPage() {
  return (
    <div className="text-center">
      <Suspense fallback={<LoadingSpinner />}> {/* <-- Brug den her */}
        <SubscriptionSuccessClient />
      </Suspense>
    </div>
  );
}