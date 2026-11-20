// @ts-check
/**
 * Serves personal media from the private submodule under /private/media/:
 * copied into dist/private/media/ at build, served straight from disk in dev.
 * Only photos/ and video/ are exposed, never the manifest or README.
 * Nothing happens when the submodule is absent (public-only build).
 */
import { cp, stat } from 'node:fs/promises';
import { createReadStream, existsSync } from 'node:fs';
import { extname, join, normalize, sep } from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = 'media/private';
const EXPOSED = ['photos', 'video'];
const TYPES = {
  '.jpg': 'image/jpeg',
  '.jpeg': 'image/jpeg',
  '.png': 'image/png',
  '.webp': 'image/webp',
  '.avif': 'image/avif',
  '.mp4': 'video/mp4',
  '.webm': 'video/webm',
};

/** @returns {import('astro').AstroIntegration} */
export default function privateMedia() {
  return {
    name: 'private-media',
    hooks: {
      'astro:server:setup': ({ server }) => {
        server.middlewares.use(async (req, res, next) => {
          const prefix = '/private/media/';
          if (!req.url?.startsWith(prefix) || !existsSync(ROOT)) return next();
          const rel = normalize(decodeURIComponent(req.url.slice(prefix.length).split('?')[0]));
          if (rel.startsWith('..') || !EXPOSED.includes(rel.split(sep)[0])) return next();
          const file = join(ROOT, rel);
          try {
            const { size } = await stat(file);
            res.setHeader(
              'Content-Type',
              TYPES[/** @type {keyof TYPES} */ (extname(file).toLowerCase())] ??
                'application/octet-stream',
            );
            res.setHeader('Content-Length', size);
            createReadStream(file).pipe(res);
          } catch {
            next();
          }
        });
      },
      'astro:build:done': async ({ dir, logger }) => {
        if (!existsSync(ROOT)) {
          logger.info('No private media (submodule absent): public-only build.');
          return;
        }
        const out = join(fileURLToPath(dir), 'private', 'media');
        for (const folder of EXPOSED) {
          if (existsSync(join(ROOT, folder))) {
            await cp(join(ROOT, folder), join(out, folder), {
              recursive: true,
              filter: (src) => !src.endsWith('.gitkeep'),
            });
          }
        }
        logger.info('Private media copied to dist/private/media/.');
      },
    },
  };
}
