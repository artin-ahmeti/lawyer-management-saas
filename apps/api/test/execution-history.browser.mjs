import assert from 'node:assert/strict';
import { randomUUID } from 'node:crypto';
import pino from 'pino';
import { ExecutionService } from '../../worker/dist/execution.js';

/** Controlled interruption of this harness's own work; no provider or business-command substitute. */
export async function verifyExecutionHistory({
  sql,
  firm,
  user,
  api,
  web,
  send,
  evaluate,
  waitFor,
  clickExpression,
  button,
  screenshot,
  listeners,
  legacyJobId,
}) {
  const id = randomUUID();
  const [source] = await sql`select revision from firms where id = ${firm}`;
  await sql`insert into outbox_events (id, firm_id, created_by, command_id, request_id, event_type, payload, available_at)
    values (${id}, ${firm}, ${user}, ${randomUUID()}, ${randomUUID()}, 'firm.renamed.v1',
      ${sql.json({ firmId: firm, revision: source.revision })}, now() + interval '1 hour')`;
  await sql`insert into job_executions (id, outbox_event_id, firm_id, created_by)
    values (${id}, ${id}, ${firm}, ${user})`;
  const service = new ExecutionService(sql, { enqueue: async () => {} }, pino({ level: 'silent' }));
  const first = await service.claimExecution(id);
  assert(first, 'Execution claimed');
  const row = `document.querySelector('[data-execution-id="${id}"]')`;
  const text = (value) => `${row}?.innerText.includes(${JSON.stringify(value)})`;
  async function revealHistory() {
    const { result } = await send('Runtime.evaluate', {
      expression: `${row}.querySelector('[aria-label="Execution attempt history"]')`,
    });
    assert(result.objectId, 'History region exists');
    try {
      await send('DOM.scrollIntoViewIfNeeded', { objectId: result.objectId });
    } finally {
      await send('Runtime.releaseObject', { objectId: result.objectId });
    }
  }
  async function openHistory(expectedStatus) {
    await button('Refresh background work');
    await waitFor(text(expectedStatus), 'refreshed interrupted-work row');
    await clickExpression(`${row}.querySelector('summary')`);
    await waitFor(text('Attempt 1:'), 'retained attempt history');
  }
  await openHistory('Processing');
  await waitFor(text('Attempt 1: Processing'), 'running attempt has unconfirmed completion');
  await screenshot('17-attempt-running');
  // Simulate process exit after claim. Only the summary lease is advanced; retained timestamps stay original.
  await sql`update job_executions set lease_until = now() - interval '1 second' where id = ${id}`;
  const next = await service.claimExecution(id);
  assert(next, 'Expired attempt reclaimed');
  await service.executeClaim(first);
  await service.executeClaim(next);
  await openHistory('Completed');
  await waitFor(text('Attempt 1: Interrupted'), 'interrupted outcome retained');
  await waitFor(text('Attempt 2: Completed'), 'recovered outcome retained');
  await revealHistory();
  await screenshot('18-attempt-recovered');
  const [before] = await sql`select attempts, result from job_executions where id = ${id}`;
  assert.equal(before.attempts, 2);
  assert.equal(
    await evaluate(
      `${row}.querySelectorAll('[aria-label="Recorded processing attempts"] li').length`,
    ),
    2,
  );
  const ax = await send('Accessibility.getFullAXTree');
  assert(
    ax.nodes.some(
      (node) => node.role?.value === 'button' && node.name?.value === 'Refresh attempt history',
    ),
  );
  for (const width of [320, 768, 1024, 1440]) {
    await send('Emulation.setDeviceMetricsOverride', {
      width,
      height: 1000,
      deviceScaleFactor: 1,
      mobile: width === 320,
    });
    await waitFor(
      `Math.abs(document.querySelector('aside').getBoundingClientRect().width - ${width > 1100 ? 256 : 62}) < 1`,
      'responsive sidebar settled',
    );
    assert(
      await evaluate(
        `(() => {const panel = ${row}; return panel.scrollWidth <= panel.clientWidth && panel.getBoundingClientRect().right <= ${width};})()`,
      ),
      `Attempt history fits ${width}px`,
    );
    if (width === 320) await screenshot('19-attempt-mobile');
  }
  let focused = false;
  for (let tab = 0; tab < 100; tab++) {
    await send('Input.dispatchKeyEvent', { type: 'keyDown', key: 'Tab', code: 'Tab' });
    await send('Input.dispatchKeyEvent', { type: 'keyUp', key: 'Tab', code: 'Tab' });
    focused = await evaluate(
      `document.activeElement?.textContent.trim() === 'Refresh attempt history'`,
    );
    if (focused) break;
  }
  assert(focused, 'Attempt refresh reachable by keyboard');
  let paused;
  listeners.set('Fetch.requestPaused', (event) => {
    paused = event.requestId;
  });
  await send('Fetch.enable', {
    patterns: [
      { urlPattern: `${api}/firms/current/executions/${id}/attempts`, requestStage: 'Request' },
    ],
  });
  await send('Input.dispatchKeyEvent', {
    type: 'keyDown',
    key: 'Enter',
    code: 'Enter',
    windowsVirtualKeyCode: 13,
    text: '\r',
  });
  await send('Input.dispatchKeyEvent', {
    type: 'keyUp',
    key: 'Enter',
    code: 'Enter',
    windowsVirtualKeyCode: 13,
  });
  await waitFor(
    `Boolean(${row}.querySelector('[aria-label="Loading attempt history"]'))`,
    'held read displays loading',
  );
  assert.equal(await evaluate(text('Attempt 2: Completed')), false, 'Loading hides warm history');
  await screenshot('20-attempt-loading');
  assert(paused, 'History request held');
  await send('Fetch.continueRequest', { requestId: paused });
  await send('Fetch.disable');
  await waitFor(text('Attempt 2: Completed'), 'keyboard read recovers');
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
                body: Buffer.from(
                  JSON.stringify({ jobId: id, items: [{ payload: 'never display private data' }] }),
                ).toString('base64'),
              },
        ),
    );
    await send('Fetch.enable', {
      patterns: [
        { urlPattern: `${api}/firms/current/executions/${id}/attempts`, requestStage: 'Request' },
      ],
    });
    await button('Refresh attempt history');
    await waitFor(text('Attempt history could not be checked'), `${failure} visible failure`);
    assert.equal(await evaluate(text('Attempt 2: Completed')), false, 'Failure hides warm history');
    assert.equal(await evaluate(text('never display private data')), false);
    await screenshot(`21-attempt-${failure}`);
    await send('Fetch.disable');
    await button('Refresh attempt history');
    await waitFor(text('Attempt 2: Completed'), 'history retry recovers');
  }
  await sql`update firm_members set role = 'readonly' where firm_id = ${firm} and user_id = ${user}`;
  try {
    await button('Refresh attempt history');
    await waitFor(text('Attempt-history access unavailable'), 'current role denies history');
    assert.equal(await evaluate(text('Attempt 2: Completed')), false, 'Denial clears warm history');
    await screenshot('22-attempt-denied');
  } finally {
    await sql`update firm_members set role = 'owner' where firm_id = ${firm} and user_id = ${user}`;
  }
  await button('Refresh attempt history');
  await waitFor(text('Attempt 2: Completed'), 'permission restored');
  await sql`update job_executions set deleted_at = now() where id = ${id}`;
  try {
    await button('Refresh attempt history');
    await waitFor(text('This check is unavailable'), 'removed source does not appear empty');
    assert.equal(await evaluate(text('Attempt 2: Completed')), false);
    await screenshot('23-attempt-unavailable');
  } finally {
    await sql`update job_executions set deleted_at = null where id = ${id}`;
  }
  await button('Refresh attempt history');
  await waitFor(text('Attempt 2: Completed'), 'source restored');
  assert.deepEqual(
    (await sql`select attempts, result from job_executions where id = ${id}`)[0],
    before,
    'Reads, failures and access checks never repeat execution',
  );
  await clickExpression(`${row}.querySelector('summary')`);
  await clickExpression(`document.querySelector('[data-execution-id="${legacyJobId}"] summary')`);
  await waitFor(
    `document.querySelector('[data-execution-id="${legacyJobId}"]')?.innerText.includes('5 of 5 attempts have no retained details.')`,
    'legacy summary is not fabricated history',
  );
  await screenshot('24-attempt-legacy');
  await clickExpression(`document.querySelector('[data-execution-id="${legacyJobId}"] summary')`);
  console.log(
    'PASS: retained interrupted/completed attempts, keyboard/loading/error/denied recovery and responsive history; no repeated effects.',
  );
}
