/** Production-only local lab samples. Run without other CPU-heavy checks.
 * PLAYWRIGHT=/path/to/playwright/index.mjs CHROMIUM_PATH=/path/to/chromium
 * PERFORMANCE_OUT=/path/to/performance.json node scripts/measure-performance.mjs
 */
import { writeFileSync } from 'node:fs';
const { chromium } = await import(process.env.PLAYWRIGHT ?? 'playwright');
const base = process.env.LANDING_URL ?? 'http://localhost:3200';
const output = process.env.PERFORMANCE_OUT ?? '/tmp/clepso-landing-performance.json';
const browser = await chromium.launch({
  executablePath: process.env.CHROMIUM_PATH,
  args: ['--no-sandbox', '--disable-dev-shm-usage'],
});
const samples = [];
try {
  for (const profile of ['desktop', 'mobile'])
    for (let run = 1; run <= 3; run++) {
      const context = await browser.newContext({
        viewport:
          profile === 'mobile' ? { width: 390, height: 844 } : { width: 1440, height: 1000 },
        isMobile: profile === 'mobile',
        hasTouch: profile === 'mobile',
        deviceScaleFactor: 1,
      });
      const page = await context.newPage();
      const failures = [];
      page.on('pageerror', (e) => failures.push(e.message));
      page.on('response', (r) => {
        if (r.status() >= 400 && !r.url().endsWith('/favicon.ico'))
          failures.push(r.status() + ' ' + r.url());
      });
      const cdp = await context.newCDPSession(page);
      await cdp.send('Network.enable');
      await cdp.send('Network.setCacheDisabled', { cacheDisabled: true });
      if (profile === 'mobile') {
        await cdp.send('Emulation.setCPUThrottlingRate', { rate: 4 });
        await cdp.send('Network.emulateNetworkConditions', {
          offline: false,
          latency: 150,
          downloadThroughput: 1600000 / 8,
          uploadThroughput: 750000 / 8,
        });
      }
      await page.addInitScript(() => {
        window.metrics = { lcp: 0, cls: 0, lcpElement: '' };
        new PerformanceObserver((list) => {
          for (const e of list.getEntries()) {
            window.metrics.lcp = e.startTime;
            window.metrics.lcpElement = e.element?.tagName + '.' + e.element?.className;
          }
        }).observe({ type: 'largest-contentful-paint', buffered: true });
        new PerformanceObserver((list) => {
          for (const e of list.getEntries()) if (!e.hadRecentInput) window.metrics.cls += e.value;
        }).observe({ type: 'layout-shift', buffered: true });
      });
      await page.goto(base, { waitUntil: 'networkidle' });
      await page.waitForTimeout(900);
      if (failures.length) throw new Error(failures.join('\n'));
      const result = await page.evaluate(() => ({
        ...window.metrics,
        ttfb: performance.getEntriesByType('navigation')[0].responseStart,
        transferBytes: performance
          .getEntriesByType('resource')
          .reduce((sum, e) => sum + e.transferSize, 0),
        jsBytes: performance
          .getEntriesByType('resource')
          .filter((e) => e.name.endsWith('.js'))
          .reduce((sum, e) => sum + e.transferSize, 0),
        height: document.documentElement.scrollHeight,
        canvasReady: document.querySelector('.vessel-canvas').dataset.ready,
      }));
      samples.push({ profile, run, ...result });
      console.log(profile, run, JSON.stringify(result));
      await context.close();
    }
  writeFileSync(
    output,
    JSON.stringify(
      {
        testedAt: new Date().toISOString(),
        browser: await browser.version(),
        server: `next start at ${base}`,
        cache: 'Cold browser cache per sample; local production server shared across runs',
        desktop: '1440x1000, DPR 1, no network/CPU throttle',
        mobile:
          '390x844, DPR 1, touch/mobile emulation, 4x CPU, 1.6 Mbps download / 750 Kbps upload, 150 ms latency',
        notes:
          'Local lab samples, not field Core Web Vitals. Desktop uses this container Chromium WebGL support; hardware animation frame rates are not measured.',
        samples,
      },
      null,
      2,
    ) + '\n',
  );
} finally {
  await browser.close();
}
