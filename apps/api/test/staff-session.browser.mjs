import assert from 'node:assert/strict';

export async function verifyStaffSession({
  sql,
  firm,
  user,
  email,
  password,
  type,
  send,
  evaluate,
  waitFor,
  button,
  hasText,
  screenshot,
  listeners,
}) {
  await screenshot('01-session-before');
  assert(
    await evaluate(`Boolean(document.querySelector('[aria-label="Your session"] button'))`),
    'Live Settings exposes a sign-out action',
  );
  await waitFor(
    `document.querySelector('[aria-label="Your workspaces"]')?.innerText.includes('Browser firm LLP')`,
    'authorized workspace discovery',
  );
  const privateFirm = crypto.randomUUID();
  await sql`insert into firms (id, name) values (${privateFirm}, 'Excluded private workspace')`;
  try {
    await button('Refresh workspaces');
    await waitFor(
      `!document.querySelector('[aria-label="Loading workspaces"]')`,
      'membership refresh',
    );
    assert.equal(await evaluate(hasText('Excluded private workspace')), false);
    let heldRead;
    listeners.set('Fetch.requestPaused', (event) => {
      if (event.request.method === 'GET') heldRead = event.requestId;
      else void send('Fetch.continueRequest', { requestId: event.requestId });
    });
    await send('Fetch.enable', {
      patterns: [
        { urlPattern: 'http://127.0.0.1:3300/auth/memberships*', requestStage: 'Request' },
      ],
    });
    await button('Refresh workspaces');
    await waitFor(
      `Boolean(document.querySelector('[aria-label="Loading workspaces"]'))`,
      'membership loading hides warm names',
    );
    await screenshot('02-memberships-loading');
    await waitFor(hasText('Your workspaces'), 'workspace heading persists');
    assert(heldRead);
    await send('Fetch.failRequest', { requestId: heldRead, errorReason: 'ConnectionFailed' });
    await waitFor(hasText('Your workspaces could not be loaded'), 'read failure');
    assert.equal(
      await evaluate(
        `document.querySelector('[aria-label="Your workspaces"]').innerText.includes('Browser firm LLP')`,
      ),
      false,
    );
    await screenshot('03-memberships-error');
    await send('Fetch.disable');
    await button('Refresh workspaces');
    await waitFor(
      `document.querySelector('[aria-label="Your workspaces"]')?.innerText.includes('Browser firm LLP')`,
      'read retry',
    );
    await sql`update firm_members set role = 'paralegal' where firm_id = ${firm} and user_id = ${user}`;
    await button('Refresh workspaces');
    await waitFor(
      `document.querySelector('[aria-label="Your workspaces"]')?.innerText.includes('Paralegal')`,
      'live role replaces owner claim',
    );
    await sql`update auth.users set banned_until = now() + interval '1 hour' where id = ${user}`;
    try {
      await button('Refresh workspaces');
      await waitFor(
        hasText('Workspace access unavailable'),
        'live account denial hides cached names',
      );
      assert.equal(
        await evaluate(
          `document.querySelector('[aria-label="Your workspaces"]').innerText.includes('Browser firm LLP')`,
        ),
        false,
      );
      await screenshot('07-memberships-denied');
    } finally {
      await sql`update auth.users set banned_until = null where id = ${user}`;
    }
    await sql`update firm_members set deleted_at = now() where user_id = ${user}`;
    try {
      await button('Refresh workspaces');
      await waitFor(
        hasText('No current staff memberships on this page.'),
        'confirmed account has an empty membership list',
      );
      await screenshot('08-memberships-empty');
    } finally {
      await sql`update firm_members set deleted_at = null where user_id = ${user}`;
    }
    await button('Refresh workspaces');
    await waitFor(
      `document.querySelector('[aria-label="Your workspaces"]')?.innerText.includes('Browser firm LLP')`,
      'restored test fixture is re-read',
    );
    for (const width of [320, 768, 1024, 1440]) {
      await send('Emulation.setDeviceMetricsOverride', {
        width,
        height: 1000,
        deviceScaleFactor: 1,
        mobile: false,
      });
      await waitFor(
        `innerWidth === ${width} && document.documentElement.scrollWidth <= innerWidth`,
        `responsive ${width}px`,
      );
      await screenshot(`04-session-${width}`);
    }
    const tree = await send('Accessibility.getFullAXTree');
    assert(
      tree.nodes.some((node) => node.role?.value === 'button' && node.name?.value === 'Sign out'),
    );
    await send('Fetch.enable', {
      patterns: [{ urlPattern: 'http://127.0.0.1:54321/auth/v1/logout*', requestStage: 'Request' }],
    });
    let resolveLogout;
    let logoutDeadline;
    const pausedLogout = new Promise((resolve, reject) => {
      logoutDeadline = setTimeout(
        () => reject(new Error('Auth logout request did not arrive')),
        15000,
      );
      resolveLogout = (id) => {
        clearTimeout(logoutDeadline);
        resolve(id);
      };
    });
    listeners.set('Fetch.requestPaused', (event) => {
      if (event.request.method === 'POST') resolveLogout(event.requestId);
      else void send('Fetch.continueRequest', { requestId: event.requestId });
    });
    await button('Sign out');
    await waitFor(hasText('Signing out…'), 'pending session exit');
    assert(await evaluate(`document.querySelector('[aria-label="Your session"] button').disabled`));
    const heldLogout = await pausedLogout;
    assert(heldLogout);
    await send('Fetch.fulfillRequest', {
      requestId: heldLogout,
      responseCode: 503,
      responseHeaders: [
        { name: 'Access-Control-Allow-Origin', value: 'http://localhost:3100' },
        { name: 'Content-Type', value: 'application/json' },
      ],
      body: Buffer.from(JSON.stringify({ message: 'Test-owned Auth outage' })).toString('base64'),
    });
    await waitFor(
      `location.pathname === '/sign-in' && document.body.innerText.includes('Session revocation could not be confirmed.')`,
      'SDK removes local session with truthful remote failure notice',
    );
    assert.equal(await evaluate(hasText('Browser firm LLP')), false);
    await screenshot('05-sign-out-unconfirmed');
    await send('Fetch.disable');
    await send('Page.navigate', { url: 'http://localhost:3100/sign-in?next=/settings' });
    await waitFor(
      `Boolean(document.querySelector('input[type="email"]')) && Object.keys(document.querySelector('input[type="email"]')).some(key => key.startsWith('__reactProps'))`,
      'interactive sign-in for retry',
    );
    await type('input[type="email"]', email);
    await type('input[type="password"]', password);
    await button('Sign in');
    await waitFor(
      `document.querySelector('[aria-label="Your workspaces"]')?.innerText.includes('Browser firm LLP')`,
      'new confirmed sign-in',
    );
    await button('Sign out');
    await waitFor(
      `location.pathname === '/sign-in' && Boolean(document.querySelector('input[type="email"]'))`,
      'actual sign-out',
    );
    assert.equal(await evaluate(hasText('Browser firm LLP')), false);
    await screenshot('06-signed-out');
    await send('Page.navigate', { url: 'http://localhost:3100/settings' });
    await waitFor(`location.pathname === '/sign-in'`, 'protected navigation after logout');
    assert.equal(await evaluate(hasText('Browser firm LLP')), false);
  } finally {
    await sql`delete from firms where id = ${privateFirm}`;
  }
}
