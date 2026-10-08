import assert from 'node:assert/strict';
import { randomUUID } from 'node:crypto';
import pino from 'pino';
import { ExecutionService } from '../../worker/dist/execution.js';

export async function verifyExecutionRecovery({
  sql,
  firm,
  user,
  api,
  send,
  evaluate,
  waitFor,
  clickExpression,
  button,
  type,
  screenshot,
  listeners,
  startOwnedWorker,
  stopOwnedWorker,
}) {
  const id = randomUUID();
  const [current] = await sql`select revision from firms where id = ${firm}`;
  await sql`insert into outbox_events (id, firm_id, created_by, command_id, request_id, event_type, payload, available_at)
    values (${id}, ${firm}, ${user}, ${randomUUID()}, ${randomUUID()}, 'firm.renamed.v1',
      ${sql.json({ firmId: firm, revision: current.revision - 1 })}, now() + interval '1 hour')`;
  await sql`insert into job_executions (id, outbox_event_id, firm_id, created_by) values (${id}, ${id}, ${firm}, ${user})`;
  const service = new ExecutionService(sql, { enqueue: async () => {} }, pino({ level: 'silent' }));
  await service.process(id);
  const row = `document.querySelector('[data-execution-id="${id}"]')`;
  const text = (value) => `${row}?.innerText.includes(${JSON.stringify(value)})`;
  await button('Refresh background work');
  await waitFor(text('Blocked'), 'failed source read');
  let paused;
  listeners.set('Fetch.requestPaused', (event) => {
    paused = event.requestId;
  });
  await send('Fetch.enable', {
    patterns: [
      { urlPattern: `${api}/firms/current/executions/${id}/recovery`, requestStage: 'Request' },
    ],
  });
  await clickExpression(`${row}.querySelector('summary')`);
  await waitFor(
    `Boolean(${row}.querySelector('[aria-label="Loading recovery review"]'))`,
    'loading review',
  );
  await screenshot('27-recovery-loading');
  assert(paused, 'Review request paused');
  await send('Fetch.continueRequest', { requestId: paused });
  await send('Fetch.disable');
  await waitFor(text(`profile revision ${current.revision}`), 'authorized current review');
  const selector = `[data-execution-id="${id}"] textarea`;
  await type(selector, 'Reviewed current profile after the previous check became stale.');
  await sql`update firms set revision = revision + 1 where id = ${firm}`;
  await clickExpression(`${row}.querySelector('button[type="submit"]')`);
  await waitFor(text('The reviewed check changed'), 'stale review rejected');
  await waitFor(text(`profile revision ${current.revision + 1}`), 'changed review reloaded');
  assert.equal(
    (await sql`select count(*)::int as n from execution_recoveries where source_job_id = ${id}`)[0]
      .n,
    0,
  );
  await screenshot('28-recovery-stale-review');
  let committed = false;
  listeners.set('Fetch.requestPaused', (event) => {
    if (event.request.method !== 'POST') {
      void send('Fetch.continueRequest', { requestId: event.requestId });
      return;
    }
    assert.equal(event.responseStatusCode, 200, 'New command committed before response loss');
    committed = true;
    void send('Fetch.failRequest', { requestId: event.requestId, errorReason: 'ConnectionClosed' });
  });
  await send('Fetch.enable', {
    patterns: [
      { urlPattern: `${api}/firms/current/executions/${id}/recovery`, requestStage: 'Response' },
    ],
  });
  await clickExpression(`${row}.querySelector('button[type="submit"]')`);
  await waitFor(text('The request outcome is unconfirmed'), 'uncertain response preserves intent');
  assert(committed);
  await screenshot('29-recovery-response-lost');
  const [recovery] =
    await sql`select id, replacement_event_id from execution_recoveries where source_job_id = ${id}`;
  assert(recovery);
  await send('Fetch.disable');
  await button('Check same request');
  await waitFor(
    `document.body.innerText.includes('New profile check requested. Refresh background work for its current outcome.')`,
    'same request recovers persisted response',
  );
  assert.equal(
    (await sql`select count(*)::int as n from execution_recoveries where source_job_id = ${id}`)[0]
      .n,
    1,
  );
  assert.equal(
    (await sql`select count(*)::int as n from command_receipts where id = ${recovery.id}`)[0].n,
    1,
  );
  const replacementRow = `document.querySelector('[data-execution-id="${recovery.replacement_event_id}"]')`;
  await waitFor(
    `${replacementRow}?.innerText.includes('Waiting to start')`,
    'truthful pending replacement',
  );
  await screenshot('30-recovery-pending');
  startOwnedWorker();
  try {
    let completed = false;
    for (let check = 0; check < 40; check++) {
      completed =
        (
          await sql`select status from job_executions where id = ${recovery.replacement_event_id}`
        )[0]?.status === 'succeeded';
      if (completed) break;
      await new Promise((resolve) => setTimeout(resolve, 250));
    }
    assert(completed, 'Real worker persisted replacement outcome');
  } finally {
    await stopOwnedWorker();
  }
  await button('Refresh background work');
  await waitFor(
    `${replacementRow}?.innerText.includes('Completed')`,
    'real worker completion visible',
  );
  await clickExpression(`${row}.querySelector('summary')`);
  await waitFor(text('A new check was already requested.'), 'single recovery provenance visible');
  await waitFor(text('Attempt 1: Blocked'), 'old failed attempt retained');
  assert.deepEqual(
    (await sql`select status, attempts, last_error_code from job_executions where id = ${id}`)[0],
    { status: 'blocked', attempts: 1, last_error_code: 'SOURCE_CHANGED' },
  );
  await send('Emulation.setDeviceMetricsOverride', {
    width: 320,
    height: 1000,
    deviceScaleFactor: 1,
    mobile: true,
  });
  await waitFor(
    `Math.abs(document.querySelector('aside').getBoundingClientRect().width - 62) < 1`,
    'mobile sidebar settled',
  );
  assert(
    await evaluate(
      `(() => {const panel = ${row}; return panel.scrollWidth <= panel.clientWidth && panel.getBoundingClientRect().right <= 320;})()`,
    ),
    'Recovery fits mobile viewport',
  );
  const region = await send('Runtime.evaluate', {
    expression: `${row}.querySelector('[aria-label="Review failed profile check"]')`,
  });
  assert(region.result.objectId, 'Recovery region exists');
  try {
    await send('DOM.scrollIntoViewIfNeeded', { objectId: region.result.objectId });
  } finally {
    await send('Runtime.releaseObject', { objectId: region.result.objectId });
  }
  await screenshot('31-recovery-mobile');
  await send('Emulation.setDeviceMetricsOverride', {
    width: 1440,
    height: 1000,
    deviceScaleFactor: 1,
    mobile: false,
  });
  await waitFor(
    `Math.abs(document.querySelector('aside').getBoundingClientRect().width - 256) < 1`,
    'desktop sidebar settled',
  );
  console.log(
    'PASS: review loading, stale review rejection, committed-response loss, identical retry, one replacement, actual worker completion, preserved failure, responsive layout.',
  );
}
