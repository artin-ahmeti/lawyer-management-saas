import assert from 'node:assert/strict';
import { randomUUID } from 'node:crypto';
import { SignJWT } from 'jose';

export async function verifyStaffLifecycle({
  sql,
  firm,
  user,
  ownedUsers,
  send,
  evaluate,
  waitFor,
  button: clickButton,
  type,
  hasText,
  screenshot,
  listeners,
}) {
  const api = 'http://127.0.0.1:3300',
    departing = randomUUID(),
    partner = randomUUID(),
    otherOwner = randomUUID(),
    ownerSession = randomUUID(),
    matter = randomUUID(),
    title = 'Sealed acquisition counsel';
  ownedUsers.push(departing, partner, otherOwner);
  for (const [id, name, role] of [
    [departing, 'Departing Associate', 'attorney'],
    [partner, 'Handoff Partner', 'attorney'],
  ]) {
    await sql`insert into auth.users(id,email,email_confirmed_at,raw_user_meta_data) values (${id},${`${id}@lifecycle.browser.test`},now(),'{}'::jsonb)`;
    await sql`update profiles set full_name=${name} where id=${id}`;
    await sql`insert into firm_members(firm_id,user_id,role) values (${firm},${id},${role})`;
  }
  await sql`update profiles set full_name='Firm Owner' where id=${user}`;
  await sql`insert into matters(id,firm_id,title,created_by) values (${matter},${firm},${title},${departing})`;
  await sql`insert into matter_access(firm_id,matter_id,user_id,role,created_by) values (${firm},${matter},${departing},'manager',${departing})`;

  // The shared helper clicks by viewport coordinates; bring the button into view first.
  async function button(label) {
    await evaluate(
      `[...document.querySelectorAll('button')].find(b => b.textContent.trim() === ${JSON.stringify(label)})?.scrollIntoView({block:'center'})`,
    );
    await clickButton(label);
  }
  async function click(selector) {
    // Refetches can shift layout between measuring and pressing; only press a verified target.
    for (let attempt = 0; attempt < 10; attempt++) {
      const { result } = await send('Runtime.evaluate', {
        awaitPromise: true,
        returnByValue: true,
        expression: `new Promise((resolve) => {
        const e = document.querySelector(${JSON.stringify(selector)});
        if (!e) return resolve(null);
        e.scrollIntoView({ block: 'center' });
        requestAnimationFrame(() => requestAnimationFrame(() => {
          const r = e.getBoundingClientRect(), x = r.x + r.width / 2, y = r.y + r.height / 2;
          resolve(e.contains(document.elementFromPoint(x, y)) ? { x, y } : null);
        }));
      })`,
      });
      const point = result.value;
      if (point) {
        for (const type of ['mousePressed', 'mouseReleased'])
          await send('Input.dispatchMouseEvent', { type, button: 'left', clickCount: 1, ...point });
        return;
      }
      await new Promise((r) => setTimeout(r, 100));
    }
    assert.fail(`${selector} is not clickable`);
  }
  async function select(selector, value) {
    await waitFor(
      `(() => { const e=document.querySelector(${JSON.stringify(selector)}); return e && !e.disabled && !e.closest('[hidden]') && e.getClientRects().length > 0 && !document.querySelector('[aria-label="Loading staff membership"]'); })()`,
      'membership form ready for native input',
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
    await waitFor(
      `document.querySelector(${JSON.stringify(selector)})?.value===${JSON.stringify(value)}`,
      'native selection',
    );
  }
  const confirm = async () => {
    await click('#staff-remove-confirm');
    await waitFor(
      `document.querySelector('#staff-remove-confirm')?.getAttribute('aria-checked')==='true'`,
      'removal confirmed',
    );
  };
  const audits = async (action) =>
    (
      await sql`select count(*)::int as n from audit_logs where firm_id=${firm} and action=${action}`
    )[0]?.n;

  let held;
  listeners.set('Fetch.requestPaused', (e) => {
    if (e.request.method === 'GET') held = e.requestId;
    else void send('Fetch.continueRequest', { requestId: e.requestId });
  });
  await send('Fetch.enable', {
    patterns: [{ urlPattern: `${api}/firms/current/staff/removed`, requestStage: 'Request' }],
  });
  await button('Refresh staff membership');
  await waitFor(
    `Boolean(document.querySelector('[aria-label="Loading staff membership"]'))`,
    'membership loading',
  );
  await screenshot('01-membership-loading');
  assert(held);
  await send('Fetch.continueRequest', { requestId: held });
  await send('Fetch.disable');
  await waitFor(hasText('No removed staff on this page.'), 'empty removed staff');
  await waitFor(hasText('No removals or restorations recorded yet.'), 'empty membership history');
  const ax = await send('Accessibility.getFullAXTree');
  for (const [role, name] of [
    ['combobox', 'Staff member to remove (required)'],
    ['textbox', 'Reason for removal (required)'],
    ['checkbox', 'Revoke their firm access and all of their matter access'],
    ['combobox', 'Removed staff member (required)'],
    ['combobox', 'Role on return (required)'],
  ])
    assert(
      ax.nodes.some((n) => n.role?.value === role && n.name?.value === name),
      `${role} ${name} is labelled`,
    );

  await select('#staff-remove-person', departing);
  await type('#staff-remove-reason', 'Associate accepted another position');
  await button('Remove staff member');
  await waitFor(hasText('confirm the access removal'), 'confirmation required');
  await confirm();
  await button('Remove staff member');
  await waitFor(hasText('must complete a handoff'), 'handoff required');
  assert.equal(await evaluate(hasText(title)), false, 'Handoff refusal hides the matter');
  assert.equal(await evaluate(hasText(matter)), false, 'Handoff refusal hides the matter ID');
  await screenshot('02-membership-handoff-required');
  await button('Review latest staff');
  await sql`insert into matter_access(firm_id,matter_id,user_id,role,created_by) values (${firm},${matter},${partner},'manager',${departing})`;

  await select('#staff-remove-person', departing);
  await type('#staff-remove-reason', 'Associate accepted another position');
  await confirm();
  held = undefined;
  listeners.set('Fetch.requestPaused', (e) => {
    if (e.request.method === 'POST') held = e.requestId;
    else void send('Fetch.continueRequest', { requestId: e.requestId });
  });
  await send('Fetch.enable', {
    patterns: [{ urlPattern: `${api}/firms/current/staff/removals`, requestStage: 'Response' }],
  });
  await button('Remove staff member');
  await waitFor(hasText('Removing…'), 'pending removal');
  for (let i = 0; i < 100 && !held; i++) await new Promise((r) => setTimeout(r, 30));
  assert(held, 'Committed response held');
  assert.equal(
    (
      await sql`select revision,deleted_at is not null as removed from firm_members where firm_id=${firm} and user_id=${departing}`
    )[0]?.removed,
    true,
  );
  await send('Fetch.failRequest', { requestId: held, errorReason: 'ConnectionFailed' });
  await send('Fetch.disable');
  await waitFor(hasText('The result could not be confirmed.'), 'unknown result');
  await screenshot('03-membership-response-lost');

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
    patterns: [{ urlPattern: `${api}/firms/current/staff/removed`, requestStage: 'Request' }],
  });
  await button('Refresh staff membership');
  await waitFor(hasText('Staff membership could not be loaded'), 'read error');
  assert.equal(
    await evaluate(
      `[...document.querySelectorAll('[aria-label="Removed firm staff"],#staff-remove-person')].some(e=>!e.closest('[hidden]'))`,
    ),
    false,
    'Read failure hides warm membership records',
  );
  await screenshot('04-membership-read-error');
  await send('Fetch.disable');
  await button('Retry staff membership');
  await waitFor(hasText('Check removal request'), 'unknown intent retained');
  await button('Check removal request');
  await waitFor(hasText('Staff member removed.'), 'same intent recovered');
  await waitFor(hasText('Associate accepted another position'), 'removal history');
  assert.equal(await audits('staff.membership.remove.v1'), 1, 'One removal recorded');
  assert.equal(
    (
      await sql`select count(*)::int as n from matter_access where matter_id=${matter} and user_id=${departing} and deleted_at is null`
    )[0]?.n,
    0,
    'Removal revoked the matter grant',
  );
  await waitFor(
    `document.querySelector('[aria-label="Removed firm staff"]')?.innerText.includes('Departing Associate')`,
    'removed staff listed',
  );

  await select('#staff-restore-person', departing);
  await select('#staff-restore-role', 'paralegal');
  await type('#staff-restore-reason', 'Returned as a paralegal');
  await button('Restore staff member');
  await waitFor(hasText('Staff member restored.'), 'restoration recorded');
  await waitFor(hasText('Returned as a paralegal'), 'restoration history');
  await screenshot('05-membership-restored');
  assert.deepEqual(
    (
      await sql`select fm.role,fm.revision,fm.deleted_at is null as active,
      (select count(*)::int from matter_access a where a.matter_id=${matter} and a.user_id=fm.user_id and a.deleted_at is null) as grants
      from firm_members fm where fm.firm_id=${firm} and fm.user_id=${departing}`
    )[0],
    { role: 'paralegal', revision: 3, active: true, grants: 0 },
    'Restoration returns no matter access',
  );

  await sql`insert into auth.users(id,email,email_confirmed_at,raw_user_meta_data) values (${otherOwner},${`${otherOwner}@lifecycle.browser.test`},now(),'{}'::jsonb)`;
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
  await button('Refresh staff membership');
  await select('#staff-remove-person', departing);
  await type('#staff-remove-reason', 'Prepared before a competing review');
  await confirm();
  const competing = await fetch(`${api}/firms/current/staff/removals`, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${ownerToken}`,
      'Content-Type': 'application/json',
      'Idempotency-Key': randomUUID(),
    },
    body: JSON.stringify({
      userId: departing,
      expectedRevision: 3,
      reason: 'Competing departure review',
    }),
  });
  assert.equal(competing.status, 200);
  await button('Remove staff member');
  await waitFor(hasText('Review the latest staff and history.'), 'stale review conflict');
  await screenshot('06-membership-stale-review');
  await button('Review latest staff');
  await waitFor(hasText('Competing departure review'), 'latest history');
  assert.equal(await audits('staff.membership.remove.v1'), 2, 'Stale review added nothing');

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
      `[...document.querySelectorAll('.cl-card__title')].filter(e=>e.scrollWidth>e.clientWidth+1).map(e=>e.innerText)`,
    );
    assert.deepEqual(clipped, [], 'Readable headings');
    const small = await evaluate(
      `[...document.querySelector('#staff-remove-person').closest('.cl-card').querySelectorAll('select,button:not([role="checkbox"]),label:has([role="checkbox"])')].filter(e=>e.getBoundingClientRect().height<44).map(e=>e.id||e.textContent)`,
    );
    assert.deepEqual(small, [], 'Membership controls meet the touch target minimum');
    await click('#staff-remove-reason');
    await screenshot(`07-membership-form-${width}`);
  }

  await send('Page.reload');
  await waitFor(hasText('Competing departure review'), 'history survives reload');
  await select('#staff-remove-person', user);
  await waitFor(hasText('Remove my own firm access and revoke my matter access'), 'self warning');
  await type('#staff-remove-reason', 'Owner handing the firm to a successor');
  await confirm();
  await screenshot('08-membership-self-removal-review');
  await button('Remove staff member');
  await waitFor(
    `!document.querySelector('#staff-remove-person')`,
    'self-removal ends administration',
  );
  assert.equal(
    await evaluate(hasText('Handoff Partner')),
    false,
    'Self-removal clears cached staff names',
  );
  assert.equal(
    (
      await sql`select deleted_at is not null as removed from firm_members where firm_id=${firm} and user_id=${user}`
    )[0]?.removed,
    true,
  );
  await waitFor(`!${hasText('Firm owner')}`, 'own workspace list refreshed');
  await screenshot('09-membership-self-removed');
}
