import SubscribeButton from '@/components/SubscribeButton';
import pool from '@/lib/db';
import { Outfit } from 'next/font/google';

const outfit = Outfit({ subsets: ['latin'] });

const memberships = {
  haladgang: {
    type: 'Haladgang',
    priceInOre: 15000,
    displayName: '150 DKK / halvår',
    productName: 'Haladgang',
    description: 'Adgang til træning og faciliteter. Perfekt for motionister.'
  },
  kamphold: {
    type: 'Kamphold',
    priceInOre: 35000,
    displayName: '350 DKK / halvår',
    productName: 'Kamphold',
    description: 'Deltagelse i kampe, stævner og fuld adgang til træning.'
  }
} as const;

export const dynamic = 'force-dynamic'; // Ensures this page is rendered dynamically
export const revalidate = 60; // Cache the page for 60 seconds (ISR)

async function getActiveMembers() {
  try {
    const result = await pool.query(`
      SELECT m.name, s.membership_type, m.created_at
      FROM members m
      JOIN subscriptions s ON m.id = s.member_id
      WHERE s.status = 'ACTIVE'
      ORDER BY m.created_at ASC
    `);
    
    return result.rows.map(row => {
      const parts = row.name.trim().split(/\s+/);
      let displayName = row.name;

      if (parts.length > 1) {
        const first = parts[0];
        const last = parts[parts.length - 1];
        const middles = parts.slice(1, -1);
        
        const rest = [...middles, last]
          .map(part => `${part[0]}.`)
          .join(' ');
          
        displayName = `${first} ${rest}`;
      }

      let formattedDate = '';
      if (row.created_at) {
        formattedDate = new Date(row.created_at).toLocaleDateString('da-DK', {
          day: 'numeric',
          month: 'short',
          year: 'numeric'
        });
      }

      return {
        name: displayName,
        membershipType: row.membership_type,
        createdAt: formattedDate
      };
    });
  } catch (error) {
    console.error("Fejl ved hentning af medlemmer:", error);
    return [];
  }
}

export default async function HomePage() {
  const activeMembers = await getActiveMembers();

  return (
    <div className="relative min-h-screen">
      {/* Decorative gradient background blobs to make the glass effect pop */}
      <div className="fixed inset-0 -z-10 overflow-hidden pointer-events-none">
        <div className="absolute -top-[20%] -left-[10%] w-[60%] h-[60%] rounded-full bg-orange-400/20 blur-[120px] mix-blend-multiply dark:mix-blend-screen" />
        <div className="absolute top-[30%] -right-[10%] w-[50%] h-[50%] rounded-full bg-emerald-400/20 blur-[120px] mix-blend-multiply dark:mix-blend-screen" />
        <div className="absolute -bottom-[20%] left-[20%] w-[60%] h-[60%] rounded-full bg-blue-400/20 blur-[120px] mix-blend-multiply dark:mix-blend-screen" />
      </div>

      <div className="container mx-auto relative z-10 py-12">
        <h1 className="text-4xl font-bold mb-4 text-center dark:text-gray-100 drop-shadow-sm">Velkommen til DIKU Dunkers!</h1>
        <p className="mb-12 text-center text-lg text-gray-700 dark:text-gray-300">Vælg dit medlemskab for at komme i gang.</p>
        
        <div className="flex flex-col md:flex-row justify-center gap-8 mb-20">
          {/* Haladgang Membership Card */}
          <div className="border border-white/50 dark:border-white/10 rounded-2xl p-8 max-w-sm w-full flex flex-col bg-white/60 dark:bg-gray-900/60 backdrop-blur-xl shadow-[0_8px_32px_rgba(0,0,0,0.06)] dark:shadow-[0_8px_32px_rgba(0,0,0,0.2)]">
            <h2 className="text-2xl font-semibold dark:text-gray-100">Haladgang</h2>
            <p className="text-xl font-bold my-2 dark:text-gray-200">{memberships.haladgang.displayName}</p>
            <p className="mb-6 flex-grow text-gray-600 dark:text-gray-400">{memberships.haladgang.description}</p>
            <SubscribeButton membership={memberships.haladgang} />
          </div>

          {/* Kamphold Membership Card */}
          <div className="border border-white/50 dark:border-white/10 rounded-2xl p-8 max-w-sm w-full flex flex-col bg-white/60 dark:bg-gray-900/60 backdrop-blur-xl shadow-[0_8px_32px_rgba(0,0,0,0.06)] dark:shadow-[0_8px_32px_rgba(0,0,0,0.2)]">
            <h2 className="text-2xl font-semibold dark:text-gray-100">Kamphold</h2>
            <p className="text-xl font-bold my-2 dark:text-gray-200">{memberships.kamphold.displayName}</p>
            <p className="mb-6 flex-grow text-gray-600 dark:text-gray-400">{memberships.kamphold.description}</p>
            <SubscribeButton membership={memberships.kamphold} />
          </div>
        </div>

        <div className="max-w-3xl mx-auto w-full">
          <h2 className="text-2xl font-bold mb-6 text-center dark:text-gray-100 drop-shadow-sm">Aktive Medlemmer</h2>
          {activeMembers.length > 0 ? (
            <div className="border border-white/50 dark:border-white/10 rounded-2xl overflow-hidden bg-white/60 dark:bg-gray-900/60 backdrop-blur-xl shadow-[0_8px_32px_rgba(0,0,0,0.06)] dark:shadow-[0_8px_32px_rgba(0,0,0,0.2)]">
              <div className="overflow-x-auto">
                <table className="min-w-full text-left border-collapse">
                  <tbody className="divide-y divide-gray-200/50 dark:divide-gray-700/50">
                    {activeMembers.map((member, i) => (
                      <tr key={i} className="hover:bg-white/40 dark:hover:bg-white/5 transition-colors">
                        <td className={`py-5 px-8 text-gray-900 dark:text-gray-100 font-medium ${outfit.className} text-lg tracking-wide`}>{member.name}</td>
                        <td className="py-5 px-8 text-gray-700 dark:text-gray-300">
                          <span className={`inline-flex items-center px-3 py-1 rounded-full text-xs font-semibold ${
                            member.membershipType.toLowerCase().includes('kamp') 
                              ? 'bg-orange-100/80 text-orange-900 dark:bg-orange-500/20 dark:text-orange-200 border border-orange-200/50 dark:border-orange-500/30' 
                              : 'bg-emerald-100/80 text-emerald-900 dark:bg-emerald-500/20 dark:text-emerald-200 border border-emerald-200/50 dark:border-emerald-500/30'
                          }`}>
                            {member.membershipType}
                          </span>
                        </td>
                        <td className="py-5 px-8 text-gray-500 dark:text-gray-400 text-sm whitespace-nowrap text-right">Siden {member.createdAt}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          ) : (
            <div className="text-center p-12 border border-white/50 dark:border-white/10 rounded-2xl bg-white/60 dark:bg-gray-900/60 backdrop-blur-xl shadow-[0_8px_32px_rgba(0,0,0,0.06)] dark:shadow-[0_8px_32px_rgba(0,0,0,0.2)] text-gray-600 dark:text-gray-400">
              <p className="text-lg font-medium">Der er ingen aktive medlemmer at vise endnu.</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
