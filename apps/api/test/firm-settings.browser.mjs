// Focused local end-to-end check. Requires live staff web :3100, API :3300,
// local Supabase, and an isolated Chrome debugging endpoint :9223.
import assert from 'node:assert/strict';
import { spawn } from 'node:child_process';
import { execFile } from 'node:child_process';
import { promisify } from 'node:util';
import { randomUUID } from 'node:crypto';
import { mkdir, writeFile } from 'node:fs/promises';
import { fileURLToPath } from 'node:url';
import postgres from 'postgres';
import { SignJWT } from 'jose';
import { verifyExecutionHistory } from './execution-history.browser.mjs';
import { verifyExecutionRecovery } from './execution-recovery.browser.mjs';
import { verifyStaffAccess } from './staff-access.browser.mjs';
import { verifyStaffInvitations } from './staff-invitation.browser.mjs';
import { verifyFirmProvision } from './firm-provision.browser.mjs';
import { verifyStaffSession } from './staff-session.browser.mjs';

const databaseUrl =
  process.env.DATABASE_URL ?? 'postgresql://postgres:postgres@127.0.0.1:54322/postgres';
assert(
  ['localhost', '127.0.0.1'].includes(new URL(databaseUrl).hostname),
  'Local database required',
);
const sql = postgres(databaseUrl, { max: 1 });
const secret = new TextEncoder().encode('super-secret-jwt-token-with-at-least-32-characters-long');
const supabase = 'http://127.0.0.1:54321';
const web = 'http://localhost:3100';
const api = 'http://127.0.0.1:3300';
const artifacts = process.env.BROWSER_ARTIFACT_DIR ?? '/private/tmp/clepso-firm-browser';
const email = `browser-${randomUUID()}@clepso.test`;
const password = `Local-test-only-${randomUUID()}!`;
let firm = randomUUID();
const provisionOnly = process.env.RUN_PROVISION_ONLY === '1';
const invitationOnly = process.env.RUN_INVITATION_ONLY === '1';
const sessionOnly = process.env.RUN_SESSION_ONLY === '1';
const selectionOnly = process.env.RUN_SELECTION_ONLY === '1';
const matterOnly = process.env.RUN_MATTER_ONLY === '1';
const contactOnly = process.env.RUN_CONTACT_ONLY === '1';
const matterAccessOnly = process.env.RUN_MATTER_ACCESS_ONLY === '1';
const staffRolesOnly = process.env.RUN_STAFF_ROLES_ONLY === '1';
const staffLifecycleOnly = process.env.RUN_STAFF_LIFECYCLE_ONLY === '1';
const ownedUsers = [];
let user;
let socket;
let browserContextId;
let ownedWorker;
const errors = [];
const pending = new Map();
const listeners = new Map();
let nextId = 0;
const runFile = promisify(execFile);
const readinessContainer = process.env.READINESS_REDIS_CONTAINER;
if (readinessContainer)
  assert(
    /^clepso-(?:m00-s03[b-d]|m01-s03)-[a-z0-9-]+$/.test(readinessContainer),
    'Explicit test-owned Redis container required',
  );
let redisPaused = false;

async function browserCommand(method, params = {}) {
  const endpoint = await (await fetch('http://127.0.0.1:9223/json/version')).json();
  const connection = new WebSocket(endpoint.webSocketDebuggerUrl);
  try {
    await new Promise((resolve, reject) => {
      connection.onopen = resolve;
      connection.onerror = reject;
    });
    const result = new Promise((resolve, reject) => {
      const deadline = setTimeout(
        () => reject(new Error(`Browser command timed out: ${method}`)),
        5000,
      );
      connection.onmessage = ({ data }) => {
        const message = JSON.parse(data);
        if (message.id !== 1) return;
        clearTimeout(deadline);
        if (message.error) reject(new Error(message.error.message));
        else resolve(message.result);
      };
    });
    connection.send(JSON.stringify({ id: 1, method, params }));
    return await result;
  } finally {
    connection.close();
  }
}

async function stopOwnedWorker() {
  if (!ownedWorker || ownedWorker.exitCode !== null) return;
  await new Promise((resolve) => {
    const deadline = setTimeout(() => ownedWorker.kill('SIGKILL'), 10000);
    ownedWorker.once('exit', () => {
      clearTimeout(deadline);
      resolve();
    });
    ownedWorker.kill('SIGTERM');
  });
}
function startOwnedWorker() {
  const redisUrl = process.env.REDIS_URL ?? 'redis://127.0.0.1:6389';
  assert(['localhost', '127.0.0.1'].includes(new URL(redisUrl).hostname), 'Local Redis required');
  ownedWorker = spawn(
    process.execPath,
    [fileURLToPath(new URL('../../worker/dist/main.js', import.meta.url))],
    {
      env: { ...process.env, DATABASE_URL: databaseUrl, REDIS_URL: redisUrl },
      stdio: ['ignore', 'inherit', 'inherit'],
    },
  );
}

function send(method, params = {}) {
  const id = ++nextId;
  return new Promise((resolve, reject) => {
    const timer = setTimeout(() => {
      pending.delete(id);
      reject(new Error(`CDP timeout: ${method}`));
    }, 15_000);
    pending.set(id, {
      resolve: (result) => {
        clearTimeout(timer);
        resolve(result);
      },
      reject,
    });
    socket.send(JSON.stringify({ id, method, params }));
  });
}
async function evaluate(expression) {
  const result = await send('Runtime.evaluate', { expression, returnByValue: true });
  if (result.exceptionDetails) throw new Error('Browser evaluation failed');
  return result.result.value;
}
async function waitFor(expression, label) {
  const deadline = Date.now() + 30_000;
  while (Date.now() < deadline) {
    if (await evaluate(expression)) return;
    await new Promise((resolve) => setTimeout(resolve, 100));
  }
  throw new Error(`Browser state timed out: ${label}`);
}
async function clickExpression(expression) {
  const { result: target } = await send('Runtime.evaluate', { expression });
  assert(target.objectId, 'Interactive element exists');
  try {
    await send('DOM.scrollIntoViewIfNeeded', { objectId: target.objectId });
  } finally {
    await send('Runtime.releaseObject', { objectId: target.objectId });
  }
  const point = await evaluate(`(() => { const element = ${expression};
    if (!element) return null; const r = element.getBoundingClientRect();
    return {x:r.x+r.width/2,y:r.y+r.height/2}; })()`);
  assert(point, 'Interactive element exists');
  await send('Input.dispatchMouseEvent', {
    type: 'mousePressed',
    button: 'left',
    clickCount: 1,
    ...point,
  });
  await send('Input.dispatchMouseEvent', {
    type: 'mouseReleased',
    button: 'left',
    clickCount: 1,
    ...point,
  });
}
const button = (label) =>
  clickExpression(
    `[...document.querySelectorAll('button')].find(b => b.textContent.trim() === ${JSON.stringify(label)})`,
  );
async function type(selector, value) {
  // Navigation/font layout can move a field between its measured point and native click.
  for (let attempt = 0; attempt < 3; attempt++) {
    await clickExpression(`document.querySelector(${JSON.stringify(selector)})`);
    if (
      await evaluate(
        `document.activeElement === document.querySelector(${JSON.stringify(selector)})`,
      )
    )
      break;
  }
  assert(
    await evaluate(
      `document.activeElement === document.querySelector(${JSON.stringify(selector)})`,
    ),
    'Native input focus established',
  );
  await send('Input.dispatchKeyEvent', {
    type: 'keyDown',
    key: 'a',
    code: 'KeyA',
    modifiers: 4,
    commands: ['selectAll'],
  });
  await send('Input.dispatchKeyEvent', { type: 'keyUp', key: 'a', code: 'KeyA', modifiers: 4 });
  await send('Input.insertText', { text: value });
  if (selector !== 'input[type="password"]') {
    assert.equal(
      await evaluate(`document.querySelector(${JSON.stringify(selector)}).value`),
      value,
    );
  }
}
const hasText = (text) => `document.body.innerText.includes(${JSON.stringify(text)})`;
const valueIs = (text) =>
  `document.querySelector('input[aria-label="Firm name"]')?.value === ${JSON.stringify(text)}`;
async function screenshot(name) {
  const { data } = await send('Page.captureScreenshot', { format: 'png' });
  await writeFile(`${artifacts}/${name}.png`, Buffer.from(data, 'base64'));
}

try {
  const preflight = await fetch(`${api}/firms/current`, {
    method: 'OPTIONS',
    headers: {
      Origin: web,
      'Access-Control-Request-Method': 'GET',
      'Access-Control-Request-Headers': 'authorization',
    },
  });
  assert.equal(
    preflight.headers.get('Access-Control-Allow-Origin'),
    web,
    'API must be running with the local staff origin explicitly configured',
  );
  await mkdir(artifacts, { recursive: true });
  if (process.env.RUN_WORKER === '1') {
    startOwnedWorker();
  }
  const adminToken = await new SignJWT({ role: 'service_role' })
    .setProtectedHeader({ alg: 'HS256' })
    .setExpirationTime('30m')
    .sign(secret);
  const created = await fetch(`${supabase}/auth/v1/admin/users`, {
    method: 'POST',
    headers: {
      apikey: adminToken,
      Authorization: `Bearer ${adminToken}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({ email, password, email_confirm: true }),
  });
  assert.equal(created.status, 200);
  user = (await created.json()).id;
  assert(user);
  if (!provisionOnly) {
    await sql`insert into firms (id, name) values (${firm}, 'Browser firm LLP')`;
    await sql`insert into firm_members (firm_id, user_id, role) values (${firm}, ${user}, 'owner')`;
  }

  // Isolate cookies/storage as well as emulation and lifecycle state; no session survives a run.
  ({ browserContextId } = await browserCommand('Target.createBrowserContext'));
  const { targetId } = await browserCommand('Target.createTarget', {
    url: 'about:blank',
    browserContextId,
  });
  const tabs = await (await fetch('http://127.0.0.1:9223/json/list')).json();
  const tab = tabs.find((entry) => entry.id === targetId);
  assert(tab, 'Test-owned browser page exists');
  socket = new WebSocket(tab.webSocketDebuggerUrl);
  await new Promise((resolve, reject) => {
    socket.onopen = resolve;
    socket.onerror = reject;
  });
  socket.onmessage = ({ data }) => {
    const message = JSON.parse(data);
    if (message.id) {
      const callback = pending.get(message.id);
      pending.delete(message.id);
      if (message.error) callback?.reject(new Error(message.error.message));
      else callback?.resolve(message.result);
    } else {
      if (message.method === 'Runtime.exceptionThrown')
        errors.push(message.params.exceptionDetails.text);
      listeners.get(message.method)?.(message.params);
    }
  };
  await send('Page.enable');
  await send('Runtime.enable');
  await send('Log.enable');
  await send('Network.enable');
  listeners.set('Network.loadingFailed', (event) => {
    console.log(
      JSON.stringify({
        event: 'browser_network_failure',
        errorText: event.errorText,
        blockedReason: event.blockedReason,
        corsError: event.corsErrorStatus?.corsError,
      }),
    );
  });
  listeners.set('Runtime.consoleAPICalled', (event) => {
    if (['error', 'warning'].includes(event.type)) errors.push(`Console ${event.type}`);
  });
  await send('Emulation.setDeviceMetricsOverride', {
    width: provisionOnly ? 320 : 1440,
    height: provisionOnly ? 780 : 1000,
    deviceScaleFactor: 1,
    mobile: provisionOnly,
  });
  await send('Emulation.resetPageScaleFactor');
  await send('Page.navigate', { url: `${web}/sign-in?next=/settings` });
  await send('Page.bringToFront');
  await waitFor(`Boolean(document.querySelector('input[type="email"]'))`, 'sign-in form');
  await waitFor(
    `Object.keys(document.querySelector('input[type="email"]')).some(key => key.startsWith('__reactProps'))`,
    'interactive sign-in form',
  );
  await waitFor(`document.fonts.status === 'loaded'`, 'sign-in fonts loaded');
  await type('input[type="email"]', email);
  await type('input[type="password"]', password);
  let heldRead;
  listeners.set('Fetch.requestPaused', (event) => {
    heldRead = event.requestId;
  });
  await send('Fetch.enable', {
    patterns: [{ urlPattern: `${api}/firms/current`, requestStage: 'Request' }],
  });
  await button('Sign in');
  await waitFor(
    `Boolean(document.querySelector('[aria-label="Loading firm profile"]'))`,
    'loading state',
  );
  await screenshot('00-loading');
  assert(heldRead);
  await send('Fetch.continueRequest', { requestId: heldRead });
  await send('Fetch.disable');
  if (staffLifecycleOnly) {
    await waitFor(valueIs('Browser firm LLP'), 'authenticated firm read');
    await waitFor(
      hasText('No removals or restorations recorded yet.'),
      'membership controls ready',
    );
    const { verifyStaffLifecycle } = await import('./staff-lifecycle.browser.mjs');
    await verifyStaffLifecycle({
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
    });
    assert.deepEqual(
      errors,
      [],
      'No unexpected runtime exceptions during staff membership changes',
    );
    console.log(
      'PASS: audited staff removal/restoration, handoff refusal without disclosure, response-loss recovery, revoked grants, stale review, self-removal, responsive and keyboard states.',
    );
  } else if (staffRolesOnly) {
    await waitFor(valueIs('Browser firm LLP'), 'authenticated firm read');
    await waitFor(hasText('No role changes recorded yet.'), 'role controls ready');
    const { verifyStaffRoles } = await import('./staff-roles.browser.mjs');
    await verifyStaffRoles({
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
    });
    assert.deepEqual(errors, [], 'No unexpected runtime exceptions during staff role management');
    console.log(
      'PASS: audited staff roles, replay and stale review, owner protection, live permission loss, durable history, responsive and keyboard states.',
    );
  } else if (matterAccessOnly) {
    await waitFor(valueIs('Browser firm LLP'), 'authenticated firm read');
    const { verifyMatterAccess } = await import('./matter-access.browser.mjs');
    await verifyMatterAccess({
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
      clickExpression,
    });
    assert.deepEqual(errors, [], 'No unexpected runtime exceptions during access management');
    console.log(
      'PASS: audited staff grants/revocation, lost-response recovery, last manager, live roles, protected reads, responsive and keyboard/accessibility states.',
    );
  } else if (contactOnly) {
    await waitFor(valueIs('Browser firm LLP'), 'authenticated firm read');
    const { verifyContacts } = await import('./contact.browser.mjs');
    await verifyContacts({
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
      clickExpression,
    });
    assert.deepEqual(errors, [], 'No unexpected runtime exceptions during contact flow');
    console.log(
      'PASS: firm directory, response-loss replay, stale edit refusal, literal search, two clients on one matter, walled contact matters, link ending, live role/membership, responsive and keyboard/accessibility states.',
    );
  } else if (matterOnly) {
    await waitFor(valueIs('Browser firm LLP'), 'authenticated firm read');
    const { verifyMatter } = await import('./matter.browser.mjs');
    await verifyMatter({
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
    });
    assert.deepEqual(errors, [], 'No unexpected runtime exceptions during matter flow');
    console.log(
      'PASS: durable non-court matter creation, response-loss replay, reload, grant revocation, read retry, role enforcement, responsive and keyboard/accessibility states.',
    );
  } else if (selectionOnly) {
    await waitFor(valueIs('Browser firm LLP'), 'authenticated firm read');
    const { verifyStaffFirmSelection } = await import('./staff-firm-selection.browser.mjs');
    await verifyStaffFirmSelection({
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
    });
    assert.deepEqual(errors, [], 'No unexpected runtime exceptions during workspace selection');
    console.log(
      'PASS: real session workspace switching, committed response-loss retry, target-read recovery, revocation, responsive/accessibility states.',
    );
  } else if (sessionOnly) {
    await waitFor(valueIs('Browser firm LLP'), 'authenticated firm read');
    await verifyStaffSession({
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
    });
    assert.deepEqual(
      errors,
      [],
      'No unexpected runtime exceptions during workspace/session checks',
    );
    console.log(
      'PASS: live workspace discovery, denied cached names, responsive/accessibility states, truthful Auth failure, actual logout and protected navigation.',
    );
  } else if (invitationOnly) {
    await waitFor(valueIs('Browser firm LLP'), 'authenticated firm read');
    await verifyStaffInvitations({
      clickExpression,
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
      adminToken,
      ownedUsers,
    });
    assert.deepEqual(errors, [], 'No unexpected runtime exceptions during staff invitations');
    console.log(
      'PASS: prepared/accepted invitations, response-loss retries, live permissions, authentic recipient session refresh, persistence, accessibility and responsive layouts.',
    );
  } else if (provisionOnly) {
    firm = await verifyFirmProvision({
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
    });
    assert.deepEqual(errors, [], 'No unexpected runtime exceptions during first-firm setup');
    console.log(
      'PASS: first-firm setup, interrupted response, session-refresh recovery, durable owner grant/check, responsive layout and accessible controls.',
    );
    console.log(`Screenshots: ${artifacts}`);
  } else {
    await waitFor(valueIs('Browser firm LLP'), 'authenticated firm read');
    await waitFor(
      hasText('No firm-profile background work yet.'),
      'verified empty background-work panel',
    );
    // Hold one inspection independently of profile preflight/loading requests.
    let heldInspection;
    listeners.set('Fetch.requestPaused', (event) => {
      if (event.request.method !== 'GET')
        void send('Fetch.continueRequest', { requestId: event.requestId });
      else heldInspection = event.requestId;
    });
    await send('Fetch.enable', {
      patterns: [{ urlPattern: `${api}/firms/current/executions`, requestStage: 'Request' }],
    });
    await button('Refresh background work');
    await waitFor(
      `Boolean(document.querySelector('[aria-label="Checking background work"]'))`,
      'background-work loading state',
    );
    await screenshot('05-background-loading');
    assert(heldInspection);
    await send('Fetch.continueRequest', { requestId: heldInspection });
    await send('Fetch.disable');
    await waitFor(
      hasText('No firm-profile background work yet.'),
      'verified empty background-work panel',
    );
    await screenshot('01-owner');
    await waitFor(
      `document.querySelector('[aria-label="Current firm access"]')?.innerText.includes('Firm owner')`,
      'live current-role access card',
    );
    const accessTree = await send('Accessibility.getFullAXTree');
    assert(
      accessTree.nodes.some(
        (node) => node.role?.value === 'button' && node.name?.value === 'Refresh access',
      ),
      'Accessible current-role refresh',
    );
    await verifyStaffAccess({ api, web, send, evaluate, waitFor, button, screenshot, listeners });
    await type('input[aria-label="Firm name"]', 'Browser saved LLP');
    await button('Save firm name');
    await waitFor(
      `${valueIs('Browser saved LLP')} && ${hasText('Firm name saved.')}`,
      'durable save',
    );
    await waitFor(
      `document.querySelectorAll('[data-execution-id]').length > 0`,
      'saving refreshes the background-work read automatically',
    );
    await send('Page.reload');
    await waitFor(valueIs('Browser saved LLP'), 'reload persistence');

    // A lost response after a committed command must retry the original intent once.
    let lostResponse = false;
    listeners.set('Fetch.requestPaused', (event) => {
      if (event.request.method === 'PATCH' && !lostResponse) {
        lostResponse = true;
        void send('Fetch.failRequest', {
          requestId: event.requestId,
          errorReason: 'ConnectionClosed',
        });
      } else void send('Fetch.continueRequest', { requestId: event.requestId });
    });
    await send('Fetch.enable', {
      patterns: [{ urlPattern: `${api}/firms/current/name`, requestStage: 'Response' }],
    });
    await type('input[aria-label="Firm name"]', 'Recovered browser LLP');
    await button('Save firm name');
    await waitFor(hasText('The save could not be confirmed.'), 'uncertain result');
    await send('Fetch.disable');
    await button('Save firm name');
    await waitFor(
      `${valueIs('Recovered browser LLP')} && ${hasText('Firm name saved.')}`,
      'safe response-loss retry',
    );
    const [effects] =
      await sql`select revision, (select count(*)::int from command_receipts where firm_id = ${firm}) as commands
    from firms where id = ${firm}`;
    assert.deepEqual(effects, { revision: 2, commands: 2 });

    const otherToken = await new SignJWT({
      role: 'authenticated',
      firm_id: firm,
      user_role: 'owner',
    })
      .setSubject(user)
      .setIssuer(`${supabase}/auth/v1`)
      .setAudience('authenticated')
      .setProtectedHeader({ alg: 'HS256' })
      .setExpirationTime('30m')
      .sign(secret);
    if (ownedWorker) {
      let completed;
      for (let attempt = 0; attempt < 100; attempt++) {
        [completed] = await sql`select j.id, j.status, j.attempts from job_executions j
        join outbox_events e on e.id = j.outbox_event_id
        where e.firm_id = ${firm} and e.payload ->> 'revision' = '2'`;
        if (completed?.status === 'succeeded') break;
        await new Promise((resolve) => setTimeout(resolve, 100));
      }
      assert.equal(
        completed?.status,
        'succeeded',
        'Confirmed browser edit reaches a durable worker result',
      );
      assert.equal(completed?.attempts, 1, 'Response-loss replay does not repeat processing');
      const inspection = await fetch(`${api}/firms/current/executions`, {
        headers: { Authorization: `Bearer ${otherToken}` },
      });
      assert.equal(inspection.status, 200);
      assert(
        (await inspection.json()).items.some(
          (item) => item.id === completed.id && item.status === 'succeeded',
        ),
      );
      await button('Refresh background work');
      await waitFor(
        `document.querySelector('[data-execution-id="${completed.id}"]')?.innerText.includes('Completed')`,
        'durable completion visible in staff Settings',
      );
      assert(await evaluate(hasText('No messages were sent or connected services updated.')));
      console.log(
        'PASS: browser command → committed outbox → real Redis → durable worker result → authorized inspection.',
      );
      await button('Check processing availability');
      await waitFor(hasText('Recently active'), 'fresh worker signal through the actual API');
      await screenshot('11-processing-active');
      await stopOwnedWorker();
      await waitFor(
        hasText('Availability check expired'),
        'worker evidence expires without a read or job mutation',
      );
      assert.equal(
        await evaluate(hasText('Recently active')),
        false,
        'Expired worker evidence is hidden',
      );
      await button('Check processing availability');
      await waitFor(
        hasText('No recent processing signal was received.'),
        'stopped worker cannot be reported active',
      );
      await screenshot('12-processing-unconfirmed');
      startOwnedWorker();
      for (let attempt = 0; attempt < 50; attempt++) {
        const response = await fetch(`${api}/firms/current/processing-readiness`, {
          headers: { Authorization: `Bearer ${otherToken}` },
        });
        if ((await response.json()).worker === 'recently_observed') break;
        await new Promise((resolve) => setTimeout(resolve, 100));
      }
      await button('Check processing availability');
      await waitFor(hasText('Recently active'), 'restarted worker produces new evidence');
      console.log(
        'PASS: live queue/database/worker availability → stopped worker → expiry → unconfirmed → restart recovery.',
      );
      if (readinessContainer) {
        await runFile('docker', ['pause', readinessContainer], { timeout: 5000 });
        redisPaused = true;
        try {
          await button('Check processing availability');
          await waitFor(
            hasText('The queue could not be reached.'),
            'actual paused Redis reports unavailable',
          );
          assert.equal(await evaluate(hasText('Recently active')), false);
          await screenshot('13-processing-queue-outage');
        } finally {
          await runFile('docker', ['unpause', readinessContainer], { timeout: 5000 });
          redisPaused = false;
        }
        for (let attempt = 0; attempt < 60; attempt++) {
          const response = await fetch(`${api}/firms/current/processing-readiness`, {
            headers: { Authorization: `Bearer ${otherToken}` },
          });
          if ((await response.json()).worker === 'recently_observed') break;
          await new Promise((resolve) => setTimeout(resolve, 100));
        }
        await button('Check processing availability');
        await waitFor(
          hasText('Recently active'),
          'actual Redis recovery produces fresh availability',
        );
        console.log(
          'PASS: actual Redis pause → bounded unavailable probe → unpause → fresh worker recovery.',
        );
      }
      for (const failure of ['network', 'malformed']) {
        listeners.set('Fetch.requestPaused', (event) => {
          if (event.request.method !== 'GET') {
            void send('Fetch.continueRequest', { requestId: event.requestId });
            return;
          }
          void (failure === 'network'
            ? send('Fetch.failRequest', {
                requestId: event.requestId,
                errorReason: 'ConnectionRefused',
              })
            : send('Fetch.fulfillRequest', {
                requestId: event.requestId,
                responseCode: 200,
                responseHeaders: [
                  { name: 'Content-Type', value: 'application/json' },
                  { name: 'Access-Control-Allow-Origin', value: web },
                ],
                body: Buffer.from('{"private":"do not display"}').toString('base64'),
              }));
        });
        await send('Fetch.enable', {
          patterns: [
            { urlPattern: `${api}/firms/current/processing-readiness`, requestStage: 'Request' },
          ],
        });
        await button('Check processing availability');
        await waitFor(
          hasText('Processing availability could not be checked'),
          `availability ${failure} failure`,
        );
        await screenshot(`16-processing-${failure}`);
        assert.equal(await evaluate(hasText('Recently active')), false);
        assert.equal(await evaluate(hasText('do not display')), false);
        await send('Fetch.disable');
        await button('Check processing availability');
        await waitFor(hasText('Recently active'), `availability ${failure} recovery`);
      }
    }
    await type('input[aria-label="Firm name"]', 'Stale browser edit');
    const edit = await fetch(`${api}/firms/current/name`, {
      method: 'PATCH',
      headers: {
        Authorization: `Bearer ${otherToken}`,
        'Content-Type': 'application/json',
        'Idempotency-Key': randomUUID(),
      },
      body: JSON.stringify({ name: 'Concurrent colleague edit', expectedRevision: 2 }),
    });
    assert.equal(edit.status, 200);
    await send('Page.setWebLifecycleState', { state: 'frozen' });
    await send('Page.setWebLifecycleState', { state: 'active' });
    await new Promise((resolve) => setTimeout(resolve, 300));
    assert.equal(
      await evaluate(`document.querySelector('input[aria-label="Firm name"]').value`),
      'Stale browser edit',
      'Background refresh preserves the draft',
    );
    await button('Save firm name');
    await waitFor(hasText('The firm profile changed.'), 'conflict review');
    await screenshot('02-conflict');
    await button('Load current profile');
    await waitFor(valueIs('Concurrent colleague edit'), 'explicit conflict reload');

    // Fail a read, then recover through the actual retry interaction.
    listeners.set(
      'Fetch.requestPaused',
      (event) =>
        void send('Fetch.failRequest', {
          requestId: event.requestId,
          errorReason: 'ConnectionRefused',
        }),
    );
    await send('Fetch.enable', {
      patterns: [{ urlPattern: `${api}/firms/current`, requestStage: 'Request' }],
    });
    await send('Page.reload');
    await waitFor(hasText('The firm profile did not load'), 'read error');
    await screenshot('03-error');
    await send('Fetch.disable');
    await button('Try again');
    await waitFor(valueIs('Concurrent colleague edit'), 'read retry');

    // Controlled test-owned DB records exercise the same authorized API as real worker results.
    // Future eligibility prevents the worker from changing these inspection cases.
    const cases = [
      ['awaiting_dispatch', 'QUEUE_UNAVAILABLE', 0, 'Waiting to start'],
      ['pending', null, 0, 'Queued'],
      ['running', null, 1, 'Processing'],
      ['retry', 'PROCESSING_FAILED', 1, 'Retry pending'],
      ['blocked', 'SOURCE_CHANGED', 1, 'Blocked'],
      ['failed', 'ATTEMPTS_EXHAUSTED', 5, 'Failed'],
    ];
    const caseIds = [];
    for (const [status, code, attempts, label] of cases) {
      const id = randomUUID();
      caseIds.push(id);
      await sql`insert into outbox_events (id, firm_id, created_by, command_id, request_id,
      event_type, payload, available_at, attempts, last_error_code)
      values (${id}, ${firm}, ${user}, ${randomUUID()}, ${randomUUID()}, 'firm.renamed.v1',
        ${sql.json({ firmId: firm, revision: 3, private: 'Do not display this payload' })},
        now() + interval '1 hour', 2, ${status === 'awaiting_dispatch' ? code : null})`;
      if (status !== 'awaiting_dispatch')
        await sql`insert into job_executions (id, outbox_event_id, firm_id, created_by,
        status, attempts, available_at, completed_at, last_error_code, lease_token, lease_until)
        values (${id}, ${id}, ${firm}, ${user}, ${status}, ${attempts}, now() + interval '1 hour',
          ${['blocked', 'failed'].includes(status) ? new Date() : null}, ${code},
          ${status === 'running' ? randomUUID() : null},
          ${status === 'running' ? new Date(Date.now() + 3_600_000) : null})`;
      await button('Refresh background work');
      await waitFor(
        `document.querySelector('[data-execution-id="${id}"]')?.innerText.includes(${JSON.stringify(label)})`,
        `database inspection status: ${status}`,
      );
    }
    assert.equal(await evaluate(hasText('Do not display this payload')), false);
    assert.equal(
      await evaluate(hasText('The firm profile changed after this check was requested.')),
      true,
    );
    if (process.env.RUN_WORKER === '1') {
      await stopOwnedWorker();
      await verifyExecutionHistory({
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
        legacyJobId: caseIds.at(-1),
      });
      await verifyExecutionRecovery({
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
      });
      startOwnedWorker();
    }
    const [beforeRefresh] = await sql`select
    (select count(*)::int from command_receipts where firm_id = ${firm}) as commands,
    (select count(*)::int from outbox_events where firm_id = ${firm}) as events,
    (select sum(attempts)::int from job_executions where id in ${sql(caseIds)}) as attempts`;
    await screenshot('06-background-states');

    // Inspect disclosure, keyboard access and responsive states without touching browser credentials.
    await clickExpression(`document.querySelector('[data-execution-id="${caseIds[0]}"] summary')`);
    await waitFor(
      `document.querySelector('[data-execution-id="${caseIds[0]}"] details')?.open === true`,
      'processing details disclosure',
    );
    await waitFor(
      hasText('No processing attempts have started.'),
      'truthful empty attempt history',
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
        'sidebar transition settled after resize',
      );
      assert.equal(
        await evaluate(`(() => { const panel = document.querySelector('[aria-labelledby="firm-background-work-title"]');
        return panel.scrollWidth <= panel.clientWidth && panel.getBoundingClientRect().right <= ${width}; })()`),
        true,
        `Background-work panel fits the actual ${width}px viewport without internal overflow`,
      );
      assert.equal(
        await evaluate(`(() => { const panel = document.querySelector('[aria-labelledby="processing-availability-title"]');
      return panel.scrollWidth <= panel.clientWidth && panel.getBoundingClientRect().right <= ${width}; })()`),
        true,
        `Processing-availability panel fits the actual ${width}px viewport without internal overflow`,
      );
      if (width === 320) await screenshot('07-background-mobile');
    }
    const workAX = await send('Accessibility.getFullAXTree');
    assert(
      workAX.nodes.some(
        (node) => node.role?.value === 'heading' && node.name?.value === 'Background work',
      ),
    );
    assert(
      workAX.nodes.some(
        (node) => node.role?.value === 'button' && node.name?.value === 'Refresh background work',
      ),
    );
    assert(
      workAX.nodes.some(
        (node) => node.role?.value === 'heading' && node.name?.value === 'Processing availability',
      ),
    );
    assert(
      workAX.nodes.some(
        (node) =>
          node.role?.value === 'button' && node.name?.value === 'Check processing availability',
      ),
    );
    let availabilityFocused = false;
    for (let tab = 0; tab < 50; tab++) {
      await send('Input.dispatchKeyEvent', { type: 'keyDown', key: 'Tab', code: 'Tab' });
      await send('Input.dispatchKeyEvent', { type: 'keyUp', key: 'Tab', code: 'Tab' });
      availabilityFocused = await evaluate(
        `document.activeElement?.textContent.trim() === 'Check processing availability'`,
      );
      if (availabilityFocused) break;
    }
    assert(availabilityFocused, 'Availability control is reachable by keyboard');
    let availabilityRead;
    listeners.set('Fetch.requestPaused', (event) => {
      if (event.request.method === 'GET') availabilityRead = event.requestId;
      else void send('Fetch.continueRequest', { requestId: event.requestId });
    });
    await send('Fetch.enable', {
      patterns: [
        { urlPattern: `${api}/firms/current/processing-readiness`, requestStage: 'Request' },
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
      `Boolean(document.querySelector('[aria-label="Checking processing availability"]'))`,
      'keyboard availability read shows loading',
    );
    assert(availabilityRead, 'Enter starts a read-only availability check');
    assert.equal(
      await evaluate(hasText('Recently active')),
      false,
      'Rechecking hides old availability',
    );
    await screenshot('14-processing-loading');
    await send('Fetch.continueRequest', { requestId: availabilityRead });
    await send('Fetch.disable');
    await waitFor(hasText('Recently active'), 'keyboard availability refresh');
    // Native Tab traversal must reach the refresh control, then Enter must refresh.
    let refreshFocused = false;
    for (let tab = 0; tab < 50; tab++) {
      await send('Input.dispatchKeyEvent', { type: 'keyDown', key: 'Tab', code: 'Tab' });
      await send('Input.dispatchKeyEvent', { type: 'keyUp', key: 'Tab', code: 'Tab' });
      refreshFocused = await evaluate(
        `document.activeElement?.textContent.trim() === 'Refresh background work'`,
      );
      if (refreshFocused) break;
    }
    assert(refreshFocused, 'Refresh control is reachable by keyboard');
    let keyboardRead;
    listeners.set('Fetch.requestPaused', (event) => {
      keyboardRead = event.requestId;
    });
    await send('Fetch.enable', {
      patterns: [{ urlPattern: `${api}/firms/current/executions`, requestStage: 'Request' }],
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
      `Boolean(document.querySelector('[aria-label="Checking background work"]'))`,
      'keyboard-triggered status read',
    );
    assert(keyboardRead, 'Enter initiates a new inspection read');
    await send('Fetch.continueRequest', { requestId: keyboardRead });
    await send('Fetch.disable');
    await waitFor(hasText('Automatic processing has stopped.'), 'keyboard refresh');
    const [afterRefresh] = await sql`select
    (select count(*)::int from command_receipts where firm_id = ${firm}) as commands,
    (select count(*)::int from outbox_events where firm_id = ${firm}) as events,
    (select sum(attempts)::int from job_executions where id in ${sql(caseIds)}) as attempts`;
    assert.deepEqual(
      afterRefresh,
      beforeRefresh,
      'Refreshing status never repeats a business action or job attempt',
    );

    // A failed refresh must hide warm results; an invalid payload must fail visibly too.
    for (const invalidPayload of [false, true]) {
      listeners.set('Fetch.requestPaused', (event) => {
        if (event.request.method !== 'GET') {
          void send('Fetch.continueRequest', { requestId: event.requestId });
          return;
        }
        void send(
          invalidPayload ? 'Fetch.fulfillRequest' : 'Fetch.failRequest',
          invalidPayload
            ? {
                requestId: event.requestId,
                responseCode: 200,
                responseHeaders: [
                  { name: 'Content-Type', value: 'application/json' },
                  { name: 'Access-Control-Allow-Origin', value: web },
                ],
                body: Buffer.from(JSON.stringify({ items: [{ status: 'delivered' }] })).toString(
                  'base64',
                ),
              }
            : { requestId: event.requestId, errorReason: 'ConnectionRefused' },
        );
      });
      await send('Fetch.enable', {
        patterns: [{ urlPattern: `${api}/firms/current/executions`, requestStage: 'Request' }],
      });
      await button('Refresh background work');
      await waitFor(
        hasText('Background work could not be checked'),
        'inspection error replaces warm results',
      );
      assert.equal(await evaluate(`document.querySelectorAll('[data-execution-id]').length`), 0);
      await screenshot(invalidPayload ? '09-background-invalid' : '08-background-error');
      await send('Fetch.disable');
      await button('Refresh background work');
      await waitFor(hasText('Automatic processing has stopped.'), 'inspection read recovery');
    }

    await sql`update firm_members set role = 'readonly' where firm_id = ${firm} and user_id = ${user}`;
    await button('Refresh background work');
    await waitFor(hasText('Background-work access unavailable'), 'warm-cache role denial');
    assert.equal(await evaluate(`document.querySelectorAll('[data-execution-id]').length`), 0);
    await screenshot('10-background-denied');
    await button('Check processing availability');
    await waitFor(
      hasText('Processing-availability access unavailable'),
      'availability warm-cache role denial',
    );
    await screenshot('15-processing-denied');
    assert.equal(await evaluate(hasText('Recently active')), false);
    await button('Refresh access');
    await waitFor(
      `document.querySelector('[aria-label="Current firm access"]')?.innerText.includes('Read-only staff')`,
      'current database role replaces a warm owner claim',
    );
    await waitFor(
      `document.querySelector('input[aria-label="Firm name"]')?.readOnly === true`,
      'access refresh updates profile permissions',
    );
    assert.equal(
      await evaluate(
        `document.querySelector('[aria-label="Current firm access"]').innerText.includes('Rename the firm')`,
      ),
      false,
    );
    await screenshot('32-staff-access-readonly');
    await send('Page.reload');
    await waitFor(
      `document.querySelector('input[aria-label="Firm name"]')?.readOnly === true`,
      'current-role read-only view',
    );
    assert.equal(await evaluate(`document.body.innerText.includes('Save firm name')`), false);
    assert.equal(
      await evaluate(hasText('Background work')),
      false,
      'Read-only role cannot mount the inspection panel',
    );
    assert.equal(
      await evaluate(hasText('Processing availability')),
      false,
      'Read-only role cannot mount processing inspection',
    );
    await send('Emulation.setDeviceMetricsOverride', {
      width: 390,
      height: 844,
      deviceScaleFactor: 1,
      mobile: true,
    });
    await screenshot('04-mobile-readonly');
    assert.equal(
      await evaluate('document.documentElement.scrollWidth <= innerWidth'),
      true,
      'No horizontal overflow',
    );
    const accessibility = await send('Accessibility.getFullAXTree');
    assert(
      accessibility.nodes.some(
        (node) => node.role?.value === 'textbox' && node.name?.value === 'Firm name',
      ),
    );
    await sql`update firm_members set deleted_at = now() where firm_id = ${firm} and user_id = ${user}`;
    await button('Refresh access');
    await waitFor(hasText('Firm access unavailable'), 'revoked access');
    assert.equal(
      await evaluate(`Boolean(document.querySelector('input[aria-label="Firm name"]'))`),
      false,
    );
    await screenshot('36-staff-access-revoked');
    await send('Page.reload');
    await waitFor(hasText('Firm access unavailable'), 'revocation survives reload');
    assert.deepEqual(errors, [], 'No unexpected runtime exceptions');
    console.log(
      'PASS: real sign-in, persistence, response-loss retry, conflict, error recovery, role change, revocation, responsive layout and accessible field.',
    );
    console.log(`Screenshots: ${artifacts}`);
  }
} catch (error) {
  if (socket?.readyState === WebSocket.OPEN) await screenshot('failure').catch(() => {});
  throw error;
} finally {
  socket?.close();
  if (browserContextId) await browserCommand('Target.disposeBrowserContext', { browserContextId });
  if (redisPaused) await runFile('docker', ['unpause', readinessContainer], { timeout: 5000 });
  await stopOwnedWorker();
  const ownedFirms = new Set([
    firm,
    ...(user ? await sql`select firm_id from firm_members where user_id = ${user}` : []).map(
      (row) => row.firm_id,
    ),
  ]);
  for (const ownedFirm of ownedFirms) {
    if (matterAccessOnly || staffRolesOnly || staffLifecycleOnly || contactOnly) {
      await sql.begin(async (tx) => {
        await tx`set local session_replication_role=replica`;
        await tx`delete from audit_logs where firm_id=${ownedFirm}`;
      });
    }
    for (const table of [
      'matter_parties',
      'contacts',
      'matter_access',
      'matters',
      'staff_session_contexts',
      'staff_invitations',
      'execution_recoveries',
      'job_execution_attempts',
      'job_executions',
      'outbox_events',
      'command_receipts',
      'firm_members',
    ]) {
      await sql`delete from ${sql(table)} where firm_id = ${ownedFirm}`;
    }
    await sql`delete from firms where id = ${ownedFirm}`;
  }
  for (const ownedUser of [...ownedUsers, ...(user ? [user] : [])])
    await sql`delete from auth.users where id = ${ownedUser}`;
  await sql.end();
}
