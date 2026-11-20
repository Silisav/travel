// @ts-check
/**
 * Responsive variants for personal photos (media/private/), shared by the build integration
 * (writes them to dist/private/media/img/), the dev server (renders on request) and the
 * page templates (srcset URLs). Same idea as astro:assets, but output stays under /private/.
 * Originals are never published; sharp drops all metadata (EXIF, GPS) from every variant.
 */
import { existsSync, readFileSync } from 'node:fs';
import sharp from 'sharp';

export const ROOT = 'media/private';
export const IMG_URL = '/private/media/img/';
export const THUMB_WIDTHS = [240, 360, 480, 720];
export const FULL_MAX = 2400;
export const FORMATS = /** @type {const} */ (['avif', 'webp']);
const ID = /^[a-z0-9-]{1,64}$/;

/** @typedef {{ id: string, src: string, alt: string, caption?: string, country: string }} ManifestPhoto */

/** @returns {{ photos: ManifestPhoto[], video?: { src: string, poster?: string, alt: string } }} */
export function readManifest() {
  const file = `${ROOT}/private.json`;
  if (!existsSync(file)) return { photos: [] };
  const manifest = JSON.parse(readFileSync(file, 'utf8'));
  for (const photo of manifest.photos ?? []) {
    if (!ID.test(photo.id)) throw new Error(`private.json: id "${photo.id}" must match ${ID}`);
  }
  return { photos: [], ...manifest };
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
export function variantsOf(/** @type {ManifestPhoto} */ photo) {
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
