// components/Footer.tsx
import Link from 'next/link';

const Footer = () => {
  return (
    <footer className="bg-gray-100 p-8 text-center text-sm text-gray-600">
      <div className="space-y-2">
        <p className="font-bold">DIKU Dunkers</p>
        <p>CVR: 45518833</p>
        <p>dikudunkers@di.ku.dk</p>
        <p>Telefon: +45 31 60 19 22</p>
        <p>Email: dikudunkers@di.ku.dk</p>
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