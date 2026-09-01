import BackgroundBlobs from '@/components/BackgroundBlobs';
import NewSeasonBanner from '@/components/NewSeasonBanner';
import SubscribeButton from '@/components/SubscribeButton';
import TraenerEnterGate from '@/components/TraenerEnterGate';
import { MEMBERSHIP_DISPLAY } from '@/lib/memberships';

export const dynamic = 'force-dynamic';

const membership = MEMBERSHIP_DISPLAY.traener;

export default function TraenerPage() {
  return (
    <TraenerEnterGate>
      <div className="relative min-h-screen">
        <BackgroundBlobs />

        <div className="container relative z-10 mx-auto max-w-sm px-4 py-10 sm:px-0 sm:py-16">
          <h1 className="mb-8 text-center text-3xl font-bold drop-shadow-sm dark:text-gray-100">Træner</h1>
          <div className="flex flex-col overflow-hidden rounded-2xl border border-white/50 bg-white/60 shadow-[0_8px_32px_rgba(0,0,0,0.06)] backdrop-blur-xl dark:border-white/10 dark:bg-gray-900/60 dark:shadow-[0_8px_32px_rgba(0,0,0,0.2)]">
            <NewSeasonBanner accent="yellow" />
            <div className="flex flex-col p-6 sm:p-8">
              <h2 className="text-2xl font-semibold dark:text-gray-100">{membership.productName}</h2>
              <p className="my-2 text-xl font-bold dark:text-gray-200">{membership.displayName}</p>
              <p className="mb-4 whitespace-pre-line text-[13px] italic leading-relaxed text-gray-500/80 dark:text-gray-400/70">
                {`Hej Anders,
Jeg glæder mig til, at vi får et rigtig fedt sæson sammen. Tak for at være vores coach <3`}
              </p>
              <p className="mb-6 text-gray-600 dark:text-gray-400">{membership.description}</p>
              <SubscribeButton membership={membership} />
            </div>
          </div>
        </div>
      </div>
    </TraenerEnterGate>
  );
}
