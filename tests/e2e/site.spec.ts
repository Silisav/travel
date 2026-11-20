import { test, expect, type Page } from '@playwright/test';
import AxeBuilder from '@axe-core/playwright';

const COUNTRIES = ['japan', 'vietnam', 'cambodia', 'thailand', 'malaysia', 'indonesia', 'greece'];
const PAGES = ['/', '/map/', '/login/', ...COUNTRIES.map((c) => `/${c}/`)];

/** Fail on any console error or uncaught exception on the page. */
function watchErrors(page: Page) {
  const errors: string[] = [];
  page.on('pageerror', (error) => errors.push(error.message));
  page.on('console', (message) => {
    // Map tiles come from openstreetmap.org: a flaky network shouldn't fail the suite.
    if (message.type() === 'error' && !message.text().includes('openstreetmap')) {
      errors.push(message.text());
    }
  });
  return errors;
}

test.describe('every page', () => {
  for (const path of PAGES) {
    test(`${path} loads without errors`, async ({ page }) => {
      const errors = watchErrors(page);
      const response = await page.goto(path);
      expect(response?.status()).toBe(200);
      await expect(page).toHaveTitle(/Follow our journey/);
      await expect(page.locator('main')).toBeVisible();
      expect(errors).toEqual([]);
    });

    test(`${path} has no serious accessibility issues`, async ({ page }) => {
      await page.goto(path);
      const { violations } = await new AxeBuilder({ page })
        // Leaflet's own controls are third-party markup; everything else is ours.
        .exclude('.leaflet-control-container')
        .analyze();
      const serious = violations.filter((v) => v.impact === 'serious' || v.impact === 'critical');
      expect(serious.map((v) => `${v.id}: ${v.nodes.map((n) => n.target).join(', ')}`)).toEqual([]);
    });
  }

  test('no horizontal scrolling on any page', async ({ page }) => {
    for (const path of PAGES) {
      await page.goto(path);
      const overflow = await page.evaluate(
        () => document.documentElement.scrollWidth - document.documentElement.clientWidth,
      );
      expect(overflow, path).toBeLessThanOrEqual(0);
    }
  });
});

test.describe('menu', () => {
  test('opens as a modal, Esc closes it and focus returns to the button', async ({ page }) => {
    await page.goto('/');
    const menu = page.locator('#site-nav');
    const button = page.getByRole('button', { name: 'Menu', exact: true });
    // keyboard use, where returning focus matters (Safari doesn't focus buttons on click)
    await button.focus();
    await page.keyboard.press('Enter');
    await expect(menu).toHaveAttribute('open', '');
    await expect(page.getByRole('button', { name: 'Close menu' })).toBeFocused();
    await expect(menu.getByRole('link', { name: 'Greece' })).toBeVisible();

    await page.keyboard.press('Escape');
    await expect(menu).not.toHaveAttribute('open', '');
    await expect(button).toBeFocused();
  });

  test('links to every destination and marks the current page', async ({ page }) => {
    await page.goto('/japan/');
    await page.getByRole('button', { name: 'Menu', exact: true }).click();
    const menu = page.locator('#site-nav');
    for (const c of COUNTRIES) await expect(menu.locator(`a[href="/${c}/"]`)).toHaveCount(1);
    await expect(menu.locator('a[href="/japan/"]')).toHaveAttribute('aria-current', 'page');
  });
});

/** PhotoSwipe's opening animation has finished (it ignores close() until then, by design). */
const viewerOpened = (page: Page) => page.locator('.pswp[data-opened]').waitFor();

test.describe('photo viewer', () => {
  test('opens the tapped photo, updates the URL and closes with Back', async ({ page }) => {
    await page.goto('/japan/');
    await page.locator('.gallery a').nth(2).click();
    const viewer = page.locator('.pswp');
    await expect(viewer).toBeVisible();
    await expect(viewer.locator('.pswp__counter')).toHaveText('3 / 15');
    await expect(page).toHaveURL(/#photo-3$/);

    await page.goBack();
    await expect(viewer).toHaveCount(0);
    await expect(page).toHaveURL(/\/japan\/$/);
  });

  test('a link to one photo opens it directly', async ({ page }) => {
    await page.goto('/greece/#photo-11');
    await expect(page.locator('.pswp__counter')).toHaveText('11 / 12');
  });

  test('close button closes it and cleans the URL', async ({ page }) => {
    await page.goto('/vietnam/');
    await page.locator('.gallery a').first().click();
    await viewerOpened(page);
    await page.locator('.pswp__button--close').click();
    await expect(page.locator('.pswp')).toHaveCount(0);
    await expect(page).toHaveURL(/\/vietnam\/$/);
  });
});

test.describe('map', () => {
  test('shows the route with a linked pin per destination', async ({ page }) => {
    await page.goto('/map/');
    await expect(page.locator('.leaflet-marker-icon')).toHaveCount(COUNTRIES.length + 1);
    await expect(page.locator('.leaflet-overlay-pane path')).toHaveCount(1);
    await expect(page.getByRole('button', { name: /^Japan/ })).toBeVisible(); // pins are named
    // the text route stays available to screen readers
    await expect(page.locator('.map-fallback li')).toHaveCount(COUNTRIES.length + 1);
  });
});

test.describe('local clock', () => {
  test('shows the time in the country', async ({ page }) => {
    await page.goto('/japan/');
    const time = await page.evaluate(() =>
      new Intl.DateTimeFormat('en-GB', { timeStyle: 'short', timeZone: 'Asia/Tokyo' }).format(
        new Date(),
      ),
    );
    await expect(page.locator('.local-clock time')).toHaveText(time);
  });
});

test.describe('without JavaScript', () => {
  test.use({ javaScriptEnabled: false });

  test('content, photos and the route are all there', async ({ page }) => {
    await page.goto('/');
    await expect(page.getByRole('heading', { name: 'Follow our journey' })).toBeVisible();
    await expect(page.locator('.timeline__card')).toHaveCount(COUNTRIES.length);

    await page.goto('/japan/');
    const first = page.locator('.gallery a').first();
    await expect(first).toHaveAttribute('href', /\.webp$/); // plain link to the full photo
    await expect(page.locator('.local-clock')).toBeHidden(); // no time without JS

    await page.goto('/map/');
    await expect(page.locator('.map-fallback')).toBeVisible();
    await expect(page.locator('.map-fallback a[href="/greece/"]')).toBeVisible();
  });
});
