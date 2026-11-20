/**
 * Public photos for a country: every image in media/public/photos/<country>/, ordered and
 * described per integrations/photos.mjs, with optional overrides from countries.json.
 */
import type { ImageMetadata } from 'astro';
import type { Country } from './site';
import {
  checkOverrides,
  defaultAlt,
  listPhotoFiles,
  orderPhotos,
} from '../../integrations/photos.mjs';

const ROOT = 'media/public/photos';

// Every public photo, imported so astro:assets can resize it (keys like /media/public/photos/japan/1.jpg).
const images = import.meta.glob<ImageMetadata>(
  '/media/public/photos/*/*.{jpg,jpeg,png,webp,avif,tif,tiff,gif,JPG,JPEG,PNG,WEBP,AVIF,TIF,TIFF,GIF}',
  { eager: true, import: 'default' },
);

export interface Photo {
  file: string;
  image: ImageMetadata;
  alt: string;
  caption?: string;
}

export async function getPhotos(country: Country): Promise<Photo[]> {
  const files = listPhotoFiles(ROOT).filter((f) => f.country === country.id);
  const overrides = new Map(country.data.photos.map((o) => [o.file, o]));
  checkOverrides(`countries.json → ${country.id}`, overrides.keys(), files);

  return (await orderPhotos(files, overrides)).map((f) => {
    const image = images[`/${ROOT}/${f.country}/${f.file}`];
    if (!image) throw new Error(`Couldn't load ${ROOT}/${f.country}/${f.file}`);
    const override = overrides.get(f.file);
    return {
      file: f.file,
      image,
      alt: override?.alt ?? defaultAlt(country.id),
      caption: override?.caption,
    };
  });
}

/** The photo standing for a country (homepage slideshow): its "cover", else the first one. */
export async function getCover(country: Country): Promise<Photo | undefined> {
  const photos = await getPhotos(country);
  return photos.find((p) => p.file === country.data.cover) ?? photos[0];
}
