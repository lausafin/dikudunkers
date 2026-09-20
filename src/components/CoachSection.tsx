import Image from 'next/image';
import { Outfit } from 'next/font/google';

const outfit = Outfit({ subsets: ['latin'] });

const photoFrameClassName = 'flex h-56 w-56 shrink-0 items-center justify-center sm:h-72 sm:w-72';

const photoImageClassName =
  'rounded-2xl object-cover [mask-image:linear-gradient(to_bottom,black_68%,transparent)] [-webkit-mask-image:linear-gradient(to_bottom,black_68%,transparent)]';

type Person = {
  name: string;
  image: string;
  role: string;
  roleClassName: string;
  bio: string;
  photoSide: 'left' | 'right';
  /** Scale relative to the shared frame — use when a tighter crop looks larger. */
  photoScale?: number;
};

const people: Person[] = [
  {
    name: 'Anders Hoeck',
    image: '/anders.png',
    role: '26 år · Træner · MSc-studerende i ML',
    roleClassName: 'text-amber-800/80 dark:text-amber-200/80',
    bio: 'Anders har spillet basketball i over 16 år og behersker både grundlæggende dele af spillet og avancerede spillestrategier. Han elsker sporten og er klar til at dele sin passion med resten af holdet.',
    photoSide: 'left',
  },
  {
    name: 'Lau Safin',
    image: '/lau.png',
    role: '22 år · Ass. træner · BSc-studerende i ML',
    roleClassName: 'text-sky-800/80 dark:text-sky-200/80',
    bio: 'Lau har medstiftet DIKU Dunkers med Anders i 2024, og sammen sørger de for den ugentlige drift. Han er også mentor på Datalogisk Institut og afløser Anders, når Anders skal feste.',
    photoSide: 'right',
    photoScale: 0.88,
  },
];

function PersonRow({ person }: { person: Person }) {
  const scale = person.photoScale ?? 1;
  const photo = (
    <div className={photoFrameClassName}>
      <Image
        src={person.image}
        alt={person.name}
        width={280}
        height={280}
        className={`${photoImageClassName} h-full w-full`}
        style={scale !== 1 ? { width: `${scale * 100}%`, height: `${scale * 100}%` } : undefined}
        sizes="288px"
      />
    </div>
  );

  const bio = (
    <div className="min-w-0 flex-1 text-center sm:text-left">
      <p
        className={`${outfit.className} text-xl font-semibold tracking-tight text-gray-900 dark:text-white sm:text-2xl`}
      >
        {person.name}
      </p>
      <p className={`mt-1 text-sm font-medium ${person.roleClassName}`}>
        {person.role}
      </p>
      <p className="mt-4 text-[15px] leading-relaxed text-gray-600 dark:text-gray-400">
        {person.bio}
      </p>
    </div>
  );

  return (
    <div className="flex flex-col items-center gap-6 sm:flex-row sm:items-center sm:gap-8">
      {person.photoSide === 'left' ? (
        <>
          {photo}
          {bio}
        </>
      ) : (
        <>
          <div className="contents sm:hidden">{photo}</div>
          {bio}
          <div className="hidden sm:contents">{photo}</div>
        </>
      )}
    </div>
  );
}

export default function CoachSection() {
  return (
    <section className="mx-auto mt-36 w-full max-w-4xl" aria-labelledby="team-heading">
      <h2
        id="team-heading"
        className="mb-6 text-center text-2xl font-bold drop-shadow-sm dark:text-gray-100"
      >
        Mød vores trænere
      </h2>

      <div className="space-y-14">
        {people.map((person) => (
          <PersonRow key={person.name} person={person} />
        ))}
      </div>
    </section>
  );
}
