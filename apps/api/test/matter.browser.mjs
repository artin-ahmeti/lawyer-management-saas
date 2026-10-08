import assert from 'node:assert/strict';
export async function verifyMatter({
  sql,
  firm,
  user,
  send,
  evaluate,
  waitFor,
  button,
  type,
  hasText,
  screenshot,
  listeners,
}) {
  const api = 'http://127.0.0.1:3300';
  let held;
  listeners.set('Fetch.requestPaused', (e) => {
    held = e.requestId;
  });
  await send('Fetch.enable', {
    patterns: [{ urlPattern: `${api}/matters`, requestStage: 'Request' }],
  });
  await send('Page.navigate', { url: 'http://localhost:3100/matters' });
  await waitFor(
    `Boolean(document.querySelector('[aria-label="Loading matters"]'))`,
    'matter loading',
  );
  await screenshot('01-matter-loading');
  assert(held);
  await send('Fetch.continueRequest', { requestId: held });
  await send('Fetch.disable');
  await waitFor(hasText('No accessible matters yet.'), 'authorized empty list');
  await screenshot('02-matter-empty');
  await button('New matter');
  await waitFor(`document.activeElement?.id==='matter-title'`, 'creation title focus');
  const tree = await send('Accessibility.getFullAXTree');
  assert(tree.nodes.some((n) => n.role?.value === 'textbox' && n.name?.value === 'Matter title'));
  await type('#matter-title', 'Advisory launch engagement');
  await send('Input.dispatchKeyEvent', {
    type: 'keyDown',
    key: 'Tab',
    code: 'Tab',
    windowsVirtualKeyCode: 9,
  });
  await send('Input.dispatchKeyEvent', {
    type: 'keyUp',
    key: 'Tab',
    code: 'Tab',
    windowsVirtualKeyCode: 9,
  });
  assert.equal(
    await evaluate(`document.activeElement?.getAttribute('aria-labelledby')`),
    'matter-reference-label',
  );
  await type('input[aria-labelledby="matter-reference-label"]', 'ADV-42');
  held = undefined;
  listeners.set('Fetch.requestPaused', (e) => {
    if (e.request.method === 'POST') held = e.requestId;
    else void send('Fetch.continueRequest', { requestId: e.requestId });
  });
  await send('Fetch.enable', {
    patterns: [{ urlPattern: `${api}/matters`, requestStage: 'Response' }],
  });
  await button('Create matter');
  await waitFor(hasText('Saving matter…'), 'pending command');
  for (let i = 0; i < 100 && !held; i++) await new Promise((r) => setTimeout(r, 30));
  assert(held, 'Committed response intercepted');
  const [matter] =
    await sql`select id,title from matters where firm_id=${firm} and created_by=${user}`;
  assert(matter?.id);
  assert.equal(matter.title, 'Advisory launch engagement');
  await send('Fetch.failRequest', { requestId: held, errorReason: 'ConnectionFailed' });
  await send('Fetch.disable');
  await waitFor(hasText('The result could not be confirmed.'), 'unknown response');
  await screenshot('03-matter-response-lost');
  assert.equal(
    await evaluate('document.querySelector("#matter-title")?.disabled'),
    true,
    'Uncertain intent cannot change input',
  );
  listeners.set('Fetch.requestPaused', (e) => {
    if (e.request.method !== 'GET')
      return void send('Fetch.continueRequest', { requestId: e.requestId });
    void send('Fetch.fulfillRequest', {
      requestId: e.requestId,
      responseCode: 503,
      responseHeaders: [
        { name: 'content-type', value: 'application/json' },
        { name: 'access-control-allow-origin', value: 'http://localhost:3100' },
      ],
      body: Buffer.from(JSON.stringify({ code: 'SERVICE_UNAVAILABLE' })).toString('base64'),
    });
  });
  await send('Fetch.enable', {
    patterns: [{ urlPattern: `${api}/matters`, requestStage: 'Request' }],
  });
  await button('Refresh matters');
  await waitFor(hasText('Matters could not be loaded'), 'list refresh failure');
  await send('Fetch.disable');
  await button('Retry matters');
  await waitFor(hasText('Matters visible to you'), 'list retry');
  assert.equal(
    await evaluate(
      `[...document.querySelectorAll('button')].some(b=>b.innerText==='Check matter request')`,
    ),
    true,
    'List refresh retains unresolved creation intent',
  );
  await button('Check matter request');
  await waitFor(hasText('Matter overview'), 'confirmed record navigation');
  await waitFor(
    `document.querySelector('h1')?.textContent==='Advisory launch engagement'`,
    'live matter title',
  );
  await send('Page.reload');
  await waitFor(hasText('Matter overview'), 'durable record after reload');
  assert.equal((await sql`select count(*)::int as n from matters where firm_id=${firm}`)[0]?.n, 1);
  assert.equal(
    (
      await sql`select count(*)::int as n from audit_logs where firm_id=${firm} and action='matter.create.v1'`
    )[0]?.n,
    1,
  );
  for (const width of [320, 768, 1024, 1440]) {
    await send('Emulation.setDeviceMetricsOverride', {
      width,
      height: 1000,
      deviceScaleFactor: 1,
      mobile: width === 320,
    });
    await waitFor(`innerWidth===${width}`, 'viewport');
    assert.equal(await evaluate('document.documentElement.scrollWidth <= innerWidth'), true);
    assert.equal(
      await evaluate(
        `[...document.querySelectorAll('.cl-card__title')].every(e=>e.scrollWidth<=e.clientWidth+1)`,
      ),
      true,
      'Card headings remain readable',
    );
    await screenshot(`04-matter-${width}`);
  }
  // A subsequent failed/denied read must hide the warm title and overview.
  listeners.set('Fetch.requestPaused', (e) => {
    if (e.request.method !== 'GET')
      return void send('Fetch.continueRequest', { requestId: e.requestId });
    return void send('Fetch.fulfillRequest', {
      requestId: e.requestId,
      responseCode: 503,
      responseHeaders: [
        { name: 'content-type', value: 'application/json' },
        { name: 'access-control-allow-origin', value: 'http://localhost:3100' },
      ],
      body: Buffer.from(JSON.stringify({ code: 'SERVICE_UNAVAILABLE' })).toString('base64'),
    });
  });
  await send('Fetch.enable', {
    patterns: [{ urlPattern: `${api}/matters/${matter.id}`, requestStage: 'Request' }],
  });
  await button('Refresh matter');
  await waitFor(hasText('Matter details could not be loaded'), 'read error');
  assert.equal(await evaluate(hasText('Advisory launch engagement')), false);
  await screenshot('05-matter-read-error');
  await send('Fetch.disable');
  await button('Retry matter');
  await waitFor(hasText('Matter overview'), 'read retry');
  await sql`update matter_access set deleted_at=now() where firm_id=${firm} and matter_id=${matter.id} and user_id=${user}`;
  await button('Refresh matter');
  await waitFor(hasText('This matter is unavailable'), 'revoked grant');
  assert.equal(await evaluate(hasText('Advisory launch engagement')), false);
  await screenshot('06-matter-revoked');
  await send('Page.navigate', { url: 'http://localhost:3100/matters' });
  await waitFor(hasText('No accessible matters yet.'), 'revocation removes list record');
  await sql`update firm_members set role='readonly' where firm_id=${firm} and user_id=${user}`;
  await send('Page.reload');
  await waitFor(hasText('No accessible matters yet.'), 'live readonly role');
  assert.equal(
    await evaluate(`[...document.querySelectorAll('button')].some(b=>b.innerText==='New matter')`),
    false,
    'Claimed owner token does not enable creation',
  );
  await screenshot('07-matter-readonly');
}
