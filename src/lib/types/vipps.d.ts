// src/lib/types/vipps.d.ts
declare namespace JSX {
  interface IntrinsicElements {
    'vipps-mobilepay-button': React.DetailedHTMLProps<React.HTMLAttributes<HTMLElement> & {
      brand?: 'vipps' | 'mobilepay';
      language?: 'en' | 'no' | 'fi' | 'dk' | 'sv';
      variant?: 'primary' | 'dark' | 'light';
      rounded?: string; // 'true' or 'false'
      verb?: 'buy' | 'pay' | 'login' | 'register' | 'continue' | 'confirm' | 'donate';
      stretched?: string; // 'true' or 'false'
      branded?: string; // 'true' or 'false'
      loading?: string; // 'true' or 'false'
    }, HTMLElement>;
  }
}