// src/types/global.d.ts
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