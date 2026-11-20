// @ts-check
/**
 * Photo discovery, shared by public photos (media/public/photos/) and private ones
 * (media/private/photos/). Drop image files into <root>/<country>/ and they appear on that
 * country's page; nothing else is required.
 *
 * - Order: optional "order" from the overrides first, then by date taken (camera data), then by
 *   file name (1, 2, 10 in numeric order).
 * - Description: "Photo from <Country>" unless an override gives one; no caption by default.
 * - Overrides live in src/data/countries.json (public) or private.json (private) and are optional.
 */
import { existsSync, readFileSync, readdirSync } from 'node:fs';
import { extname, join } from 'node:path';
import sharp from 'sharp';
import exifReader from 'exif-reader';

/** Formats the build can resize (sharp). */
export const SUPPORTED = ['.jpg', '.jpeg', '.png', '.webp', '.avif', '.tif', '.tiff', '.gif'];
/** Common camera formats the build can't read: fail with a clear message instead of skipping. */
const NEEDS_EXPORT = ['.heic', '.heif', '.dng', '.raw', '.cr2', '.cr3', '.nef', '.arw', '.raf'];

/** @type {{ id: string, name: string }[]} */
const COUNTRIES = JSON.parse(readFileSync('src/data/countries.json', 'utf8'));
export const countryName = (/** @type {string} */ id) =>
  COUNTRIES.find((c) => c.id === id)?.name ?? id;
export const defaultAlt = (/** @type {string} */ country) => `Photo from ${countryName(country)}`;

/** @typedef {{ country: string, file: string, path: string }} PhotoFile */
/** @typedef {{ file: string, alt?: string, caption?: string, order?: number }} PhotoOverride */

/**
 * Every usable photo under root/<country>/. Throws (failing the build, so the live site stays as
 * it was) for photos in the wrong place or in a format that needs exporting first.
 * @param {string} root
 * @returns {PhotoFile[]}
 */
export function listPhotoFiles(root) {
  if (!existsSync(root)) return [];
  /** @type {PhotoFile[]} */
  const photos = [];
  const problems = [];
  for (const entry of readdirSync(root, { withFileTypes: true })) {
    if (entry.name.startsWith('.')) continue;
    if (!entry.isDirectory()) {
      if (SUPPORTED.includes(extname(entry.name).toLowerCase())) {
        problems.push(`${entry.name}: put photos inside a country folder, e.g. japan/`);
      }
      continue;
    }
    if (!COUNTRIES.some((c) => c.id === entry.name)) {
      problems.push(
        `${entry.name}/ is not a country folder (use: ${COUNTRIES.map((c) => c.id).join(', ')})`,
      );
      continue;
    }
    for (const file of readdirSync(join(root, entry.name))) {
      if (file.startsWith('.')) continue;
      const ext = extname(file).toLowerCase();
      if (SUPPORTED.includes(ext))
        photos.push({ country: entry.name, file, path: join(root, entry.name, file) });
      else if (NEEDS_EXPORT.includes(ext)) {
        problems.push(`${entry.name}/${file}: export as JPEG first (${ext} can't be processed)`);
      }
    }
  }
  if (problems.length) {
    throw new Error(`Photos in ${root} need attention:\n  - ${problems.join('\n  - ')}`);
  }
  return photos;
}

/** @type {Map<string, Promise<number | null>>} */
const dates = new Map();

/** When the photo was taken (ms), from its camera data; null if it has none. */
export function takenAt(/** @type {string} */ path) {
  if (!dates.has(path)) {
    dates.set(
      path,
      sharp(path)
        .metadata()
        .then(({ exif }) => {
          if (!exif) return null;
          const tags = exifReader(exif);
          const date = tags.Photo?.DateTimeOriginal ?? tags.Image?.DateTime;
          return date instanceof Date && !Number.isNaN(date.getTime()) ? date.getTime() : null;
        })
        .catch(() => null),
    );
  }
  return /** @type {Promise<number | null>} */ (dates.get(path));
}

const byName = new Intl.Collator('en', { numeric: true, sensitivity: 'base' });

/**
 * Explicit "order" first (ascending), then date taken (photos without one after those with),
 * then file name.
 * @template {PhotoFile} T
 * @param {T[]} photos
 * @param {Map<string, PhotoOverride>} overrides keyed by file name
 * @returns {Promise<T[]>}
 */
export async function orderPhotos(photos, overrides) {
  const keyed = await Promise.all(
    photos.map(async (photo) => ({
      photo,
      order: overrides.get(photo.file)?.order ?? Infinity,
      taken: (await takenAt(photo.path)) ?? Infinity,
    })),
  );
  const compare = (/** @type {number} */ a, /** @type {number} */ b) =>
    a === b ? 0 : a < b ? -1 : 1;
  keyed.sort(
    (a, b) =>
      compare(a.order, b.order) ||
      compare(a.taken, b.taken) ||
      byName.compare(a.photo.file, b.photo.file),
  );
  return keyed.map((k) => k.photo);
}

/**
 * Overrides that name a file which doesn't exist are almost always typos: fail loudly.
 * @param {string} where e.g. "countries.json → japan"
 * @param {Iterable<string>} names
 * @param {PhotoFile[]} photos
 */
export function checkOverrides(where, names, photos) {
  const missing = [...names].filter((name) => !photos.some((p) => p.file === name));
  if (missing.length) {
    throw new Error(`${where} describes photos that don't exist: ${missing.join(', ')}`);
  }
}
