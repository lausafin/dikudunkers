import { Outfit } from 'next/font/google';

const outfit = Outfit({ subsets: ['latin'] });

const faqs = [
  {
    question: 'Må jeg spille med, selvom jeg ikke er studerende eller tilknyttet til Datalogisk Institut?',
    answer:
      'Ja, vores forening er åben for alle, studerende eller ej, og uanset alder eller niveau. Kom forbi os og prøv en gratis træning!',
  },
  {
    question: 'Hvad skal jeg have med?',
    answer:
      'Medbring gerne træningstøj og indendørssko samt eventuelt egen bold.',
  },
  {
    question: 'Spiller I kampe eller turneringer?',
    answer:
      'Ja, vi har ét hold tilmeldt Serie 1 i DBBF, som spiller kampe mod andre klubber i Hovedstaden',
  },
] as const;

export default function FaqSection() {
  return (
    <section className="mx-auto mt-20 w-full max-w-3xl" aria-labelledby="faq-heading">
      <h2
        id="faq-heading"
        className="mb-6 text-center text-2xl font-bold drop-shadow-sm dark:text-gray-100"
      >
        Ofte stillede spørgsmål
      </h2>

      <div className="overflow-hidden rounded-2xl border border-white/50 bg-white/60 shadow-[0_8px_32px_rgba(0,0,0,0.06)] backdrop-blur-xl dark:border-white/10 dark:bg-gray-900/60 dark:shadow-[0_8px_32px_rgba(0,0,0,0.2)]">
        {faqs.map((faq, index) => (
          <details
            key={faq.question}
            className="group border-b border-gray-200/50 last:border-b-0 dark:border-white/10"
          >
            <summary className="flex cursor-pointer list-none items-start gap-4 px-6 py-5 transition-colors hover:bg-white/40 dark:hover:bg-white/5 [&::-webkit-details-marker]:hidden">
              <span
                className={`${outfit.className} mt-0.5 flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-gray-900/5 text-xs font-bold tabular-nums text-gray-500 dark:bg-white/10 dark:text-gray-400`}
                aria-hidden
              >
                {String(index + 1).padStart(2, '0')}
              </span>
              <span
                className={`${outfit.className} min-w-0 flex-1 text-left text-base font-semibold leading-snug text-gray-900 dark:text-gray-100`}
              >
                {faq.question}
              </span>
              <span
                className="mt-0.5 flex h-7 w-7 shrink-0 items-center justify-center rounded-full border border-gray-200/70 text-gray-400 transition-transform duration-200 group-open:rotate-45 dark:border-white/15 dark:text-gray-500"
                aria-hidden
              >
                <svg viewBox="0 0 16 16" className="h-3.5 w-3.5" fill="none" stroke="currentColor" strokeWidth="2">
                  <path d="M8 3v10M3 8h10" strokeLinecap="round" />
                </svg>
              </span>
            </summary>
            <div className="px-6 pb-5 pl-[4.25rem] pr-14">
              <p className="text-[15px] leading-relaxed text-gray-600 dark:text-gray-400">
                {faq.answer}
              </p>
            </div>
          </details>
        ))}
      </div>
    </section>
  );
}
