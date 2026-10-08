import assert from 'node:assert/strict';
import { randomUUID } from 'node:crypto';
import { SignJWT } from 'jose';

export async function verifyStaffRoles({
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
    otherOwner = randomUUID(),
    ownerSession = randomUUID();
  ownedUsers.push(target, otherOwner);
  await sql`insert into auth.users(id,email,email_confirmed_at,raw_user_meta_data) values (${target},${`${target}@roles.browser.test`},now(),'{}'::jsonb)`;
  await sql`update profiles set full_name='Review Staff Member' where id=${target}`;
  await sql`update profiles set full_name='Firm Owner' where id=${user}`;
  await sql`insert into firm_members(firm_id,user_id,role) values (${firm},${target},'attorney')`;
  async function select(selector, value) {
    await waitFor(
      `(() => { const e=document.querySelector(${JSON.stringify(selector)}); return e && !e.disabled && !e.closest('[hidden]') && e.getClientRects().length > 0 && !document.querySelector('[aria-label="Loading staff roles"]'); })()`,
      'role form ready for native input',
    );
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
    for (const character of label.split(' · ')[0])
      await send('Input.dispatchKeyEvent', {
        type: 'char',
        text: character,
        unmodifiedText: character,
        key: character,
      });
    await send('Input.dispatchKeyEvent', {
      type: 'rawKeyDown',
      key: 'Tab',
      code: 'Tab',
      windowsVirtualKeyCode: 9,
      nativeVirtualKeyCode: 48,
    });
    await send('Input.dispatchKeyEvent', {
      type: 'keyUp',
      key: 'Tab',
      code: 'Tab',
      windowsVirtualKeyCode: 9,
      nativeVirtualKeyCode: 48,
    });
    await waitFor(
      `document.querySelector(${JSON.stringify(selector)})?.value===${JSON.stringify(value)}`,
      'native selection',
    );
  }
  let held;
  listeners.set('Fetch.requestPaused', (e) => {
    if (e.request.method === 'GET') held = e.requestId;
    else void send('Fetch.continueRequest', { requestId: e.requestId });
  });
  await send('Fetch.enable', {
    patterns: [{ urlPattern: `${api}/firms/current/staff`, requestStage: 'Request' }],
  });
  await button('Refresh staff roles');
  await waitFor(
    `Boolean(document.querySelector('[aria-label="Loading staff roles"]'))`,
    'staff loading',
  );
  await screenshot('01-role-loading');
  assert(held);
  await send('Fetch.continueRequest', { requestId: held });
  await send('Fetch.disable');
  await waitFor(hasText('Review Staff Member'), 'current directory');
  await waitFor(hasText('No role changes recorded yet.'), 'empty role history');
  const ax = await send('Accessibility.getFullAXTree');
  assert(
    ax.nodes.some(
      (n) => n.role?.value === 'combobox' && n.name?.value === 'Staff member (required)',
    ),
  );
  assert(
    ax.nodes.some(
      (n) => n.role?.value === 'textbox' && n.name?.value === 'Reason for role change (required)',
    ),
  );
  await select('#staff-role-person', target);
  assert.equal(
    await evaluate('document.activeElement?.id'),
    'staff-role-role',
    'Tab moves to role',
  );
  await select('#staff-role-role', 'paralegal');
  await type('#staff-role-reason', 'Responsibilities reviewed by staff administrator');
  held = undefined;
  listeners.set('Fetch.requestPaused', (e) => {
    if (e.request.method === 'POST') held = e.requestId;
    else void send('Fetch.continueRequest', { requestId: e.requestId });
  });
  await send('Fetch.enable', {
    patterns: [{ urlPattern: `${api}/firms/current/staff/role-changes`, requestStage: 'Response' }],
  });
  await button('Apply role change');
  await waitFor(hasText('Saving role…'), 'pending role');
  for (let i = 0; i < 100 && !held; i++) await new Promise((r) => setTimeout(r, 30));
  assert(held, 'Committed response held');
  assert.equal(
    (await sql`select revision from firm_members where firm_id=${firm} and user_id=${target}`)[0]
      ?.revision,
    2,
  );
  await send('Fetch.failRequest', { requestId: held, errorReason: 'ConnectionFailed' });
  await send('Fetch.disable');
  await waitFor(hasText('The result could not be confirmed.'), 'unknown result');
  await screenshot('02-role-response-lost');
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
    patterns: [{ urlPattern: `${api}/firms/current/staff`, requestStage: 'Request' }],
  });
  await button('Refresh staff roles');
  await waitFor(hasText('Staff roles could not be loaded'), 'read error');
  assert.equal(
    await evaluate(hasText('Review Staff Member')),
    false,
    'Read failure hides warm names',
  );
  await screenshot('03-role-read-error');
  await send('Fetch.disable');
  await button('Retry staff roles');
  await waitFor(hasText('Check role request'), 'unknown intent retained');
  await button('Check role request');
  await waitFor(hasText('Role change recorded.'), 'same intent recovered');
  await waitFor(hasText('Responsibilities reviewed by staff administrator'), 'history recorded');
  assert.equal(
    (
      await sql`select count(*)::int as n from audit_logs where firm_id=${firm} and action='staff.role.change.v1'`
    )[0]?.n,
    1,
  );
  await select('#staff-role-person', user);
  await select('#staff-role-role', 'attorney');
  await type('#staff-role-reason', 'Review ownership handoff');
  await button('Apply role change');
  await waitFor(hasText('Assign another available firm owner'), 'last owner protected');
  await screenshot('04-role-last-owner');
  await button('Review latest staff');
  await waitFor(hasText('Current staff'), 'review current directory');

  await sql`insert into auth.users(id,email,email_confirmed_at,raw_user_meta_data) values (${otherOwner},${`${otherOwner}@roles.browser.test`},now(),'{}'::jsonb)`;
  await sql`update profiles set full_name='Other Firm Owner' where id=${otherOwner}`;
  await sql`insert into auth.sessions(id,user_id) values (${ownerSession},${otherOwner})`;
  await sql`insert into firm_members(firm_id,user_id,role) values (${firm},${otherOwner},'owner')`;
  const ownerToken = await new SignJWT({
    role: 'authenticated',
    firm_id: firm,
    session_id: ownerSession,
    user_role: 'owner',
  })
    .setSubject(otherOwner)
    .setIssuer('http://127.0.0.1:54321/auth/v1')
    .setAudience('authenticated')
    .setProtectedHeader({ alg: 'HS256' })
    .setExpirationTime('30m')
    .sign(new TextEncoder().encode('super-secret-jwt-token-with-at-least-32-characters-long'));
  const change = (userId, role, expectedRevision, reason) =>
    fetch(`${api}/firms/current/staff/role-changes`, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${ownerToken}`,
        'Content-Type': 'application/json',
        'Idempotency-Key': randomUUID(),
      },
      body: JSON.stringify({ userId, role, expectedRevision, reason }),
    });
  await select('#staff-role-person', target);
  await select('#staff-role-role', 'attorney');
  await type('#staff-role-reason', 'Prepared before a competing review');
  assert.equal((await change(target, 'billing', 2, 'Competing staff review')).status, 200);
  await button('Apply role change');
  await waitFor(hasText('Review the latest staff and history.'), 'stale review conflict');
  await screenshot('05-role-stale-review');
  await button('Review latest staff');
  await waitFor(hasText('Competing staff review'), 'latest history');
  await select('#staff-role-person', target);
  await select('#staff-role-role', 'readonly');
  await type('#staff-role-reason', 'Responsibilities concluded');
  await button('Apply role change');
  await waitFor(hasText('Responsibilities concluded'), 'confirmed role update');
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
      'No horizontal overflow',
    );
    const clipped = await evaluate(
      `[...document.querySelectorAll('.cl-card__title')].filter(e=>e.scrollWidth>e.clientWidth+1).map(e=>({text:e.innerText,width:e.clientWidth,scroll:e.scrollWidth}))`,
    );
    assert.deepEqual(clipped, [], 'Readable headings');
    assert.equal(
      await evaluate(
        `[...document.querySelector('#staff-role-person').closest('.cl-card').querySelectorAll('select,button')].every(e=>e.getBoundingClientRect().height>=44)`,
      ),
      true,
      'Staff role controls meet the touch target minimum',
    );
    const { result: element } = await send('Runtime.evaluate', {
      expression: 'document.querySelector("#staff-role-reason")',
    });
    await send('DOM.scrollIntoViewIfNeeded', { objectId: element.objectId });
    await send('Runtime.releaseObject', { objectId: element.objectId });
    await screenshot(`06-role-form-${width}`);
  }
  await send('Page.reload');
  await waitFor(hasText('Responsibilities concluded'), 'history survives reload');
  assert.equal(
    (await change(user, 'readonly', 1, 'Administrative responsibilities concluded')).status,
    200,
  );
  await button('Refresh staff roles');
  await waitFor(
    `!document.querySelector('#staff-role-person')`,
    'existing session loses administration',
  );
  assert.equal(
    await evaluate(hasText('Review Staff Member')),
    false,
    'Role denial removes cached names/history',
  );
  await screenshot('07-role-denied');
}
