import assert from 'node:assert/strict';
import { randomUUID } from 'node:crypto';

export async function verifyStaffInvitations({
  sql,
  firm,
  user,
  send,
  evaluate,
  waitFor,
  button,
  clickExpression,
  type,
  hasText,
  screenshot,
  listeners,
  adminToken,
  ownedUsers,
}) {
  const recipientEmail = `invited-${randomUUID()}@clepso.test`,
    password = `Local-invitation-${randomUUID()}!`;
  const created = await fetch('http://127.0.0.1:54321/auth/v1/admin/users', {
    method: 'POST',
    headers: {
      apikey: adminToken,
      Authorization: `Bearer ${adminToken}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({ email: recipientEmail, password, email_confirm: true }),
  });
  assert.equal(created.status, 200);
  const recipient = (await created.json()).id;
  ownedUsers.push(recipient);
  await waitFor(hasText('No staff invitations yet.'), 'empty manager state');
  await screenshot('00-invitations-empty');
  const ax = await send('Accessibility.getFullAXTree');
  for (const [role, name] of [
    ['textbox', 'Staff invitation email'],
    ['combobox', 'Invited staff role'],
    ['button', 'Review new invitation'],
  ])
    assert(
      ax.nodes.some((node) => node.role?.value === role && node.name?.value === name),
      `${name} accessible`,
    );
  await type('input[aria-label="Staff invitation email"]', recipientEmail);
  await send('Input.dispatchKeyEvent', { type: 'keyDown', key: 'Tab', code: 'Tab' });
  await send('Input.dispatchKeyEvent', { type: 'keyUp', key: 'Tab', code: 'Tab' });
  assert.equal(
    await evaluate("document.activeElement?.getAttribute('aria-label')"),
    'Invited staff role',
    'role picker reachable with keyboard',
  );
  await button('Review new invitation');
  let lost = false;
  const loseResponse = (event) => {
    if (event.request.method === 'POST' && event.responseStatusCode === 200 && !lost) {
      lost = true;
      void send('Fetch.failRequest', {
        requestId: event.requestId,
        errorReason: 'ConnectionClosed',
      });
    } else void send('Fetch.continueRequest', { requestId: event.requestId });
  };
  listeners.set('Fetch.requestPaused', loseResponse);
  await send('Fetch.enable', {
    patterns: [
      {
        urlPattern: 'http://127.0.0.1:3300/firms/current/staff-invitations',
        requestStage: 'Response',
      },
    ],
  });
  await button('Confirm invitation');
  await waitFor(
    hasText('The result could not be confirmed.'),
    'lost response explicit uncertainty',
  );
  assert(lost);
  await button('Check invitation request');
  await waitFor(hasText('Invitation prepared'), 'same-intent recovered');
  await send('Fetch.disable');
  await button('Refresh invitations');
  await waitFor(hasText(recipientEmail), 'durable invitation list');
  const [invitation] =
    await sql`select id,revision,status from staff_invitations where firm_id=${firm} and email=${recipientEmail}`;
  assert(invitation);
  assert.equal(
    (
      await sql`select count(*)::int as n from command_receipts where firm_id=${firm} and command='staff.invitation.prepare.v1'`
    )[0].n,
    1,
  );
  assert.equal(
    (await sql`select count(*)::int as n from firm_members where user_id=${recipient}`)[0].n,
    0,
  );
  await screenshot('01-prepared');
  await send('Emulation.setDeviceMetricsOverride', {
    width: 320,
    height: 1000,
    deviceScaleFactor: 1,
    mobile: false,
  });
  await waitFor(
    "innerWidth===320&&parseFloat(getComputedStyle(document.querySelector('.app-sidebar')).width)<=63&&parseFloat(getComputedStyle(document.querySelector('.app-sidebar__label')).opacity)<0.05",
    'mobile shell settled',
  );
  assert.equal(
    await evaluate('document.documentElement.scrollWidth<=innerWidth'),
    true,
    'manager invitation form fits 320px',
  );
  await clickExpression(`document.querySelector('input[aria-label="Staff invitation email"]')`);
  await screenshot('01-prepared-mobile');
  await send('Emulation.setDeviceMetricsOverride', {
    width: 1440,
    height: 1000,
    deviceScaleFactor: 1,
    mobile: false,
  });
  const revokedEmail = `revoked-${recipientEmail}`;
  await type('input[aria-label="Staff invitation email"]', revokedEmail);
  await button('Review new invitation');
  await button('Confirm invitation');
  await waitFor(hasText('Invitation prepared'), 'second invitation prepared');
  await button('Refresh invitations');
  await waitFor(hasText(revokedEmail), 'second invitation in list');
  await clickExpression(
    `[...document.querySelectorAll('li')].find(item=>item.textContent.includes(${JSON.stringify(revokedEmail)}))?.querySelector('button')`,
  );
  await button('Confirm revocation');
  await waitFor(hasText('Invitation revoked'), 'reviewed revocation saved');
  await button('Refresh invitations');
  assert.equal(
    (
      await sql`select status from staff_invitations where firm_id=${firm} and email=${revokedEmail}`
    )[0].status,
    'revoked',
  );
  await screenshot('04-revoked');
  listeners.set('Fetch.requestPaused', (event) =>
    event.request.method !== 'GET'
      ? void send('Fetch.continueRequest', { requestId: event.requestId })
      : void send('Fetch.fulfillRequest', {
          requestId: event.requestId,
          responseCode: 500,
          responseHeaders: [
            { name: 'Content-Type', value: 'application/json' },
            { name: 'Access-Control-Allow-Origin', value: 'http://localhost:3100' },
          ],
          body: Buffer.from(
            JSON.stringify({ code: 'TEST_OUTAGE', message: 'Test-only unavailable read' }),
          ).toString('base64'),
        }),
  );
  await send('Fetch.enable', {
    patterns: [
      {
        urlPattern: 'http://127.0.0.1:3300/firms/current/staff-invitations',
        requestStage: 'Response',
      },
    ],
  });
  await button('Refresh staff invitations');
  await waitFor(hasText('Invitations did not load'), 'read failure explicitly unavailable');
  assert.equal(
    await evaluate(
      `document.querySelector('section[aria-label="Manage staff invitations"]').innerText.includes(${JSON.stringify(recipientEmail)})`,
    ),
    false,
    'read failure hides warm identities',
  );
  await screenshot('05-read-error');
  await send('Fetch.disable');
  await button('Refresh staff invitations');
  await waitFor(hasText(recipientEmail), 'failed read retry');

  await sql`update firm_members set role='attorney' where firm_id=${firm} and user_id=${user}`;
  await button('Refresh staff invitations');
  await waitFor(
    hasText('Invitation access unavailable'),
    'manager revocation hides prior identities',
  );
  assert.equal(
    await evaluate(
      `Boolean(document.querySelector('section[aria-label="Manage staff invitations"]').innerText.includes(${JSON.stringify(recipientEmail)}))`,
    ),
    false,
  );
  await sql`update firm_members set role='owner' where firm_id=${firm} and user_id=${user}`;
  await button('Refresh staff invitations');
  await waitFor(hasText(recipientEmail), 'manager permission restored');
  // Reset only this run's isolated context, then sign in through the real recipient flow.
  await send('Storage.clearDataForOrigin', {
    origin: 'http://localhost:3100',
    storageTypes: 'all',
  });
  await send('Network.clearBrowserCookies');
  await send('Page.navigate', { url: 'http://localhost:3100/sign-in?next=/settings' });
  await waitFor(`Boolean(document.querySelector('input[type="email"]'))`, 'recipient sign-in');
  await waitFor(
    `Object.keys(document.querySelector('input[type="email"]')).some(key=>key.startsWith('__reactProps'))`,
    'recipient form hydrated',
  );
  await type('input[type="email"]', recipientEmail);
  await type('input[type="password"]', password);
  await button('Sign in');
  await waitFor(
    hasText('Browser firm LLP'),
    'received invitation shown without current membership',
  );
  for (const width of [320, 768, 1024, 1440]) {
    await send('Emulation.setDeviceMetricsOverride', {
      width,
      height: 1000,
      deviceScaleFactor: 1,
      mobile: false,
    });
    if (width === 320) {
      await waitFor(
        "innerWidth===320&&parseFloat(getComputedStyle(document.querySelector('.app-sidebar')).width)<=80&&parseFloat(getComputedStyle(document.querySelector('.app-sidebar__label')).opacity)<0.05",
        'recipient mobile shell settled',
      );
      await screenshot('02-received-mobile');
    }
    assert.equal(
      await evaluate('document.documentElement.scrollWidth<=innerWidth'),
      true,
      `no overflow at ${width}`,
    );
  }
  await screenshot('02-received');
  await button('Review invitation');
  lost = false;
  listeners.set('Fetch.requestPaused', loseResponse);
  await send('Fetch.enable', {
    patterns: [
      {
        urlPattern: `http://127.0.0.1:3300/staff-invitations/${invitation.id}/acceptance`,
        requestStage: 'Response',
      },
    ],
  });
  await button('Confirm joining firm');
  await waitFor(hasText('The result could not be confirmed.'), 'acceptance response loss');
  assert.equal(
    (
      await sql`select count(*)::int as n from firm_members where firm_id=${firm} and user_id=${recipient}`
    )[0].n,
    1,
  );
  await button('Check invitation request');
  await send('Fetch.disable');
  await waitFor(
    `document.querySelector('input[aria-label="Firm name"]')?.value==='Browser firm LLP'`,
    'real session refresh and live firm read',
  );
  await waitFor(hasText('Staff role: Attorney'), 'live assigned role');
  assert.equal(
    await evaluate(
      `Boolean(document.querySelector('section[aria-label="Manage staff invitations"]'))`,
    ),
    false,
    'attorney cannot manage invitations',
  );
  assert.equal(
    (
      await sql`select count(*)::int as n from command_receipts where firm_id=${firm} and command='staff.invitation.accept.v1'`
    )[0].n,
    1,
  );
  assert.equal(
    (await sql`select status from staff_invitations where id=${invitation.id}`)[0].status,
    'accepted',
  );
  await screenshot('03-joined');
  // Reload proves persistence and session context, not a locally fabricated successful screen.
  await send('Page.reload');
  await waitFor(hasText('Staff role: Attorney'), 'reload keeps server membership');
  assert.equal(await evaluate('document.documentElement.scrollWidth<=innerWidth'), true);
}
