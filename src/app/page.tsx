// app/page.tsx
import SubscribeButton from '@/components/SubscribeButton';

export default function HomePage() {
  return (
    <div className="container mx-auto">
      <h1 className="text-4xl font-bold mb-4">Velkommen til DIKU Dunkers!</h1>
      <p className="mb-8">Her kan du bestille dit medlemskab.</p>
      
      {/* Eksempel på et produkt */}
      <div className="border rounded-lg p-6 max-w-sm">
        <h2 className="text-2xl font-semibold">Medlemskab</h2>
        <p className="text-lg my-2">Pris: 350 DKK</p>
        <p className="mb-4">Dette er en kort beskrivelse af, hvorfor dette medlemskab er det bedste, du nogensinde vil købe.</p>
        <SubscribeButton />
      </div>
    </div>
  );
}