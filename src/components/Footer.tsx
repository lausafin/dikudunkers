// components/Footer.tsx
import Link from 'next/link';

const Footer = () => {
  return (
    <footer className="bg-gray-100 p-8 text-center text-sm text-gray-600">
      <div className="space-y-2">
        <p className="font-bold">DIKU Dunkers</p>
        <p>CVR: 45518833</p>
        <p>Universitetsparken 1, 2100 København Ø</p>
        <p>Telefon: +45 55 60 47 71</p>
        <p>Email: info@dikudunkers.dk</p>
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