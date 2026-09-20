import { Outfit } from 'next/font/google';

const outfit = Outfit({ subsets: ['latin'] });

const members = [
  'Malte Hesselholdt Kristiansen',
  'Mads Ouyang',
  'Valdemar Fels',
  'Adam John',
  'Lau Safin',
  'Anders Hoeck',
] as const;

export default function BoardSection() {
  return (
    <section
      className="mx-auto mt-28 mb-4 w-full max-w-5xl text-center"
      aria-labelledby="board-heading"
    >
      <h2
        id="board-heading"
        className="mb-5 text-sm font-medium tracking-wide text-gray-500 dark:text-gray-400"
      >
        Bestyrelse
        <span className="mx-1.5 text-gray-300 dark:text-gray-600" aria-hidden>
          ·
        </span>
        <span className="tracking-[0.14em]">26/27</span>
      </h2>

      <div className="overflow-x-auto px-2 [-ms-overflow-style:none] [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
        <ul
          className={`${outfit.className} mx-auto flex w-max items-center justify-center whitespace-nowrap text-[15px] font-medium tracking-wide text-gray-600 dark:text-gray-300`}
        >
          {members.map((name, index) => (
            <li key={name} className="inline-flex items-center">
              {index > 0 ? (
                <span className="mx-2 text-gray-300 dark:text-gray-600" aria-hidden>
                  ·
                </span>
              ) : null}
              <span>{name}</span>
            </li>
          ))}
        </ul>
      </div>
    </section>
  );
}
