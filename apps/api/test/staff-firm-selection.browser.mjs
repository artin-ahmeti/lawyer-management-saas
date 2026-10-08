import assert from 'node:assert/strict';

export async function verifyStaffFirmSelection({
  sql,
  firm,
  user,
  send,
  evaluate,
  waitFor,
  button,
  hasText,
  screenshot,
  listeners,
  clickExpression,
  valueIs,
}) {
  const target = crypto.randomUUID();
  await sql`insert into firms(id,name) values (${target},'Selected target workspace')`;
  await sql`insert into firm_members(firm_id,user_id,role) values (${target},${user},'readonly')`;
  await button('Refresh workspaces');
  await waitFor(hasText('Selected target workspace'), 'live target membership');
  await waitFor(
    `![...document.querySelectorAll('button')].find(b=>b.getAttribute('aria-label')==='Use workspace Selected target workspace')?.disabled`,
    'selection available',
  );
  const useTarget = () =>
    clickExpression(
      `document.querySelector('[aria-label="Use workspace Selected target workspace"]')`,
    );
  await useTarget();
  await waitFor(hasText('Review workspace switch'), 'review stage');
  assert.equal(
    await evaluate(hasText('Browser firm LLP')),
    false,
    'Old workspace frame hidden during review',
  );
  await screenshot('01-switch-review');
  let held;
  listeners.set('Fetch.requestPaused', (event) => {
    if (event.request.method === 'POST') held = event.requestId;
    else void send('Fetch.continueRequest', { requestId: event.requestId });
  });
  await send('Fetch.enable', {
    patterns: [{ urlPattern: 'http://127.0.0.1:3300/auth/active-firm', requestStage: 'Response' }],
  });
  await button('Confirm workspace switch');
  await waitFor(hasText('Confirming workspace access…'), 'pending state');
  for (let i = 0; i < 100 && !held; i++) await new Promise((resolve) => setTimeout(resolve, 30));
  assert(held, 'Selection response held after command execution');
  assert.equal(
    (await sql`select firm_id from staff_session_contexts where created_by=${user}`)[0]?.firm_id,
    target,
  );
  await send('Fetch.failRequest', { requestId: held, errorReason: 'ConnectionFailed' });
  await send('Fetch.disable');
  await waitFor(hasText('The selection outcome could not be confirmed.'), 'lost response recovery');
  await screenshot('02-switch-response-lost');
  assert.equal(await evaluate(hasText('Browser firm LLP')), false);
  listeners.set('Fetch.requestPaused', (event) => {
    if (event.request.method !== 'GET') {
      void send('Fetch.continueRequest', { requestId: event.requestId });
      return;
    }
    void send('Fetch.fulfillRequest', {
      requestId: event.requestId,
      responseCode: 503,
      responseHeaders: [
        { name: 'content-type', value: 'application/json' },
        { name: 'access-control-allow-origin', value: 'http://localhost:3100' },
      ],
      body: Buffer.from(
        JSON.stringify({ code: 'SERVICE_UNAVAILABLE', message: 'Target read unavailable' }),
      ).toString('base64'),
    });
  });
  await send('Fetch.enable', {
    patterns: [{ urlPattern: 'http://127.0.0.1:3300/firms/current', requestStage: 'Request' }],
  });
  await button('Check workspace request');
  await waitFor(
    hasText('Your selection was saved. Workspace access could not be confirmed'),
    'target read failure',
  );
  assert.equal(await evaluate(hasText('Browser firm LLP')), false);
  assert.equal(
    (
      await sql`select count(*)::int as n from audit_logs where created_by=${user} and action='staff.context.select.v1'`
    )[0]?.n,
    1,
    'Response retry has one audit',
  );
  await screenshot('03-target-read-unavailable');
  await send('Fetch.disable');
  await button('Refresh workspace access');
  await waitFor(hasText('Firm profile'), 'real target authorized read and navigation');
  await waitFor(
    `document.querySelector('[aria-label="Your workspaces"]')?.innerText.includes('Selected workspace')`,
    'authoritative selected marker',
  );
  assert.equal(
    await evaluate(`document.querySelector('input[aria-label="Firm name"]')?.readOnly`),
    true,
    'Target readonly role cannot rename',
  );
  await waitFor(
    `document.querySelector('.app-sidebar__firm-name')?.textContent==='Selected target workspace'`,
    'shell names the real target',
  );
  assert.equal(
    await evaluate(`document.querySelector('.app-sidebar__footer').innerText.includes('Owner')`),
    false,
    'Shell does not claim fixture owner authority',
  );
  assert.equal(
    (
      await sql`select count(*)::int as n from audit_logs where created_by=${user} and action='staff.context.select.v1'`
    )[0]?.n,
    1,
    'Refresh retry sends no selection command',
  );
  for (const width of [320, 768, 1024, 1440]) {
    await send('Emulation.setDeviceMetricsOverride', {
      width,
      height: 1000,
      deviceScaleFactor: 1,
      mobile: width === 320,
    });
    await waitFor(`innerWidth===${width}`, 'responsive viewport');
    assert.equal(await evaluate('document.documentElement.scrollWidth <= innerWidth'), true);
    await screenshot(`04-selected-${width}`);
  }
  const tree = await send('Accessibility.getFullAXTree');
  assert(
    tree.nodes.some(
      (node) =>
        node.role?.value === 'button' && node.name?.value === 'Use workspace Browser firm LLP',
    ),
  );
  await sql`update firm_members set deleted_at=now() where firm_id=${target} and user_id=${user}`;
  await button('Refresh workspaces');
  await waitFor(
    `!document.querySelector('[aria-label="Your workspaces"]')?.innerText.includes('Selected target workspace')`,
    'revoked target omitted',
  );
  await waitFor(
    `![...document.querySelectorAll('button')].find(b=>b.getAttribute('aria-label')==='Use workspace Browser firm LLP')?.disabled`,
    'remaining valid grant available',
  );
  await clickExpression(`document.querySelector('[aria-label="Use workspace Browser firm LLP"]')`);
  await waitFor(hasText('Review workspace switch'), 'revoked workspace recovery review');
  await button('Confirm workspace switch');
  await waitFor(valueIs('Browser firm LLP'), 'real restored owner workspace');
  await waitFor(
    `document.querySelector('.app-sidebar__firm-name')?.textContent==='Browser firm LLP'`,
    'shell follows recovered selection',
  );
  {
    const row = (
      await sql`select firm_id,revision from staff_session_contexts where created_by=${user}`
    )[0];
    assert.deepEqual({ firm: row.firm_id, revision: row.revision }, { firm, revision: 2 });
  }
  await screenshot('05-revocation-recovered');
}
