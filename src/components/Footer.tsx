import Link from 'next/link';
import VedtaegterDialog from '@/components/VedtaegterDialog';
import { getVedtaegter } from '@/lib/vedtaegter';

export default async function Footer() {
  const vedtaegter = await getVedtaegter();

  return (
    <footer className="bg-gray-100 dark:bg-gray-900 p-8 text-center text-sm text-gray-600 dark:text-gray-400">
      <div className="space-y-2">
        <p className="font-bold">DIKU Dunkers</p>
        <p>CVR: 45518833</p>
        <p>Universitetsparken 1, 2100 København Ø</p>
        <p>Telefon: +45 55 60 47 71</p>
        <p>Email: info@dikudunkers.dk</p>
        <div className="flex flex-wrap items-center justify-center gap-x-4 gap-y-2 pt-4">
          <Link href="/salgsbetingelser" className="underline hover:text-black dark:hover:text-white">
            Læs vores salgsbetingelser
          </Link>
          <VedtaegterDialog doc={vedtaegter} />
        </div>
      </div>
    </footer>
  );
}
