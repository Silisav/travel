/**
 * Access to personal media from the private submodule (media/private/).
 * Everything here returns empty results when the submodule is absent (fail closed).
 * Files are served from /private/media/… (see integrations/private-media.mjs),
 * behind the /private/ access gate.
 */
import { existsSync, readFileSync } from 'node:fs';
import { getCollection } from 'astro:content';
import sharp from 'sharp';
import { hasPrivateMedia } from '../content.config';

export interface PrivatePhoto {
  id: string;
  url: string;
  width: number;
  height: number;
  alt: string;
  caption?: string;
}

interface PrivateVideo {
  url: string;
  poster?: string;
  alt: string;
}

const ROOT = 'media/private';
const toUrl = (src: string) => `/private/media/${src}`;

type PrivateEntry = {
  id: string;
  data: { src: string; alt: string; caption?: string; country: string };
};

export async function getPrivatePhotos(country: string): Promise<PrivatePhoto[]> {
  if (!hasPrivateMedia || !readManifest().photos?.length) return [];
  // The collection only exists when the submodule does, so it isn't in the static types.
  const all = (await (getCollection as (name: string) => Promise<PrivateEntry[]>)(
    'privatePhotos',
  )) as PrivateEntry[];

  return Promise.all(
    all
      .filter((entry) => entry.data.country === country)
      .map(async ({ id, data }) => {
        const {
          width = 0,
          height = 0,
          orientation,
        } = await sharp(`${ROOT}/${data.src}`).metadata();
        const rotated = orientation !== undefined && orientation >= 5;
        return {
          id,
          url: toUrl(data.src),
          width: rotated ? height : width,
          height: rotated ? width : height,
          alt: data.alt,
          caption: data.caption,
        };
      }),
  );
}

function readManifest(): {
  photos?: unknown[];
  video?: { src: string; poster?: string; alt: string };
} {
  const manifest = `${ROOT}/private.json`;
  return existsSync(manifest) ? JSON.parse(readFileSync(manifest, 'utf8')) : {};
}

export function getPrivateVideo(): PrivateVideo | undefined {
  const { video } = readManifest();
  if (!video) return undefined;
  return {
    url: toUrl(video.src),
    poster: video.poster ? toUrl(video.poster) : undefined,
    alt: video.alt,
  };
}
