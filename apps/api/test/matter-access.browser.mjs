import assert from 'node:assert/strict';
import { randomUUID } from 'node:crypto';
import { SignJWT } from 'jose';

export async function verifyMatterAccess({
  sql,
  firm,
  user,
  ownedUsers,
  send,
  evaluate,
  waitFor,
  button,
  type,
  hasText,
  screenshot,
  listeners,
}) {
  const api = 'http://127.0.0.1:3300',
    target = randomUUID(),
    session = randomUUID();
  ownedUsers.push(target);
  await sql`insert into auth.users(id,email,email_confirmed_at,raw_user_meta_data) values (${target},${`${target}@access.browser.test`},now(),'{}'::jsonb)`;
  await sql`update profiles set full_name='Review Attorney' where id=${target}`;
  await sql`insert into auth.sessions(id,user_id) values (${session},${target})`;
  await sql`insert into firm_members(firm_id,user_id,role) values (${firm},${target},'attorney')`;
  const targetToken = await new SignJWT({
    role: 'authenticated',
    firm_id: firm,
    session_id: session,
    user_role: 'owner',
  })
    .setSubject(target)
    .setIssuer('http://127.0.0.1:54321/auth/v1')
    .setAudience('authenticated')
    .setProtectedHeader({ alg: 'HS256' })
    .setExpirationTime('30m')
    .sign(new TextEncoder().encode('super-secret-jwt-token-with-at-least-32-characters-long'));
  const targetRequest = (path, input) =>
    fetch(`${api}/matters${path}`, {
      method: input ? 'POST' : 'GET',
      headers: {
        Authorization: `Bearer ${targetToken}`,
        'Content-Type': 'application/json',
        'Idempotency-Key': randomUUID(),
      },
      ...(input ? { body: JSON.stringify(input) } : {}),
    });
  async function key(name, code) {
    await send('Input.dispatchKeyEvent', {
      type: 'rawKeyDown',
      key: name,
      code: name,
      windowsVirtualKeyCode: code,
      nativeVirtualKeyCode: { ArrowDown: 125, ArrowUp: 126, Tab: 48, Home: 115, Enter: 36 }[name],
    });
    await send('Input.dispatchKeyEvent', {
      type: 'keyUp',
      key: name,
      code: name,
      windowsVirtualKeyCode: code,
      nativeVirtualKeyCode: { ArrowDown: 125, ArrowUp: 126, Tab: 48, Home: 115, Enter: 36 }[name],
    });
  }
  async function select(selector, value) {
    const index = await evaluate(
      `[...document.querySelector(${JSON.stringify(selector)}).options].findIndex(o=>o.value===${JSON.stringify(value)})`,
    );
    assert(index >= 0, 'Choice exists');
    const { result: element } = await send('Runtime.evaluate', {
      expression: `document.querySelector(${JSON.stringify(selector)})`,
    });
    await send('DOM.focus', { objectId: element.objectId });
    await send('Runtime.releaseObject', { objectId: element.objectId });
    const label = await evaluate(
      `document.querySelector(${JSON.stringify(selector)}).options[${index}].textContent`,
    );
    for (const character of label.split(' · ')[0]) {
      await send('Input.dispatchKeyEvent', {
        type: 'char',
        text: character,
        unmodifiedText: character,
        key: character,
      });
    }
    await key('Tab', 9);
    await waitFor(
      `document.querySelector(${JSON.stringify(selector)})?.value===${JSON.stringify(value)}`,
      'native select choice',
    );
  }
  await send('Page.navigate', { url: 'http://localhost:3100/matters' });
  await waitFor(hasText('No accessible matters yet.'), 'empty fixture matter list');
  await button('New matter');
  await type('#matter-title', 'Access review engagement');
  let held;
  listeners.set('Fetch.requestPaused', (e) => {
    if (e.request.method === 'GET') held = e.requestId;
    else void send('Fetch.continueRequest', { requestId: e.requestId });
  });
  await send('Fetch.enable', {
    patterns: [{ urlPattern: `${api}/matters/*/access`, requestStage: 'Request' }],
  });
  await button('Create matter');
  await waitFor(
    `Boolean(document.querySelector('[aria-label="Loading staff access"]'))`,
    'staff access loading',
  );
  await screenshot('01-access-loading');
  assert(held);
  await send('Fetch.continueRequest', { requestId: held });
  await send('Fetch.disable');
  await waitFor(hasText('No access changes recorded yet.'), 'empty access history');
  const [matter] = await sql`select id from matters where firm_id=${firm} and created_by=${user}`;
  assert(matter?.id);
  assert.equal((await targetRequest(`/${matter.id}`)).status, 404, 'Ungrant staff cannot read');
  const ax = await send('Accessibility.getFullAXTree');
  assert(ax.nodes.some((n) => n.role?.value === 'combobox' && n.name?.value === 'Staff member'));
  assert(
    ax.nodes.some(
      (n) => n.role?.value === 'textbox' && n.name?.value === 'Reason for access change',
    ),
  );
  await select('#matter-access-person', target);
  assert.equal(
    await evaluate('document.activeElement?.id'),
    'matter-access-role',
    'Keyboard moves between choices',
  );
  await type('#matter-access-reason', 'Staff assignment reviewed for advisory work');
  held = undefined;
  listeners.set('Fetch.requestPaused', (e) => {
    if (e.request.method === 'POST') held = e.requestId;
    else void send('Fetch.continueRequest', { requestId: e.requestId });
  });
  await send('Fetch.enable', {
    patterns: [
      { urlPattern: `${api}/matters/${matter.id}/access-changes`, requestStage: 'Response' },
    ],
  });
  await button('Apply access change');
  await waitFor(hasText('Saving access…'), 'pending access command');
  for (let i = 0; i < 100 && !held; i++) await new Promise((r) => setTimeout(r, 30));
  assert(held, 'Committed access response intercepted');
  assert.equal(
    (await sql`select access_revision from matters where id=${matter.id}`)[0]?.access_revision,
    2,
  );
  await send('Fetch.failRequest', { requestId: held, errorReason: 'ConnectionFailed' });
  await send('Fetch.disable');
  await waitFor(hasText('The result could not be confirmed.'), 'unknown access response');
  await screenshot('02-access-response-lost');
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
    patterns: [{ urlPattern: `${api}/matters/${matter.id}/access`, requestStage: 'Request' }],
  });
  await button('Refresh staff access');
  await waitFor(hasText('Staff access could not be loaded'), 'staff read failure');
  assert.equal(
    await evaluate(hasText('Review Attorney')),
    false,
    'Read error hides protected names',
  );
  await screenshot('03-access-read-error');
  await send('Fetch.disable');
  await button('Retry staff access');
  await waitFor(hasText('Check access request'), 'unresolved intent retained after read recovery');
  await button('Check access request');
  await waitFor(hasText('Access change recorded.'), 'same key confirmed');
  await waitFor(hasText('Staff assignment reviewed for advisory work'), 'durable history reason');
  assert.equal(
    (
      await sql`select count(*)::int as n from audit_logs where record_id=${matter.id} and action='matter.access.change.v1'`
    )[0]?.n,
    1,
  );
  assert.equal((await targetRequest(`/${matter.id}`)).status, 200, 'Grant enables future reads');
  await select('#matter-access-person', user);
  await select('#matter-access-role', 'none');
  await type('#matter-access-reason', 'Review manager transfer');
  await button('Apply access change');
  await waitFor(hasText('Assign another eligible matter manager'), 'last manager refused');
  await screenshot('04-access-last-manager');
  await button('Review latest access');
  await waitFor(hasText('Current assignments'), 'refresh after confirmed conflict');
  await select('#matter-access-person', target);
  await select('#matter-access-role', 'none');
  await type('#matter-access-reason', 'Assignment ended');
  await button('Apply access change');
  await waitFor(hasText('Assignment ended'), 'revocation audit visible');
  assert.equal(
    (await targetRequest(`/${matter.id}`)).status,
    404,
    'Existing token denied after revocation',
  );
  await select('#matter-access-person', target);
  await select('#matter-access-role', 'manager');
  await type('#matter-access-reason', 'Handoff to responsible manager');
  await button('Apply access change');
  await waitFor(hasText('Handoff to responsible manager'), 'manager handoff audit');
  for (const width of [320, 768, 1024, 1440]) {
    await send('Emulation.setDeviceMetricsOverride', {
      width,
      height: 1100,
      deviceScaleFactor: 1,
      mobile: width === 320,
    });
    await waitFor(`innerWidth===${width}`, 'responsive viewport');
    assert.equal(
      await evaluate('document.documentElement.scrollWidth<=innerWidth'),
      true,
      'No overflow',
    );
    assert.equal(
      await evaluate(
        `[...document.querySelectorAll('.cl-card__title')].every(e=>e.scrollWidth<=e.clientWidth+1)`,
      ),
      true,
      'Readable card headings',
    );
    await screenshot(`05-access-${width}`);
    const { result: form } = await send('Runtime.evaluate', {
      expression: 'document.querySelector("#matter-access-reason")',
    });
    await send('DOM.scrollIntoViewIfNeeded', { objectId: form.objectId });
    await send('Runtime.releaseObject', { objectId: form.objectId });
    await screenshot(`05-access-form-${width}`);
  }
  await send('Page.reload');
  await waitFor(hasText('Handoff to responsible manager'), 'history survives reload');
  await sql`update firm_members set role='readonly' where firm_id=${firm} and user_id=${user}`;
  await button('Refresh staff access');
  await waitFor(hasText('Staff access management unavailable'), 'current role denied');
  assert.equal(
    await evaluate(hasText('Review Attorney')),
    false,
    'Role denial hides cached staff names',
  );
  await screenshot('06-access-role-denied');
  await sql`update firm_members set role='owner' where firm_id=${firm} and user_id=${user}`;
  await button('Retry staff access');
  await waitFor(hasText('Handoff to responsible manager'), 'role restored');
  const current = (await sql`select access_revision from matters where id=${matter.id}`)[0]
    .access_revision;
  const revoked = await targetRequest(`/${matter.id}/access-changes`, {
    userId: user,
    role: null,
    expectedRevision: current,
    reason: 'Handoff complete',
  });
  assert.equal(revoked.status, 200);
  await button('Refresh matter');
  await waitFor(hasText('This matter is unavailable'), 'actual manager revocation');
  assert.equal(
    await evaluate(hasText('Review Attorney')),
    false,
    'Revocation removes protected access UI',
  );
  assert.equal(
    await evaluate(hasText('Access review engagement')),
    false,
    'Revocation hides matter title',
  );
  await screenshot('07-access-revoked');
}
