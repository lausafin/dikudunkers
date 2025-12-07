// src/app/abonnement/page.tsx
import { cookies } from 'next/headers';
import pool from '@/lib/db';

// Disable caching so we always check the cookie
export const dynamic = 'force-dynamic';

export default async function SubscriptionPage() {
  const cookieStore = await cookies();
  const sessionToken = cookieStore.get('member_session')?.value;

  let memberData = null;

  // 1. Try to fetch member data if cookie exists
  if (sessionToken) {
    const result = await pool.query(
      `SELECT s.status, s.price_in_ore, s.membership_type, s.last_charged_at, m.name 
       FROM subscriptions s
       LEFT JOIN members m ON s.member_id = m.id
       WHERE s.access_token = $1`,
      [sessionToken]
    );
    memberData = result.rows[0];
  }

  // ---------------------------------------------------------
  // SCENARIO A: LOGGED IN (Show Personal Dashboard)
  // ---------------------------------------------------------
  if (memberData) {
    const price = (memberData.price_in_ore / 100).toLocaleString('da-DK');
    const lastPayment = memberData.last_charged_at 
      ? new Date(memberData.last_charged_at).toLocaleDateString('da-DK') 
      : 'Ingen betalinger endnu';

    const statusColors: Record<string, string> = {
      ACTIVE: 'text-green-600 bg-green-50 border-green-200',
      PENDING: 'text-yellow-600 bg-yellow-50 border-yellow-200',
      STOPPED: 'text-red-600 bg-red-50 border-red-200',
      EXPIRED: 'text-gray-600 bg-gray-50 border-gray-200',
      SUSPENDED: 'text-orange-600 bg-orange-50 border-orange-200',
    };
    const statusColor = statusColors[memberData.status as string] || statusColors.EXPIRED;

    return (
      <div className="container mx-auto max-w-xl py-12 px-4">
        <div className="bg-white border rounded-xl shadow-sm overflow-hidden">
          <div className="bg-gray-50 p-6 border-b text-center">
            <h1 className="text-2xl font-bold">
              Hej {memberData.name ? memberData.name.split(' ')[0] : 'Medlem'}!
            </h1>
            <p className="text-gray-500 text-sm mt-1">Her er dit medlemskab</p>
          </div>

          <div className="p-8 space-y-6">
            <div className={`p-4 rounded-lg border text-center ${statusColor}`}>
              <p className="text-sm font-semibold uppercase tracking-wider">Status</p>
              <p className="text-3xl font-bold mt-1">{memberData.status}</p>
            </div>

            <div className="space-y-4">
              <div className="flex justify-between border-b pb-2">
                <span className="text-gray-600">Type</span>
                <span className="font-medium capitalize">{memberData.membership_type}</span>
              </div>
              <div className="flex justify-between border-b pb-2">
                <span className="text-gray-600">Pris</span>
                <span className="font-medium">{price} DKK / halvår</span>
              </div>
              <div className="flex justify-between border-b pb-2">
                <span className="text-gray-600">Sidst betalt</span>
                <span className="font-medium">{lastPayment}</span>
              </div>
            </div>

            <div className="mt-8 pt-4 text-center">
               <p className="text-sm text-gray-500 mb-2">Opsigelse sker via MobilePay:</p>
               {/* NEW (Fixed) */}
              <p className="text-xs text-gray-400">
                Menu &rarr; Aftaler &rarr; DIKU Dunkers &rarr; Afslut aftale
              </p>
            </div>
          </div>
        </div>
      </div>
    );
  }

  // ---------------------------------------------------------
  // SCENARIO B: NOT LOGGED IN (Show Generic Help)
  // ---------------------------------------------------------
  return (
    <div className="container mx-auto max-w-2xl py-12 px-4">
      <div className="bg-white border rounded-lg p-8 shadow-sm text-center">
        <h1 className="text-3xl font-bold mb-6">Mit Medlemskab</h1>
        <div className="space-y-6 text-lg text-gray-700">
          <p>DIKU Dunkers bruger <strong>MobilePay</strong> til administration.</p>
          <p>For at se eller opsige dit medlemskab, skal du åbne din MobilePay-app og finde aftalen under "Aftaler".</p>
        </div>
      </div>
    </div>
  );
}