// app/layout.tsx
import './globals.css';
import { Inter } from 'next/font/google';
import Footer from '@/components/Footer'; // Vi laver denne om lidt

const inter = Inter({ subsets: ['latin'] });

export const metadata = {
  title: 'Min Fantastiske Webshop',
  description: 'Vi sælger fantastiske ting',
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="da">
      <body className={inter.className} suppressHydrationWarning={true}>
        <main className="min-h-screen p-8">{children}</main>
        <Footer />
      </body>
    </html>
  );
}