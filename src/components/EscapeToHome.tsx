'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';

/** Navigates home when Escape is pressed. */
export default function EscapeToHome() {
  const router = useRouter();

  useEffect(() => {
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key !== 'Escape') return;
      if (event.defaultPrevented) return;
      if (document.querySelector('dialog[open]')) return;
      router.push('/');
    };

    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, [router]);

  return null;
}
