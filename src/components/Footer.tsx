// components/Footer.tsx
import Link from 'next/link';

const Footer = () => {
  return (
    <footer className="bg-gray-100 p-8 text-center text-sm text-gray-600">
      <div className="space-y-2">
        <p className="font-bold">Min Virksomhed ApS</p>
        <p>CVR: 12345678</p>
        <p>Gadevej 123, 8000 Aarhus C</p>
        <p>Telefon: +45 12 34 56 78</p>
        <p>Email: kontakt@minvirksomhed.dk</p>
        <div className="pt-4">
          <Link href="/salgsbetingelser" className="underline hover:text-black">
            Læs vores salgsbetingelser
          </Link>
        </div>
      </div>
    </footer>
  );
};

export default Footer;