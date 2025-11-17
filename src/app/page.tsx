// src/app/page.tsx
import SubscribeButton from '@/components/SubscribeButton';

const memberships = {
  haladgang: {
    type: 'Haladgang',
    priceInOre: 15000,
    displayName: '150 DKK / halvår',
    productName: 'Haladgang',
    description: 'Adgang til træning og faciliteter. Perfekt for motionister.'
  },
  kamphold: {
    type: 'Kamphold',
    priceInOre: 35000,
    displayName: '350 DKK / halvår',
    productName: 'Kamphold',
    description: 'Deltagelse i kampe, stævner og fuld adgang til træning.'
  }
} as const;

export default function HomePage() {
  return (
    <div className="container mx-auto">
      <h1 className="text-4xl font-bold mb-4 text-center">Velkommen til DIKU Dunkers!</h1>
      <p className="mb-8 text-center text-lg">Vælg dit medlemskab for at komme i gang.</p>
      
      <div className="flex flex-col md:flex-row justify-center gap-8">
        {/* Haladgang Membership Card */}
        <div className="border rounded-lg p-6 max-w-sm w-full flex flex-col">
          <h2 className="text-2xl font-semibold">Haladgang</h2>
          <p className="text-xl font-bold my-2">{memberships.haladgang.displayName}</p>
          <p className="mb-4 flex-grow">{memberships.haladgang.description}</p>
          <SubscribeButton membership={memberships.haladgang} />
        </div>

        {/* Kamphold Membership Card */}
        <div className="border rounded-lg p-6 max-w-sm w-full flex flex-col">
          <h2 className="text-2xl font-semibold">Kamphold</h2>
          <p className="text-xl font-bold my-2">{memberships.kamphold.displayName}</p>
          <p className="mb-4 flex-grow">{memberships.kamphold.description}</p>
          <SubscribeButton membership={memberships.kamphold} />
        </div>
      </div>
    </div>
  );
}