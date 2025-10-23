/// <reference path="../lib/types/vipps.d.ts" />

'use client';

import { useState } from 'react';

declare namespace JSX {
  interface IntrinsicElements {
    'vipps-mobilepay-button': React.DetailedHTMLProps<React.HTMLAttributes<HTMLElement> & {
      brand?: 'vipps' | 'mobilepay';
      language?: 'en' | 'no' | 'fi' | 'dk' | 'sv';
      variant?: 'primary' | 'dark' | 'light';
      rounded?: string;
      verb?: 'buy' | 'pay' | 'login' | 'register' | 'continue' | 'confirm' | 'donate';
      stretched?: string;
      branded?: string;
      loading?: string;
    }, HTMLElement>;
  }
}