// app/salgsbetingelser/page.tsx
export default function SalgsbetingelserPage() {
  return (
    <div className="container mx-auto prose">
      <h1>Salgs- og leveringsbetingelser</h1>
      <p>Gældende for køb foretaget på denne hjemmeside.</p>

      <h2>Betaling</h2>
      <p>
        DIKU Dunkers modtager online betalinger med MobilePay.
        Betaling vil først blive trukket på din konto, når den fysiske vare afsendes eller det virtuelle produkt er oprettet, med mindre andet er aftalt.
      </p>

      <h2>Fortrydelsesret</h2>
      <p>
        Der gives 14 dages fuld returret på varer købt på hjemmesiden, medmindre andet er aftalt eller fremgår af din ordre. Den 14 dages periode starter den dag, hvor ordren er leveret. Eventuelle returneringsomkostninger afholder du selv.
      </p>

      <h2>Returnering</h2>
      <p>
        Ønske om returnering skal meddeles os senest 14 efter leveringen og være os i hænde seneste 14 dage efter, vi er informeret om dit brug af fortrydelsesretten. Ønske om brug af fortrydelsesret skal sendes på mail dikudunkers@di.ku.dk.
      </p>

      <h2>Klagehåndtering</h2>
      <p>
        Hvis du har en klage over et produkt, købt i vores webshop, kan der sendes en klage til:
        DIKU Dunkers, Universitetsparken 1, 8000 2100 København Ø, email: dikudunkers@di.ku.dk.
        Hvis det ikke lykkes os at finde en løsning, kan du sende en klage til Center for Klageløsning, Nævnenes Hus, Toldboden 2, 8800 Viborg.
      </p>
    </div>
  );
}