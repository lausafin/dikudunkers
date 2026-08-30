import SubscribeButton from '@/components/SubscribeButton';
import { isVippsTestEnv, KAMPHOLD_LEGACY_TEST } from '@/lib/memberships';

export const dynamic = 'force-dynamic';

export default function TestOldKampholdPage() {
  const isTestVipps = isVippsTestEnv();

  if (!isTestVipps) {
    return (
      <div className="container mx-auto max-w-lg py-16 text-center">
        <h1 className="text-2xl font-bold">Ikke tilgængelig</h1>
        <p className="mt-3 text-gray-600">
          Denne testside virker kun mod MobilePay test-API.
        </p>
      </div>
    );
  }

  return (
    <div className="container mx-auto max-w-lg py-16">
      <p className="mb-2 text-center text-xs font-semibold uppercase tracking-wide text-orange-700">
        Test · gammel pris
      </p>
      <h1 className="mb-8 text-center text-3xl font-bold">Kamphold 350 kr</h1>
      <div className="flex flex-col rounded-2xl border border-white/50 bg-white/60 p-8 shadow-[0_8px_32px_rgba(0,0,0,0.06)] backdrop-blur-xl dark:border-white/10 dark:bg-gray-900/60">
        <h2 className="text-2xl font-semibold dark:text-gray-100">Kamphold</h2>
        <p className="my-2 text-xl font-bold dark:text-gray-200">{KAMPHOLD_LEGACY_TEST.displayName}</p>
        <p className="mb-6 text-gray-600 dark:text-gray-400">
          Testaftale til 350 kr, så cron-jobbet kan opdatere den til 450 kr.
        </p>
        <SubscribeButton membership={KAMPHOLD_LEGACY_TEST} />
      </div>
    </div>
  );
}
