// src/app/layout.tsx
import './globals.css';
import { Inter } from 'next/font/google';
import Footer from '@/components/Footer';
import Script from 'next/script'; // 1. Importer Script-komponenten

const inter = Inter({ subsets: ['latin'] });

export const metadata = {
  title: 'DIKU Dunkers Medlemskab', // Opdateret titel for relevans
  description: 'Bliv medlem af DIKU Dunkers basketballklub.',
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="da">
      <head>
        {/* 2. Tilføj scriptet her i <head>. 
            'beforeInteractive' sikrer, at scriptet er klar, før brugeren kan interagere med siden. */}
        <Script
          src="https://checkout.vipps.no/checkout-button/v1/vipps-checkout-button.js"
          strategy="beforeInteractive"
        />
      </head>
      <body className={inter.className} suppressHydrationWarning={true}>
        <main className="min-h-screen p-8">{children}</main>
        <Footer />
      </body>
    </html>
  );
}