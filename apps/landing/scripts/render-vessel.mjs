// Renders the hero vessel from the real three.js scene into the static images the
// page shows first (and keeps on phones, reduced motion and no-WebGL devices).
//
//   pnpm --filter @lawfirm/landing dev          # in one terminal
//   pnpm --filter @lawfirm/landing render:vessel
//
// Needs Playwright's Chromium. It is not a project dependency: set PLAYWRIGHT to
// a module path, or run where `playwright` resolves.
import { mkdirSync, writeFileSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const here = dirname(fileURLToPath(import.meta.url));
const out = resolve(here, '../public/vessel');
const base = process.env.LANDING_URL ?? 'http://localhost:3200';
const { chromium } = await import(process.env.PLAYWRIGHT ?? 'playwright');

const browser = await chromium.launch({
  executablePath: process.env.CHROMIUM_PATH,
  args: ['--no-sandbox', '--use-angle=swiftshader', '--enable-unsafe-swiftshader'],
});
const page = await browser.newPage({
  viewport: { width: 1000, height: 1250 },
  deviceScaleFactor: 1.2,
});
try {
  for (const theme of ['dark', 'light']) {
    await page.context().addCookies([{ name: 'clepso-landing-theme', value: theme, url: base }]);
    await page.goto(`${base}/dev/vessel`, { waitUntil: 'networkidle' });
    await page.waitForSelector('#vessel[data-ready="true"]', { timeout: 60_000 });
    // Keep the Next dev indicator out of the capture.
    await page.addStyleTag({ content: 'nextjs-portal { display: none !important; }' });
    await page.waitForTimeout(600);
    const png = await page.locator('#vessel').screenshot({ omitBackground: true });

    // Encode WebP in the browser (alpha preserved) at the sizes the page requests.
    const encoded = await page.evaluate(
      async (dataUrl) => {
        const img = new Image();
        img.src = dataUrl;
        await img.decode();
        const sizes = [1200, 720, 480];
        const result = {};
        for (const w of sizes) {
          const h = Math.round((w * img.naturalHeight) / img.naturalWidth);
          const c = document.createElement('canvas');
          c.width = w;
          c.height = h;
          const ctx = c.getContext('2d');
          ctx.imageSmoothingQuality = 'high';
          ctx.drawImage(img, 0, 0, w, h);
          result[w] = { webp: c.toDataURL('image/webp', 0.84), h };
        }
        return result;
      },
      `data:image/png;base64,${png.toString('base64')}`,
    );

    mkdirSync(out, { recursive: true });
    for (const [w, v] of Object.entries(encoded)) {
      const prefix = theme === 'light' ? 'vessel-light' : 'vessel';
      writeFileSync(
        resolve(out, `${prefix}-${w}.webp`),
        Buffer.from(v.webp.split(',')[1], 'base64'),
      );
      console.log(`${prefix}-${w}.webp ${w}×${v.h}`);
    }
  }
} finally {
  await browser.close();
}
