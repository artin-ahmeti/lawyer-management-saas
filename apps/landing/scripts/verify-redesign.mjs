/** Browser regression checks; Playwright is a verification tool, not a runtime dependency.
 * PLAYWRIGHT=/path/to/playwright/index.mjs CHROMIUM_PATH=/path/to/chromium node scripts/verify-redesign.mjs
 * Optional AXE_PATH enables the WCAG audit; EVIDENCE_DIR saves reviewed screenshots/results.
 */
import assert from 'node:assert/strict';
import { createHash } from 'node:crypto';
import { mkdirSync, writeFileSync } from 'node:fs';
import { resolve } from 'node:path';

const { chromium } = await import(process.env.PLAYWRIGHT ?? 'playwright');
const base = process.env.LANDING_URL ?? 'http://localhost:3200';
const evidence = process.env.EVIDENCE_DIR;
if (evidence) mkdirSync(evidence, { recursive: true });
const browser = await chromium.launch({
  executablePath: process.env.CHROMIUM_PATH,
  args: [
    '--no-sandbox',
    '--disable-dev-shm-usage',
    '--use-angle=swiftshader',
    '--enable-unsafe-swiftshader',
  ],
});
const results = [];
const errors = [];
const check = async (name, run) => {
  await run();
  results.push(name);
  console.log(`PASS ${name}`);
};
const observe = (page) => {
  page.on('pageerror', (error) => errors.push(error.message));
  page.on('console', (message) => {
    if (message.type() === 'error' && /hydration|did not match|uncaught/i.test(message.text()))
      errors.push(message.text());
  });
};
const screenshot = async (page, name) => {
  if (evidence)
    await page.screenshot({ path: resolve(evidence, `${name}.png`), animations: 'disabled' });
};
const waitVisible = (locator) => locator.waitFor({ state: 'visible' });

try {
  await check('Server-rendered dark default and saved light without JavaScript', async () => {
    for (const theme of ['dark', 'light']) {
      const context = await browser.newContext({ javaScriptEnabled: false, colorScheme: 'light' });
      if (theme === 'light')
        await context.addCookies([{ name: 'clepso-landing-theme', value: theme, url: base }]);
      const page = await context.newPage();
      await page.goto(base);
      assert.equal(await page.locator('html').getAttribute('data-theme'), theme);
      assert.equal(await page.getByRole('heading', { level: 1 }).count(), 1);
      await context.close();
    }
  });

  const context = await browser.newContext({
    viewport: { width: 1440, height: 1000 },
    reducedMotion: 'reduce',
    colorScheme: 'light',
  });
  const page = await context.newPage();
  observe(page);
  await page.goto(base, { waitUntil: 'networkidle' });
  await page.addStyleTag({ content: 'nextjs-portal { display: none !important; }' });
  await check('Responsive dark/light layouts and complete static imagery', async () => {
    for (const theme of ['dark', 'light']) {
      if (theme === 'light')
        await page.getByRole('button', { name: 'Switch to light theme' }).first().click();
      for (const width of [320, 390, 768, 1024, 1440]) {
        await page.setViewportSize({ width, height: width < 640 ? 844 : 1000 });
        await page.evaluate(() => window.scrollTo(0, 0));
        assert.ok(
          await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth),
          `${theme} ${width}: horizontal overflow`,
        );
        await page.locator('.vessel-object img').evaluate((img) => img.decode());
        assert.ok(await page.locator('.vessel-object img').evaluate((img) => img.naturalWidth > 0));
        assert.equal(await page.locator('.motion-controls').count(), 0);
        assert.equal(await page.locator('.vessel-canvas').getAttribute('data-ready'), 'false');
        const fits = await page.evaluate(() => {
          const card = document.querySelector('.hero-output').getBoundingClientRect();
          const stage = document.querySelector('.clepsydra-stage').getBoundingClientRect();
          return card.bottom <= stage.bottom + 1;
        });
        assert.ok(fits, `${theme} ${width}: hero result overlaps product title`);
        if ([390, 1440].includes(width)) await screenshot(page, `${theme}-${width}-hero`);
      }
    }
  });

  await check('Theme persistence, product keyboard tabs and task state', async () => {
    await page.reload({ waitUntil: 'networkidle' });
    assert.equal(await page.locator('html').getAttribute('data-theme'), 'light');
    const overview = page.getByRole('tab', { name: 'Overview', exact: true });
    await overview.focus();
    await page.keyboard.press('ArrowRight');
    assert.equal(
      await page
        .getByRole('tab', { name: 'Next actions', exact: true })
        .getAttribute('aria-selected'),
      'true',
    );
    const task = page.locator('#product-panel-actions').getByRole('checkbox').first();
    await task.check();
    await page.getByRole('tab', { name: 'Activity', exact: true }).click();
    await page.getByRole('tab', { name: 'Next actions', exact: true }).click();
    assert.equal(await task.isChecked(), true);
    await page.getByRole('button', { name: 'Switch to dark theme' }).first().click();
    assert.equal(await task.isChecked(), true);
    await overview.click();
    await page
      .locator('#product')
      .evaluate((e) => window.scrollTo(0, e.getBoundingClientRect().top + scrollY - 90));
    await screenshot(page, 'dark-1440-product');
  });

  await check('All four AI review/edit/reset flows and state across tabs/themes', async () => {
    const email = page.locator('#ai-panel-email');
    await email.getByRole('button', { name: 'Review suggested actions' }).click();
    await email.getByRole('checkbox').first().uncheck();
    await email.getByRole('button', { name: 'Confirm 2 actions' }).click();
    await waitVisible(email.getByRole('button', { name: 'Reset sample' }));
    await page.locator('#ai-tab-brief').click();
    const brief = page.locator('#ai-panel-brief');
    const source = brief.getByRole('button', { name: /open source excerpt/ }).first();
    await source.click();
    await waitVisible(brief.getByRole('region', { name: /Source:/ }));
    await page.keyboard.press('Escape');
    assert.equal(await source.evaluate((e) => e === document.activeElement), true);
    await brief.getByRole('radio').last().check();
    await brief.getByRole('button', { name: 'Mark brief as reviewed' }).click();
    await waitVisible(brief.getByRole('button', { name: 'Reset sample' }));
    await page.locator('#ai-tab-time').click();
    const time = page.locator('#ai-panel-time');
    await time.getByRole('button', { name: 'Increase by 0.1 hour' }).click();
    await time.getByRole('textbox', { name: 'Narrative' }).fill('Reviewed revised agreement.');
    await time.getByRole('button', { name: 'Review time entry' }).click();
    await time.getByRole('button', { name: 'Save entry' }).click();
    await waitVisible(time.getByRole('button', { name: 'Reset sample' }));
    await page.locator('#ai-tab-update').click();
    const update = page.locator('#ai-panel-update');
    await update.getByRole('button', { name: 'Edit draft' }).click();
    await update
      .getByRole('textbox')
      .fill('We reviewed the revised agreement. Our comments will follow by Friday, October 9.');
    await update.getByRole('button', { name: 'Done editing' }).click();
    await update.getByRole('button', { name: 'Approve draft' }).click();
    await waitVisible(update.getByRole('button', { name: 'Reset sample' }));
    await page.getByRole('button', { name: 'Switch to light theme' }).first().click();
    await page.locator('#ai-tab-email').click();
    await waitVisible(email.getByRole('button', { name: 'Reset sample' }));
    for (const id of ['email', 'brief', 'time', 'update']) {
      await page.locator(`#ai-tab-${id}`).click();
      await page.locator(`#ai-panel-${id}`).getByRole('button', { name: 'Reset sample' }).click();
    }
    await page.locator('#ai-tab-email').click();
    await page
      .locator('#ai')
      .evaluate((e) => window.scrollTo(0, e.getBoundingClientRect().top + scrollY - 90));
    await screenshot(page, 'light-1440-ai');
  });

  await check('FAQ disclosure and CTA dialog focus restoration', async () => {
    const question = page.locator('#faq summary').first();
    await question.click();
    assert.equal(await page.locator('#faq details').first().getAttribute('open'), '');
    await question.click();
    const cta = page.locator('.hero-actions').getByRole('button').first();
    await cta.click();
    await waitVisible(page.locator('dialog[open]'));
    await page.keyboard.press('Escape');
    await page.locator('dialog[open]').waitFor({ state: 'hidden' });
    assert.equal(await cta.evaluate((e) => e === document.activeElement), true);
  });

  await check('Mobile menu keyboard, theme, scroll lock and navigation', async () => {
    await page.setViewportSize({ width: 390, height: 844 });
    const opener = page.getByRole('button', { name: 'Open menu' });
    await opener.click();
    assert.equal(await page.evaluate(() => document.body.style.overflow), 'hidden');
    const menu = page.getByRole('dialog', { name: 'Menu', exact: true });
    await menu.getByRole('button', { name: 'Switch to dark theme' }).click();
    await menu.getByRole('link', { name: 'Product', exact: true }).click();
    await menu.waitFor({ state: 'hidden' });
    assert.equal(await page.evaluate(() => document.body.style.overflow), '');
    await opener.click();
    await page.keyboard.press('Escape');
    assert.equal(await opener.evaluate((e) => e === document.activeElement), true);
    await opener.click();
    await page.setViewportSize({ width: 1024, height: 768 });
    await page.waitForFunction(() => !document.querySelector('dialog[aria-label="Menu"]').open);
    assert.equal(await page.evaluate(() => document.body.style.overflow), '');
  });

  if (process.env.AXE_PATH)
    await check('WCAG 2.1 A/AA automated audit, desktop/mobile in both themes', async () => {
      for (const theme of ['dark', 'light']) {
        if ((await page.locator('html').getAttribute('data-theme')) !== theme)
          await page
            .getByRole('button', { name: `Switch to ${theme} theme` })
            .first()
            .click();
        for (const width of [390, 1440]) {
          await page.setViewportSize({ width, height: 1000 });
          await page.addStyleTag({ content: 'nextjs-portal { display:none !important; }' });
          await page.addScriptTag({ path: process.env.AXE_PATH });
          const audit = await page.evaluate(async () =>
            window.axe.run(document, {
              runOnly: { type: 'tag', values: ['wcag2a', 'wcag2aa', 'wcag21a', 'wcag21aa'] },
            }),
          );
          assert.deepEqual(
            audit.violations.map((v) => ({ id: v.id, nodes: v.nodes.map((n) => n.target) })),
            [],
            `${theme} ${width} WCAG violations`,
          );
        }
      }
    });
  await context.close();

  await check(
    'Desktop canvas, pause before load, freeze, resume and live reduced motion',
    async () => {
      const motionContext = await browser.newContext({
        viewport: { width: 1440, height: 1000 },
        reducedMotion: 'no-preference',
      });
      const motion = await motionContext.newPage();
      observe(motion);
      await motion.addInitScript(() => {
        window.__vesselDraws = 0;
        for (const name of [
          'drawElements',
          'drawArrays',
          'drawElementsInstanced',
          'drawArraysInstanced',
        ]) {
          const original = WebGL2RenderingContext.prototype[name];
          WebGL2RenderingContext.prototype[name] = function (...args) {
            if (this.canvas.classList.contains('vessel-canvas')) window.__vesselDraws++;
            return original.apply(this, args);
          };
        }
      });
      // Delay only the optional scene, exercising a real user pausing before it is ready.
      await motion.route(/.*vessel-scene.*\.js.*/, async (route) => {
        await new Promise((r) => setTimeout(r, 700));
        await route.continue();
      });
      await motion.goto(base, { waitUntil: 'domcontentloaded' });
      await motion.getByRole('button', { name: 'Pause motion' }).click();
      await motion.locator('.vessel-canvas[data-ready="true"]').waitFor({ timeout: 30000 });
      const canvas = motion.locator('.vessel-canvas');
      await motion.waitForFunction(
        () => getComputedStyle(document.querySelector('.vessel-canvas')).opacity === '1',
      );
      const hash = async () =>
        createHash('sha256')
          .update(await canvas.screenshot())
          .digest('hex');
      const before = await hash();
      await motion.mouse.move(50, 100);
      await motion.waitForTimeout(350);
      assert.equal(
        await hash(),
        before,
        'paused canvas must freeze light, grains and pointer response',
      );
      await motion.getByRole('button', { name: 'Play motion' }).click();
      await motion.waitForTimeout(350);
      assert.notEqual(await hash(), before, 'resumed canvas must animate');
      await motion.evaluate(() =>
        scrollTo({ top: document.documentElement.scrollHeight, behavior: 'instant' }),
      );
      await motion.waitForTimeout(250);
      const offScreen = await motion.evaluate(() => window.__vesselDraws);
      assert.ok(offScreen > 0, 'draw counter must observe the real scene');
      await motion.waitForTimeout(250);
      assert.equal(
        await motion.evaluate(() => window.__vesselDraws),
        offScreen,
        'offscreen scene must stop drawing',
      );
      await canvas.scrollIntoViewIfNeeded();
      await motion.waitForFunction((previous) => window.__vesselDraws > previous, offScreen);
      assert.ok(
        (await motion.evaluate(() => window.__vesselDraws)) > offScreen,
        'visible scene must resume drawing',
      );
      await motion.evaluate(() => {
        Object.defineProperty(document, 'visibilityState', { configurable: true, value: 'hidden' });
        document.dispatchEvent(new Event('visibilitychange'));
      });
      await motion.waitForTimeout(250);
      const hidden = await motion.evaluate(() => window.__vesselDraws);
      await motion.waitForTimeout(250);
      assert.equal(
        await motion.evaluate(() => window.__vesselDraws),
        hidden,
        'hidden tab must stop drawing',
      );
      await motion.evaluate(() => {
        delete document.visibilityState;
        document.dispatchEvent(new Event('visibilitychange'));
      });
      await motion.emulateMedia({ reducedMotion: 'reduce' });
      await motion.locator('.vessel-canvas[data-ready="false"]').waitFor();
      assert.equal(await motion.locator('.motion-controls').count(), 0);
      await motion.locator('.vessel-object img').evaluate((img) => img.decode());
      assert.equal(
        await motion.locator('.vessel-object img').evaluate((img) => getComputedStyle(img).opacity),
        '1',
      );
      await motion.emulateMedia({ reducedMotion: 'no-preference' });
      await motion.locator('.vessel-canvas[data-ready="true"]').waitFor({ timeout: 30000 });
      await canvas.dispatchEvent('webglcontextlost');
      await motion.locator('.vessel-canvas[data-ready="false"]').waitFor();
      await motion.waitForFunction(
        () => getComputedStyle(document.querySelector('.vessel-object img')).opacity === '1',
      );
      assert.equal(
        await motion.locator('.vessel-object img').evaluate((img) => getComputedStyle(img).opacity),
        '1',
      );
      await motionContext.close();
    },
  );

  await check('Data saver and no WebGL retain the static hero', async () => {
    for (const fallback of ['data-saver', 'no-webgl']) {
      const c = await browser.newContext({ viewport: { width: 1440, height: 1000 } });
      const p = await c.newPage();
      observe(p);
      await p.addInitScript((mode) => {
        if (mode === 'data-saver')
          Object.defineProperty(navigator, 'connection', { value: { saveData: true } });
        else {
          const get = HTMLCanvasElement.prototype.getContext;
          HTMLCanvasElement.prototype.getContext = function (type, ...args) {
            if (String(type).startsWith('webgl')) return null;
            return get.call(this, type, ...args);
          };
        }
      }, fallback);
      await p.goto(base, { waitUntil: 'networkidle' });
      assert.equal(await p.locator('.vessel-canvas').getAttribute('data-ready'), 'false');
      await p.locator('.vessel-object img').evaluate((img) => img.decode());
      await c.close();
    }
  });
  assert.deepEqual(errors, [], 'Browser runtime/hydration errors');
  if (evidence)
    writeFileSync(
      resolve(evidence, 'browser-results.json'),
      JSON.stringify(
        { checkedAt: new Date().toISOString(), results, runtimeErrors: errors },
        null,
        2,
      ) + '\n',
    );
  console.log(`All ${results.length} browser check groups passed.`);
} finally {
  await browser.close();
}
