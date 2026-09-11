import { Source_Serif_4 } from 'next/font/google';

const storyFont = Source_Serif_4({
  subsets: ['latin'],
  style: ['italic'],
  weight: ['300', '400'],
});

export default function StorySection() {
  return (
    <section
      className="mx-auto mt-20 w-full max-w-sm px-2 text-center"
      aria-labelledby="story-heading"
    >
      <h2
        id="story-heading"
        className={`${storyFont.className} mb-8 text-[1.65rem] font-normal italic tracking-wide text-gray-700 dark:text-gray-200 sm:text-3xl`}
      >
        Vores historie
      </h2>

      <p
        className={`${storyFont.className} text-base font-light italic leading-[1.85] text-gray-500 dark:text-gray-400 sm:text-lg`}
      >
        Da Anders og Lau sad dagen før, de skulle aflevere eksamensprojekt i
        Grundlæggende Data Science, kiggede Lau ind i Anders&apos; øjne og
        spurgte:{' '}
        <span className="font-normal text-gray-700 dark:text-gray-300">
          &ldquo;Kunne det ikke være fedt at spille basketball ude i
          solskinsvejret lige nu?&rdquo;
        </span>{' '}
        En simpel sætning åbnede få sekunder efter op for en samtale, der skulle
        ændre fremtiden. To år senere står vi som en officiel forening i
        Københavns Kommune med faste haltider, et tilmeldt kamphold til
        DBBF&apos;s halvårlige turnering i egne, seje holdsæt og et livligt
        fællesskab af unge venner, der dagligt glæder sig til næste gang, vi får
        sved på panden under kurven.
      </p>
    </section>
  );
}
