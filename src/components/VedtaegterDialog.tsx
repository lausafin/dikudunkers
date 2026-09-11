'use client';

import { useEffect, useId, useRef, useState } from 'react';
import { Outfit } from 'next/font/google';
import type { VedtaegterDoc } from '@/lib/vedtaegter';
import { VEDTAEGTER_SOURCE_URL } from '@/lib/vedtaegter';

const outfit = Outfit({ subsets: ['latin'] });

type BodyBlock =
  | { type: 'paragraph'; text: string }
  | { type: 'bullets'; items: string[] };

function parseBodyBlocks(body: string): BodyBlock[] {
  const blocks: BodyBlock[] = [];
  let paragraph: string[] = [];
  let bullets: string[] = [];

  const flushParagraph = () => {
    if (paragraph.length === 0) return;
    blocks.push({ type: 'paragraph', text: paragraph.join('\n') });
    paragraph = [];
  };

  const flushBullets = () => {
    if (bullets.length === 0) return;
    blocks.push({ type: 'bullets', items: bullets });
    bullets = [];
  };

  for (const rawLine of body.split('\n')) {
    const line = rawLine.trim();
    if (!line) {
      flushBullets();
      flushParagraph();
      continue;
    }

    const bullet = line.match(/^\*\s+(.*)$/);
    if (bullet) {
      flushParagraph();
      bullets.push(bullet[1]);
      continue;
    }

    flushBullets();
    paragraph.push(line);
  }

  flushBullets();
  flushParagraph();
  return blocks;
}

function SectionBody({ body }: { body: string }) {
  const blocks = parseBodyBlocks(body);

  return (
    <div className="mt-2 space-y-3 text-[15px] leading-relaxed text-gray-600 dark:text-gray-400">
      {blocks.map((block, index) =>
        block.type === 'bullets' ? (
          <ul key={index} className="list-disc space-y-1.5 pl-5 marker:text-gray-400 dark:marker:text-gray-500">
            {block.items.map((item, itemIndex) => (
              <li key={`${itemIndex}-${item}`}>{item}</li>
            ))}
          </ul>
        ) : (
          <p key={index} className="whitespace-pre-line">
            {block.text}
          </p>
        ),
      )}
    </div>
  );
}

export default function VedtaegterDialog({ doc }: { doc: VedtaegterDoc | null }) {
  const dialogRef = useRef<HTMLDialogElement>(null);
  const titleId = useId();
  const [open, setOpen] = useState(false);

  useEffect(() => {
    const dialog = dialogRef.current;
    if (!dialog) return;
    if (open && !dialog.open) dialog.showModal();
    if (!open && dialog.open) dialog.close();
  }, [open]);

  useEffect(() => {
    const dialog = dialogRef.current;
    if (!dialog) return;
    const onClose = () => setOpen(false);
    const onCancel = (event: Event) => {
      event.preventDefault();
      setOpen(false);
    };
    dialog.addEventListener('close', onClose);
    dialog.addEventListener('cancel', onCancel);
    return () => {
      dialog.removeEventListener('close', onClose);
      dialog.removeEventListener('cancel', onCancel);
    };
  }, []);

  useEffect(() => {
    if (!open) return;
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') setOpen(false);
    };
    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, [open]);

  return (
    <>
      <button
        type="button"
        onClick={() => setOpen(true)}
        className="underline hover:text-black dark:hover:text-white"
      >
        Læs vores vedtægter
      </button>

      <dialog
        ref={dialogRef}
        aria-labelledby={titleId}
        className="fixed inset-0 m-0 h-full max-h-none w-full max-w-none bg-transparent p-0 open:flex open:items-center open:justify-center open:backdrop:bg-black/55"
        onClick={(event) => {
          if (event.target === dialogRef.current) setOpen(false);
        }}
      >
        <div className="relative mx-4 my-8 flex max-h-[min(88vh,52rem)] w-full max-w-2xl flex-col overflow-hidden rounded-2xl border border-white/50 bg-white/95 text-left shadow-[0_8px_32px_rgba(0,0,0,0.18)] backdrop-blur-xl dark:border-white/10 dark:bg-gray-950/95">
          <div className="flex items-start justify-between gap-4 border-b border-gray-200/70 px-6 py-5 dark:border-white/10">
            <div className="min-w-0">
              <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-gray-500 dark:text-gray-400">
                Foreningen
              </p>
              <h2
                id={titleId}
                className={`${outfit.className} mt-1 text-xl font-bold text-gray-900 dark:text-white`}
              >
                {doc?.title ?? 'Vedtægter'}
              </h2>
              {doc?.meta?.length ? (
                <div className="mt-1 space-y-0.5 text-sm text-gray-500 dark:text-gray-400">
                  {doc.meta.map((line) => (
                    <p key={line}>{line}</p>
                  ))}
                </div>
              ) : null}
            </div>
            <button
              type="button"
              onClick={() => setOpen(false)}
              className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full border border-gray-200/80 text-gray-500 transition-colors hover:bg-gray-100 dark:border-white/15 dark:text-gray-400 dark:hover:bg-white/10"
              aria-label="Luk"
            >
              <svg viewBox="0 0 16 16" className="h-3.5 w-3.5" fill="none" stroke="currentColor" strokeWidth="2">
                <path d="M4 4l8 8M12 4l-8 8" strokeLinecap="round" />
              </svg>
            </button>
          </div>

          <div className="overflow-y-auto px-6 py-5">
            {doc ? (
              <div className="space-y-6">
                {doc.sections.map((section) => (
                  <section key={section.heading}>
                    <h3 className={`${outfit.className} text-base font-semibold text-gray-900 dark:text-gray-100`}>
                      {section.heading}
                    </h3>
                    <SectionBody body={section.body} />
                  </section>
                ))}

                {doc.closing.length > 0 ? (
                  <div className="border-t border-gray-200/70 pt-5 dark:border-white/10">
                    <div className="space-y-2 text-[15px] leading-relaxed text-gray-600 dark:text-gray-400">
                      {doc.closing.map((line, index) => (
                        <p key={`${index}-${line}`}>{line}</p>
                      ))}
                    </div>
                  </div>
                ) : null}
              </div>
            ) : (
              <div className="space-y-3 text-[15px] text-gray-600 dark:text-gray-400">
                <p>Vedtægterne kunne ikke hentes lige nu.</p>
                <a
                  href={VEDTAEGTER_SOURCE_URL}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex font-medium text-gray-900 underline dark:text-white"
                >
                  Åbn i Google Docs →
                </a>
              </div>
            )}
          </div>
        </div>
      </dialog>
    </>
  );
}
