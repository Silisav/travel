// @ts-check
/**
 * Responsive variants for personal photos (media/private/), shared by the build integration
 * (writes them to dist/private/media/img/), the dev server (renders on request) and the
 * page templates (srcset URLs). Same idea as astro:assets, but output stays under /private/.
 * Originals are never published; sharp drops all metadata (EXIF, GPS) from every variant.
 */
import { existsSync, readFileSync } from 'node:fs';
import sharp from 'sharp';
import { checkOverrides, defaultAlt, listPhotoFiles, orderPhotos } from './photos.mjs';

export const ROOT = 'media/private';
export const IMG_URL = '/private/media/img/';
export const THUMB_WIDTHS = [240, 360, 480, 720];
export const FULL_MAX = 2400;
export const FORMATS = /** @type {const} */ (['avif', 'webp']);
/** @typedef {{ id: string, src: string, alt: string, caption?: string, country: string }} PrivatePhotoEntry */
/** @typedef {{ src: string, poster?: string, alt: string }} PrivateVideoEntry */

/**
 * private.json: everything in it is optional.
 * - photos: extras for photos in photos/<country>/, keyed by "<country>/<file>", e.g.
 *   { "file": "japan/fushimi.jpg", "alt": "Us at Fushimi Inari", "caption": "…", "order": 1 }
 * - video: the trip video on the private homepage
 * @returns {{ photos: (import('./photos.mjs').PhotoOverride)[], video?: PrivateVideoEntry }}
 */
export function readManifest() {
  const file = `${ROOT}/private.json`;
  if (!existsSync(file)) return { photos: [] };
  return { photos: [], ...JSON.parse(readFileSync(file, 'utf8')) };
}

/** URL-safe, stable id from "<country>/<file>" (variant files are named after it). */
const toId = (/** @type {string} */ country, /** @type {string} */ file) =>
  `${country}-${file}`
    .normalize('NFKD')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-|-$/g, '')
    .slice(0, 80);

/**
 * Every personal photo: whatever is in photos/<country>/, ordered and described like the
 * public ones (integrations/photos.mjs), with optional extras from private.json.
 * @returns {Promise<PrivatePhotoEntry[]>}
 */
export async function readPrivatePhotos() {
  if (!existsSync(ROOT)) return [];
  const files = listPhotoFiles(`${ROOT}/photos`);
  const overrides = new Map(readManifest().photos.map((o) => [o.file, o]));
  checkOverrides(
    'private.json',
    overrides.keys(),
    files.map((f) => ({ ...f, file: `${f.country}/${f.file}` })),
  );

  /** @type {PrivatePhotoEntry[]} */
  const photos = [];
  for (const country of new Set(files.map((f) => f.country))) {
    const inCountry = files.filter((f) => f.country === country);
    const local = new Map(
      inCountry.flatMap((f) => {
        const o = overrides.get(`${country}/${f.file}`);
        return o ? [[f.file, o]] : [];
      }),
    );
    for (const f of await orderPhotos(inCountry, local)) {
      const o = local.get(f.file);
      photos.push({
        id: toId(country, f.file),
        country,
        src: `photos/${country}/${f.file}`,
        alt: o?.alt ?? defaultAlt(country),
        caption: o?.caption,
      });
    }
  }
  return photos;
}

/** @param {string} id @param {number | 'full'} width @param {string} format */
export const variantFile = (id, width, format) => `${id}-${width}.${format}`;

/** Width and height as displayed (EXIF orientation applied). */
export async function orientedSize(/** @type {string} */ src) {
  const { width = 0, height = 0, orientation } = await sharp(src).metadata();
  return orientation !== undefined && orientation >= 5
    ? { width: height, height: width }
    : { width, height };
}

/** Size of the "full" variant: the original, fitted inside FULL_MAX × FULL_MAX. */
export function fullSize(/** @type {{ width: number, height: number }} */ size) {
  const scale = Math.min(1, FULL_MAX / Math.max(size.width, size.height));
  return { width: Math.round(size.width * scale), height: Math.round(size.height * scale) };
}

/**
 * @param {string} src original file
 * @param {number | 'full'} width
 * @param {string} format avif | webp
 */
export function renderVariant(src, width, format) {
  const image = sharp(src).rotate(); // apply EXIF orientation, then metadata is dropped
  const resized =
    width === 'full'
      ? image.resize({ width: FULL_MAX, height: FULL_MAX, fit: 'inside', withoutEnlargement: true })
      : image.resize({ width, withoutEnlargement: true });
  return format === 'avif'
    ? resized.avif({ quality: 55 }).toBuffer()
    : resized.webp({ quality: width === 'full' ? 85 : 78 }).toBuffer();
}

/** Every file to publish for one photo: thumbnails in both formats + the full-size WebP. */
export function variantsOf(/** @type {PrivatePhotoEntry} */ photo) {
  return [
    ...THUMB_WIDTHS.flatMap((width) =>
      FORMATS.map((format) => ({ file: variantFile(photo.id, width, format), width, format })),
    ),
    {
      file: variantFile(photo.id, 'full', 'webp'),
      width: /** @type {const} */ ('full'),
      format: 'webp',
    },
  ];
}
