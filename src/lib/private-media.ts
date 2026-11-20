/**
 * Access to personal media from the private submodule (media/private/).
 * Everything here returns empty results when the submodule is absent (fail closed).
 * Files are served from /private/media/… (see integrations/private-media.mjs),
 * behind the /private/ access gate.
 */
import {
  IMG_URL,
  THUMB_WIDTHS,
  fullSize,
  orientedSize,
  readManifest,
  readPrivatePhotos,
  variantFile,
} from '../../integrations/private-images.mjs';
import { hasPrivateMedia } from '../content.config';

export interface PrivatePhoto {
  id: string;
  alt: string;
  caption?: string;
  /** thumbnail sources, as srcset strings per format */
  srcset: { avif: string; webp: string };
  /** fallback thumbnail for <img src> */
  src: string;
  /** displayed size of the original (for aspect ratio) */
  width: number;
  height: number;
  /** full-size image for the lightbox */
  full: { url: string; width: number; height: number };
}

interface PrivateVideo {
  url: string;
  poster?: string;
  alt: string;
}

const ROOT = 'media/private';
const toUrl = (src: string) => `/private/media/${src}`;
const imgUrl = (id: string, width: number | 'full', format: string) =>
  `${IMG_URL}${variantFile(id, width, format)}`;

export async function getPrivatePhotos(country: string): Promise<PrivatePhoto[]> {
  if (!hasPrivateMedia) return [];
  const entries = (await readPrivatePhotos()).filter((p) => p.country === country);

  return Promise.all(
    entries.map(async ({ id, src, alt, caption }) => {
      const size = await orientedSize(`${ROOT}/${src}`);
      const widths = THUMB_WIDTHS.filter((w) => w <= size.width).concat(
        size.width < THUMB_WIDTHS[0] ? [THUMB_WIDTHS[0]] : [],
      );
      const srcset = (format: string) =>
        widths.map((w) => `${imgUrl(id, w, format)} ${Math.min(w, size.width)}w`).join(', ');
      return {
        id,
        alt,
        caption,
        srcset: { avif: srcset('avif'), webp: srcset('webp') },
        src: imgUrl(id, widths.at(-1) ?? THUMB_WIDTHS[0], 'webp'),
        width: size.width,
        height: size.height,
        full: { url: imgUrl(id, 'full', 'webp'), ...fullSize(size) },
      };
    }),
  );
}

export function getPrivateVideo(): PrivateVideo | undefined {
  if (!hasPrivateMedia) return undefined;
  const { video } = readManifest();
  if (!video) return undefined;
  return {
    url: toUrl(video.src),
    poster: video.poster ? toUrl(video.poster) : undefined,
    alt: video.alt,
  };
}
