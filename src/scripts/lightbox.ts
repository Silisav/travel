/**
 * Photo lightbox (PhotoSwipe 5): pinch-zoom, double-tap zoom, pan and swipe on high-res photos,
 * which the platform can't do per element. Nothing is loaded until the first tap on a photo;
 * without JS, every thumbnail is a plain link to the full image.
 *
 * Kept from the 2016 site: zoom-from-thumbnail, counter, zoom/close, full screen, share
 * (now the native Web Share API instead of Facebook/Twitter/Pinterest links), and the photo
 * number in the URL so the back button closes the photo and links can point at one.
 */
import type PhotoSwipeLightbox from 'photoswipe/lightbox';
import type PhotoSwipe from 'photoswipe';

const GALLERY = '[data-gallery]';
const ITEM = 'a[data-pswp-width]';
const HASH = /^#photo-(\d+)$/;

let lightbox: PhotoSwipeLightbox | undefined;
let galleryEl: HTMLElement | null = null;
/** true while our own history entry for the open photo is on the stack */
let pushedState = false;

/** Custom button icon in PhotoSwipe's style: the path plus its dark outline (a <use> of the same id). */
const icon = (name: string, path: string) => ({
  isCustomSVG: true,
  inner: `<path d="${path}" id="pswp__icn-${name}"/>`,
  outlineID: `pswp__icn-${name}`,
});

async function getLightbox(gallery: HTMLElement): Promise<PhotoSwipeLightbox> {
  if (lightbox && galleryEl === gallery) return lightbox;
  lightbox?.destroy();
  galleryEl = gallery;

  const [{ default: Lightbox }] = await Promise.all([
    import('photoswipe/lightbox'),
    import('photoswipe/style.css'),
  ]);

  const shareable = !gallery.hasAttribute('data-private') && 'share' in navigator;

  lightbox = new Lightbox({
    gallery,
    children: ITEM,
    pswpModule: () => import('photoswipe'),
    bgOpacity: 1,
    showHideAnimationType: 'zoom',
    closeTitle: 'Close (Esc)',
    zoomTitle: 'Zoom in/out',
    arrowPrevTitle: 'Previous (arrow left)',
    arrowNextTitle: 'Next (arrow right)',
  });

  lightbox.on('uiRegister', () => {
    const pswp = lightbox!.pswp!;

    if (document.fullscreenEnabled) {
      pswp.ui!.registerElement({
        name: 'fullscreen',
        title: 'Toggle full screen',
        order: 9,
        isButton: true,
        html: icon(
          'fullscreen',
          'M8 8h6v2h-4v4H8zm10 0h6v6h-2v-4h-4zM8 18h2v4h4v2H8zm14 0h2v6h-6v-2h4z',
        ),
        onClick: () => {
          if (document.fullscreenElement) document.exitFullscreen();
          else pswp.element?.requestFullscreen();
        },
      });
    }

    if (shareable) {
      pswp.ui!.registerElement({
        name: 'share',
        title: 'Share',
        order: 8,
        isButton: true,
        html: icon(
          'share',
          'M16 6l5 5-1.4 1.4L17 9.8V19h-2V9.8l-2.6 2.6L11 11zM9 16h2v6h10v-6h2v8H9z',
        ),
        onClick: () => {
          const { alt } = pswp.currSlide?.data ?? {};
          navigator
            .share({ title: document.title, text: alt, url: photoUrl(pswp.currIndex) })
            .catch(() => {}); // dismissed by the user
        },
      });
    }

    pswp.ui!.registerElement({
      name: 'caption',
      order: 9,
      appendTo: 'root',
      isButton: false,
      onInit: (el) => {
        el.className = 'pswp__caption';
        pswp.on('change', () => {
          const caption = pswp.currSlide?.data.element
            ?.closest('li')
            ?.querySelector('.gallery__caption');
          el.textContent = caption?.textContent ?? '';
          el.hidden = !el.textContent;
        });
      },
    });
  });

  // Use the thumbnail's alt text inside the lightbox too.
  lightbox.addFilter('itemData', (data) => {
    const img = data.element?.querySelector('img');
    return { ...data, alt: img?.alt ?? '' };
  });

  lightbox.on('change', () => syncUrl(lightbox!.pswp!));
  // Mark the fully opened state (PhotoSwipe ignores close() while opening): used by the tests.
  lightbox.on('openingAnimationEnd', () =>
    lightbox!.pswp?.element?.setAttribute('data-opened', ''),
  );
  lightbox.on('close', () => {
    if (pushedState) {
      pushedState = false;
      history.back();
    }
  });

  lightbox.init();
  return lightbox;
}

function photoUrl(index: number) {
  return `${location.origin}${location.pathname}#photo-${index + 1}`;
}

/** "#photo-3" in the URL while a photo is open; one history entry for the whole session. */
function syncUrl(pswp: PhotoSwipe) {
  const hash = `#photo-${pswp.currIndex + 1}`;
  if (!pushedState) {
    history.pushState({ pswp: true }, '', hash);
    pushedState = true;
  } else {
    history.replaceState({ pswp: true }, '', hash);
  }
}

async function open(gallery: HTMLElement, index: number) {
  const box = await getLightbox(gallery);
  box.loadAndOpen(index, { gallery });
}

export function initLightbox() {
  document.addEventListener('click', (event) => {
    if (event.defaultPrevented || event.button !== 0) return;
    if (event.metaKey || event.ctrlKey || event.shiftKey || event.altKey) return;
    const link = (event.target as Element | null)?.closest<HTMLAnchorElement>(ITEM);
    const gallery = link?.closest<HTMLElement>(GALLERY);
    if (!link || !gallery) return;

    event.preventDefault();
    open(gallery, [...gallery.querySelectorAll(ITEM)].indexOf(link));
  });

  // Back button closes the open photo. PhotoSwipe ignores close() during its opening
  // animation, so a quick Back waits for that to finish first.
  window.addEventListener('popstate', () => {
    const pswp = lightbox?.pswp;
    if (!pswp || pswp.isDestroying) return;
    pushedState = false;
    if (pswp.opener.isOpening) pswp.on('openingAnimationEnd', () => pswp.close());
    else pswp.close();
  });

  // Deep link: /japan/#photo-3 opens that photo.
  const match = location.hash.match(HASH);
  const gallery = document.querySelector<HTMLElement>(GALLERY);
  if (match && gallery) {
    const index = Number(match[1]) - 1;
    if (index >= 0 && index < gallery.querySelectorAll(ITEM).length) {
      history.replaceState(null, '', location.pathname);
      open(gallery, index);
    }
  }
}
