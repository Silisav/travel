import { getCollection, type CollectionEntry } from 'astro:content';

export type Country = CollectionEntry<'countries'>;

/** All countries in travel order. */
export async function getCountries(): Promise<Country[]> {
  return (await getCollection('countries')).sort(
    (a, b) => a.data.start.getTime() - b.data.start.getTime(),
  );
}

/** Private pages mirror the public ones under /private/; links must stay on their side. */
export const isPrivatePath = (pathname: string) => pathname.startsWith('/private/');
export const basePath = (url: URL) => (isPrivatePath(url.pathname) ? '/private/' : '/');

const dayMonth = new Intl.DateTimeFormat('en-GB', {
  day: 'numeric',
  month: 'long',
  timeZone: 'UTC',
});

/** "11 April – 28 April", as written on the 2016 site */
export const formatRange = (start: Date, end: Date) =>
  `${dayMonth.format(start)} – ${dayMonth.format(end)}`;
