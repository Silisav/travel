import { existsSync } from 'node:fs';
import { defineCollection, type SchemaContext } from 'astro:content';
import { file } from 'astro/loaders';
import { z } from 'astro/zod';

/** IANA zone names are validated by the platform itself: Intl throws on unknown zones. */
const timeZone = z.string().refine((tz) => {
  try {
    new Intl.DateTimeFormat('en', { timeZone: tz });
    return true;
  } catch {
    return false;
  }
}, 'Unknown IANA time zone');

const photo = ({ image }: SchemaContext) =>
  z.object({
    src: image(),
    alt: z.string().min(8, 'Write real alt text describing the photo'),
    caption: z.string().optional(),
  });

const countries = defineCollection({
  loader: file('src/data/countries.json'),
  schema: (ctx) =>
    z
      .object({
        name: z.string(),
        nativeName: z.string(),
        start: z.coerce.date(),
        end: z.coerce.date(),
        timeZone,
        coords: z.tuple([z.number().min(-90).max(90), z.number().min(-180).max(180)]),
        capital: z.string(),
        population: z.string(),
        language: z.string(),
        currency: z.string(),
        banner: ctx.image(),
        card: ctx.image(),
        flag: ctx.image(),
        map: ctx.image(),
        photos: z.array(photo(ctx)).min(1),
      })
      .refine((c) => c.end >= c.start, 'end must not be before start'),
});

/**
 * Personal photos (faces) live only in the private submodule at media/private/.
 * Without it (forks, CI, public clones) this collection is simply absent and the
 * build produces the public site only: fail closed.
 */
const PRIVATE_MANIFEST = 'media/private/private.json';
export const hasPrivateMedia = existsSync(PRIVATE_MANIFEST);

const privatePhotos = defineCollection({
  loader: file(PRIVATE_MANIFEST, {
    parser: (text) => (JSON.parse(text) as { photos: Record<string, unknown>[] }).photos,
  }),
  // NEVER use image() here: Astro emits every image() asset into the public /_astro/
  // folder, outside the /private/ gate. Private photos are plain paths, resolved
  // against media/private/ and processed into dist/private/ by our own image script.
  schema: () =>
    z.object({
      src: z
        .string()
        .refine((p) => existsSync(`media/private/${p}`), 'File not found in media/private/'),
      alt: z.string().min(8, 'Write real alt text describing the photo'),
      caption: z.string().optional(),
      country: z.enum([
        'japan',
        'vietnam',
        'cambodia',
        'thailand',
        'malaysia',
        'indonesia',
        'greece',
      ]),
    }),
});

export const collections = hasPrivateMedia ? { countries, privatePhotos } : { countries };
