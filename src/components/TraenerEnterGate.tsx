'use client';

import { useCallback, useEffect, useRef, useState } from 'react';

export default function TraenerEnterGate({ children }: { children: React.ReactNode }) {
  const audioRef = useRef<HTMLAudioElement>(null);
  const [entered, setEntered] = useState(false);

  const enter = useCallback(() => {
    const audio = audioRef.current;
    if (audio) {
      audio.volume = 0.65;
      void audio.play().catch(() => {});
    }
    setEntered(true);
  }, []);

  useEffect(() => {
    if (entered) return;

    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Enter') enter();
    };

    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, [entered, enter]);

  return (
    <>
      <audio ref={audioRef} src="/ethereal.wav" preload="auto" playsInline />
      {children}

      <button
        type="button"
        onClick={enter}
        aria-label="Enter"
        className="fixed inset-0 z-50 flex cursor-pointer touch-manipulation items-center justify-center bg-white/45 backdrop-blur-xl motion-safe:transition-opacity motion-safe:duration-700 motion-safe:ease-out [-webkit-tap-highlight-color:transparent] dark:bg-black/55"
        style={{ opacity: entered ? 0 : 1, pointerEvents: entered ? 'none' : 'auto' }}
      >
        <span className="min-h-12 rounded-full border border-white/60 bg-white/70 px-10 py-3.5 text-sm font-semibold tracking-[0.65em] text-gray-700 uppercase shadow-[0_8px_32px_rgba(0,0,0,0.08)] backdrop-blur-md dark:border-white/15 dark:bg-gray-900/70 dark:text-gray-100 dark:shadow-[0_8px_32px_rgba(0,0,0,0.25)]">
          Enter
        </span>
      </button>
    </>
  );
}
