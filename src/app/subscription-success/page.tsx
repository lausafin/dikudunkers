// src/app/subscription-success/page.tsx
import { Suspense } from 'react';
import SubscriptionSuccessClient from './SubscriptionSuccessClient';

export default function SubscriptionSuccessPage() {
  return (
    <div className="text-center">
      {/* Suspense sørger for, at serveren kan rendere en fallback,
          mens den venter på client-komponenten */}
      <Suspense fallback={<p>Indlæser...</p>}>
        <SubscriptionSuccessClient />
      </Suspense>
    </div>
  );
} 