import assert from 'node:assert/strict';

export async function verifyFirmProvision({
  sql,
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
  await waitFor(hasText('Set up your firm'), 'new account has an explicit empty setup state');
  assert.equal(
    await evaluate(`Boolean(document.querySelector('input[aria-label="Firm name"]'))`),
    false,
  );
  await screenshot('37-firm-setup-empty');
  const ax = await send('Accessibility.getFullAXTree');
  for (const [role, name] of [
    ['textbox', 'New firm name'],
    ['button', 'Create firm'],
    ['button', 'Refresh firm access'],
  ]) {
    assert(
      ax.nodes.some((node) => node.role?.value === role && node.name?.value === name),
      `${name} is accessible`,
    );
  }
  assert.equal(
    await evaluate('document.documentElement.scrollWidth <= innerWidth'),
    true,
    'Setup has no horizontal overflow',
  );
  await screenshot('38-firm-setup-mobile');
  await type('input[aria-label="New firm name"]', 'First real nationwide firm');
  let lost = false;
  listeners.set('Fetch.requestPaused', (event) => {
    if (event.request.method === 'POST' && event.responseStatusCode === 200 && !lost) {
      lost = true;
      void send('Fetch.failRequest', {
        requestId: event.requestId,
        errorReason: 'ConnectionClosed',
      });
    } else void send('Fetch.continueRequest', { requestId: event.requestId });
  });
  await send('Fetch.enable', {
    patterns: [{ urlPattern: 'http://127.0.0.1:3300/firms', requestStage: 'Response' }],
  });
  await button('Create firm');
  await waitFor(
    hasText('Creation could not be confirmed'),
    'lost creation response has recoverable uncertainty',
  );
  assert(lost);
  const [membership] =
    await sql`select firm_id, role from firm_members where user_id = ${user} and deleted_at is null`;
  assert(membership);
  const firm = membership.firm_id;
  assert.equal(membership.role, 'owner');
  const [receipt] =
    await sql`select id, idempotency_key, request_id from command_receipts where firm_id = ${firm} and command = 'firm.provision.v1'`;
  assert(receipt);
  assert.equal(
    await evaluate(`document.querySelector('input[aria-label="New firm name"]').disabled`),
    true,
    'Unknown result retains the same reviewed name',
  );
  await screenshot('39-firm-setup-response-lost');
  await send('Fetch.disable');
  // Inject a temporary Auth rejection only in this isolated test. Never inspect token payloads.
  let refreshFailed = false;
  listeners.set('Fetch.requestPaused', (event) => {
    if (event.request.method !== 'POST')
      return void send('Fetch.continueRequest', { requestId: event.requestId });
    refreshFailed = true;
    void send('Fetch.fulfillRequest', {
      requestId: event.requestId,
      responseCode: 400,
      responseHeaders: [
        { name: 'Content-Type', value: 'application/json' },
        { name: 'Access-Control-Allow-Origin', value: 'http://localhost:3100' },
      ],
      body: Buffer.from(
        JSON.stringify({
          error: 'temporarily_unavailable',
          error_description: 'Isolated test refresh outage',
        }),
      ).toString('base64'),
    });
  });
  await send('Fetch.enable', {
    patterns: [
      {
        urlPattern: 'http://127.0.0.1:54321/auth/v1/token?grant_type=refresh_token',
        requestStage: 'Request',
      },
    ],
  });
  await button('Check creation request');
  await waitFor(
    hasText('Your firm was created, but firm access has not refreshed.'),
    'receipt success is distinct from session availability',
  );
  assert(refreshFailed);
  assert.equal(
    (await sql`select count(*)::int as n from command_receipts where firm_id = ${firm}`)[0]?.n,
    1,
  );
  assert.equal(
    (await sql`select count(*)::int as n from audit_logs where command_id = ${receipt.id}`)[0]?.n,
    1,
  );
  assert.equal(
    (await sql`select count(*)::int as n from outbox_events where command_id = ${receipt.id}`)[0]
      ?.n,
    1,
  );
  await screenshot('40-firm-created-refresh-unavailable');
  await send('Fetch.disable');
  // A reload resets the SDK's failed-refresh cooldown; durable creation survives lost UI state.
  await send('Page.reload');
  await waitFor(hasText('Set up your firm'), 'unrefreshed session after reload');
  await button('Refresh firm access');
  await waitFor(
    `document.querySelector('input[aria-label="Firm name"]')?.value === 'First real nationwide firm'`,
    'fresh Auth session and authorized firm read',
  );
  await waitFor(hasText('Staff role: Firm owner'), 'live membership confirms initial owner');
  await waitFor(hasText('Completed'), 'actual worker completes the durable profile check');
  const [job] =
    await sql`select j.status from job_executions j join outbox_events e on e.id = j.outbox_event_id where e.command_id = ${receipt.id}`;
  assert.equal(job?.status, 'succeeded');
  assert.equal(
    (await sql`select count(*)::int as n from firm_members where user_id = ${user}`)[0]?.n,
    1,
  );
  const [retained] =
    await sql`select idempotency_key, request_id from command_receipts where id = ${receipt.id}`;
  assert.deepEqual(retained, {
    idempotency_key: receipt.idempotency_key,
    request_id: receipt.request_id,
  });
  assert.equal(
    (await sql`select count(*)::int as n from practice_areas where firm_id = ${firm}`)[0]?.n,
    0,
  );
  await screenshot('41-firm-created-authorized');
  await send('Emulation.setDeviceMetricsOverride', {
    width: 1440,
    height: 1000,
    deviceScaleFactor: 1,
    mobile: false,
  });
  await send('Emulation.resetPageScaleFactor');
  await send('Page.reload');
  await waitFor(
    `document.querySelector('input[aria-label="Firm name"]')?.value === 'First real nationwide firm'`,
    'created firm survives reload',
  );
  await screenshot('42-firm-created-desktop');
  return firm;
}
