import assert from 'node:assert/strict';
export async function verifyStaffAccess({
  api,
  web,
  send,
  evaluate,
  waitFor,
  button,
  screenshot,
  listeners,
}) {
  const region = `document.querySelector('[aria-label="Current firm access"]')`;
  const text = (value) => `${region}?.innerText.includes(${JSON.stringify(value)})`;
  let paused;
  listeners.set('Fetch.requestPaused', (event) => {
    paused = event.requestId;
  });
  await send('Fetch.enable', {
    patterns: [{ urlPattern: `${api}/auth/me`, requestStage: 'Request' }],
  });
  await button('Refresh access');
  await waitFor(
    `Boolean(${region}.querySelector('[aria-label="Checking current access"]'))`,
    'loading current access',
  );
  assert.equal(await evaluate(text('Firm owner')), false, 'Loading hides warm permissions');
  assert(paused);
  await screenshot('33-staff-access-loading');
  await send('Fetch.continueRequest', { requestId: paused });
  await send('Fetch.disable');
  await waitFor(text('Firm owner'), 'current access read recovered');
  for (const failure of ['network', 'malformed']) {
    listeners.set(
      'Fetch.requestPaused',
      (event) =>
        void send(
          failure === 'network' ? 'Fetch.failRequest' : 'Fetch.fulfillRequest',
          failure === 'network'
            ? { requestId: event.requestId, errorReason: 'ConnectionRefused' }
            : {
                requestId: event.requestId,
                responseCode: 200,
                responseHeaders: [
                  { name: 'Content-Type', value: 'application/json' },
                  { name: 'Access-Control-Allow-Origin', value: web },
                ],
                body: Buffer.from(JSON.stringify({ capabilities: ['financial.all'] })).toString(
                  'base64',
                ),
              },
        ),
    );
    await send('Fetch.enable', {
      patterns: [{ urlPattern: `${api}/auth/me`, requestStage: 'Request' }],
    });
    await button('Refresh access');
    await waitFor(text('Current access could not be checked'), 'access read failure is visible');
    assert.equal(await evaluate(text('Firm owner')), false, 'Failed read hides warm permissions');
    await screenshot(
      failure === 'network' ? '34-staff-access-offline' : '35-staff-access-malformed',
    );
    await send('Fetch.disable');
    await button('Refresh access');
    await waitFor(text('Firm owner'), 'access read retry recovers');
  }
  console.log(
    'PASS: current access loading, network/malformed read failure, cleared warm permissions and read retry.',
  );
}
