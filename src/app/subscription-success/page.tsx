import { Suspense } from 'react';
import BackgroundBlobs from '@/components/BackgroundBlobs';
import SubscriptionSuccessClient from './SubscriptionSuccessClient';
import LoadingSpinner from '@/components/LoadingSpinner';

export default function SubscriptionSuccessPage() {
  return (
    <div className="relative flex min-h-[70vh] items-center justify-center py-12">
      <BackgroundBlobs />
      <Suspense fallback={<LoadingSpinner />}>
        <SubscriptionSuccessClient />
      </Suspense>
    </div>
  );
}
