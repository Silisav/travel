import { existsSync } from 'node:fs';
import { defineCollection } from 'astro:content';
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

/**
 * Optional extras for a photo that's in the country's folder (see integrations/photos.mjs).
 * Photos appear without any of this; list one here only to describe or reorder it.
 */
const photoOverride = z.object({
  /** file name inside media/public/photos/<country>/ */
  file: z.string(),
  alt: z.string().min(1).optional(),
  caption: z.string().optional(),
  /** lower comes first; photos without one follow in date-taken order */
  order: z.number().optional(),
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
        /** object-position for the hero crop, mainly for narrow screens */
        bannerPosition: z.string().default('50% 50%'),
        card: ctx.image(),
        cardPosition: z.string().default('50% 50%'),
        flag: ctx.image(),
        map: ctx.image(),
        /** file name of one of our own landscape photos standing for the country; default: the first */
        cover: z.string().optional(),
        photos: z.array(photoOverride).default([]),
      })
      .refine((c) => c.end >= c.start, 'end must not be before start'),
});

/**
 * Personal photos (faces) live only in the private submodule at media/private/; they're found
 * by integrations/private-images.mjs, not through a content collection (whose image() would
 * publish them in the public /_astro/ folder). Without the submodule (forks, CI, public clones)
 * the build produces the public site only: fail closed.
 */
export const hasPrivateMedia = existsSync('media/private/private.json');

export const collections = { countries };
