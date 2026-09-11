import BackgroundBlobs from '@/components/BackgroundBlobs';
import EscapeToHome from '@/components/EscapeToHome';
import Link from 'next/link';
import type { ReactNode } from 'react';
import { Outfit } from 'next/font/google';

const outfit = Outfit({ subsets: ['latin'] });

function MailLink({ address }: { address: string }) {
  return (
    <a
      href={`mailto:${address}`}
      className="font-medium text-gray-900 underline decoration-gray-300 underline-offset-2 transition-colors hover:decoration-gray-900 dark:text-gray-100 dark:decoration-gray-600 dark:hover:decoration-gray-200"
    >
      {address}
    </a>
  );
}

const sections: { title: string; body: ReactNode }[] = [
  {
    title: 'Betaling',
    body: 'DIKU Dunkers modtager online betalinger med MobilePay. Betaling vil først blive trukket på din konto, når den fysiske vare afsendes eller det virtuelle produkt er oprettet, med mindre andet er aftalt.',
  },
  {
    title: 'Fortrydelsesret',
    body: 'Der gives 14 dages fuld returret på varer købt på hjemmesiden, medmindre andet er aftalt eller fremgår af din ordre. Den 14 dages periode starter den dag, hvor ordren er leveret. Eventuelle returneringsomkostninger afholder du selv.',
  },
  {
    title: 'Returnering',
    body: (
      <>
        Ønske om returnering skal meddeles os senest 14 dage efter leveringen og være os i hænde senest 14 dage efter, vi er informeret om dit brug af fortrydelsesretten. Ønske om brug af fortrydelsesret skal sendes på mail{' '}
        <MailLink address="dikudunkers@di.ku.dk" />.
      </>
    ),
  },
  {
    title: 'Klagehåndtering',
    body: (
      <>
        Hvis du har en klage over et produkt købt i vores webshop, kan der sendes en klage til: DIKU Dunkers, Universitetsparken 1, 2100 København Ø, email:{' '}
        <MailLink address="dikudunkers@di.ku.dk" />. Hvis det ikke lykkes os at finde en løsning, kan du sende en klage til Center for Klageløsning, Nævnenes Hus, Toldboden 2, 8800 Viborg.
      </>
    ),
  },
];

export default function SalgsbetingelserPage() {
  return (
    <div className="relative min-h-[70vh]">
      <EscapeToHome />
      <BackgroundBlobs />

      <div className="relative z-10 mx-auto max-w-3xl py-8">
        <Link
          href="/"
          className="mb-8 inline-flex text-sm font-medium text-gray-500 transition-colors hover:text-gray-900 dark:text-gray-400 dark:hover:text-white"
        >
          ← Tilbage
        </Link>

        <header className="mb-8 text-center">
          <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-gray-500 dark:text-gray-400">
            Juridisk
          </p>
          <h1
            className={`${outfit.className} mt-2 text-3xl font-bold text-gray-900 drop-shadow-sm dark:text-gray-100`}
          >
            Salgs- og leveringsbetingelser
          </h1>
          <p className="mt-3 text-gray-600 dark:text-gray-400">
            Gældende for køb foretaget på denne hjemmeside.
          </p>
        </header>

        <div className="overflow-hidden rounded-2xl border border-white/50 bg-white/60 shadow-[0_8px_32px_rgba(0,0,0,0.06)] backdrop-blur-xl dark:border-white/10 dark:bg-gray-900/60 dark:shadow-[0_8px_32px_rgba(0,0,0,0.2)]">
          {sections.map((section, index) => (
            <section
              key={section.title}
              className="border-b border-gray-200/50 px-6 pb-8 pt-8 last:border-b-0 dark:border-white/10 sm:px-8 sm:pb-9 sm:pt-9"
            >
              <div className="flex items-start gap-4">
                <span
                  className={`${outfit.className} mt-0.5 flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-gray-900/5 text-xs font-bold tabular-nums text-gray-500 dark:bg-white/10 dark:text-gray-400`}
                  aria-hidden
                >
                  {String(index + 1).padStart(2, '0')}
                </span>
                <div className="min-w-0">
                  <h2
                    className={`${outfit.className} text-lg font-semibold text-gray-900 dark:text-gray-100`}
                  >
                    {section.title}
                  </h2>
                  <p className="mt-3 text-[15px] leading-relaxed text-gray-600 dark:text-gray-400">
                    {section.body}
                  </p>
                </div>
              </div>
            </section>
          ))}
        </div>
      </div>
    </div>
  );
}
