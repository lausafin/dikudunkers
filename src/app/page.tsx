// app/page.tsx
export default function HomePage() {
  return (
    <div className="container mx-auto">
      <h1 className="text-4xl font-bold mb-4">Velkommen til Min Webshop</h1>
      <p className="mb-8">Her kan du købe vores fantastiske produkt.</p>
      
      {/* Eksempel på et produkt */}
      <div className="border rounded-lg p-6 max-w-sm">
        <h2 className="text-2xl font-semibold">Fantastisk Produkt</h2>
        <p className="text-lg my-2">Pris: 299 DKK</p>
        <p className="mb-4">Dette er en kort beskrivelse af, hvorfor dette produkt er det bedste, du nogensinde vil købe.</p>
        <button className="bg-blue-600 text-white font-bold py-2 px-4 rounded hover:bg-blue-700">
          Køb nu (Integration kommer snart)
        </button>
      </div>
    </div>
  );
}