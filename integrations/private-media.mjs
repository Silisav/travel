// @ts-check
/**
 * Publishes personal media from the private submodule under /private/media/ (behind the gate):
 * - photos: responsive AVIF/WebP variants only (see private-images.mjs), never the originals
 * - video/: copied as is (already compressed)
 * Built into dist/private/media/ at build time, served on request in dev.
 * Nothing happens when the submodule is absent (public-only build).
 */
import { cp, mkdir, stat, writeFile } from 'node:fs/promises';
import { createReadStream, existsSync } from 'node:fs';
import { extname, join, normalize, sep } from 'node:path';
import { fileURLToPath } from 'node:url';
import { ROOT, readManifest, renderVariant, variantsOf } from './private-images.mjs';

const TYPES = {
  '.webp': 'image/webp',
  '.avif': 'image/avif',
  '.jpg': 'image/jpeg',
  '.mp4': 'video/mp4',
  '.webm': 'video/webm',
};
const type = (/** @type {string} */ file) =>
  TYPES[/** @type {keyof TYPES} */ (extname(file).toLowerCase())] ?? 'application/octet-stream';

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
          try {
            if (rel.startsWith(`img${sep}`)) {
              const name = rel.slice(4);
              for (const photo of readManifest().photos) {
                const variant = variantsOf(photo).find((v) => v.file === name);
                if (!variant) continue;
                const body = await renderVariant(
                  join(ROOT, photo.src),
                  variant.width,
                  variant.format,
                );
                res.setHeader('Content-Type', type(name));
                return res.end(body);
              }
              return next();
            }
            if (rel.startsWith(`video${sep}`) && !rel.includes('..')) {
              const file = join(ROOT, rel);
              const { size } = await stat(file);
              res.setHeader('Content-Type', type(file));
              res.setHeader('Content-Length', size);
              return createReadStream(file).pipe(res);
            }
          } catch {
            // fall through to a 404
          }
          next();
        });
      },

      'astro:build:done': async ({ dir, logger }) => {
        if (!existsSync(ROOT)) {
          logger.info('No private media (submodule absent): public-only build.');
          return;
        }
        const out = join(fileURLToPath(dir), 'private', 'media');

        const { photos } = readManifest();
        await mkdir(join(out, 'img'), { recursive: true });
        for (const photo of photos) {
          for (const variant of variantsOf(photo)) {
            const body = await renderVariant(join(ROOT, photo.src), variant.width, variant.format);
            await writeFile(join(out, 'img', variant.file), body);
          }
        }

        if (existsSync(join(ROOT, 'video'))) {
          await cp(join(ROOT, 'video'), join(out, 'video'), { recursive: true });
        }
        logger.info(`Private media: ${photos.length} photo(s) resized, video copied.`);
      },
    },
  };
}
