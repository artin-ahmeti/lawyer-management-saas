import assert from 'node:assert/strict';
import { randomUUID } from 'node:crypto';

/**
 * M02-S03: practice profiles in Settings (starter, lost-response recovery, revision, archive),
 * typed matter fields on creation and detail (required values, pinned version, stale edit,
 * assignment), responsive layouts, accessible names and live role/membership.
 */
export async function verifyPracticeProfiles({
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
}) {
  const api = 'http://127.0.0.1:3300',
    web = 'http://localhost:3100';
  const navigate = async (path, text, label) => {
    await send('Page.navigate', { url: `${web}${path}` });
    await waitFor(hasText(text), label);
  };
  /** Selects an option the way a person would, through React's change handling. */
  const choose = async (selector, value) => {
    assert(
      await evaluate(`(() => { const el = document.querySelector(${JSON.stringify(selector)});
        if (!el) return false;
        Object.getOwnPropertyDescriptor(HTMLSelectElement.prototype, 'value').set.call(el, ${JSON.stringify(value)});
        el.dispatchEvent(new Event('change', { bubbles: true })); return true; })()`),
      `Select ${selector} exists`,
    );
  };
  const check = (selector) =>
    clickExpression(`document.querySelector(${JSON.stringify(selector)})`);
  /** Every visible form control in the main region has an accessible name. */
  const unnamedControls = () =>
    evaluate(`[...document.querySelectorAll('main input, main select, main textarea')]
      .filter((el) => el.offsetParent !== null)
      .filter((el) => {
        const by = el.getAttribute('aria-labelledby');
        const named = by && by.split(' ').every((id) => document.getElementById(id)?.textContent.trim());
        return !(named || el.labels?.length || el.getAttribute('aria-label'));
      }).length`);

  // Loading, then the empty profile list for a manager.
  let held;
  listeners.set('Fetch.requestPaused', (e) => {
    held = e.requestId;
  });
  await send('Fetch.enable', {
    patterns: [{ urlPattern: `${api}/practice-profiles*`, requestStage: 'Request' }],
  });
  await send('Page.navigate', { url: `${web}/settings` });
  await waitFor(
    `Boolean(document.querySelector('[aria-label="Loading practice profiles"]'))`,
    'profile loading',
  );
  await screenshot('01-profiles-loading');
  assert(held);
  await send('Fetch.continueRequest', { requestId: held });
  await send('Fetch.disable');
  await waitFor(hasText('No practice profiles yet. Create one'), 'empty profiles');
  await screenshot('02-profiles-empty');

  // A starter becomes a firm profile; a lost committed response replays one profile.
  await button('New profile');
  await waitFor(`document.activeElement?.id==='profile-name'`, 'profile name focus');
  await choose('select[aria-labelledby="profile-starter-label"]', 'corporate_transactional');
  await waitFor(
    `document.querySelector('#profile-name').value==='Corporate and transactional'`,
    'starter applied',
  );
  await button('Add field');
  await type('fieldset:last-of-type input[aria-labelledby$="-label-l"]', 'Board approval');
  await choose('fieldset:last-of-type select', 'yes_no');
  await check('fieldset:last-of-type input[type="checkbox"]');
  assert.equal(await unnamedControls(), 0, 'Profile editor controls are named');
  await screenshot('03-profile-editor-starter');
  held = undefined;
  listeners.set('Fetch.requestPaused', (e) => {
    if (e.request.method === 'POST') held = e.requestId;
    else void send('Fetch.continueRequest', { requestId: e.requestId });
  });
  await send('Fetch.enable', {
    patterns: [{ urlPattern: `${api}/practice-profiles`, requestStage: 'Response' }],
  });
  await button('Create profile');
  for (let i = 0; i < 100 && !held; i++) await new Promise((r) => setTimeout(r, 30));
  assert(held, 'Committed profile response intercepted');
  await send('Fetch.failRequest', { requestId: held, errorReason: 'ConnectionFailed' });
  await send('Fetch.disable');
  await waitFor(hasText('The result could not be confirmed.'), 'unknown profile response');
  await screenshot('04-profile-response-lost');
  await button('Check profile request');
  await waitFor(hasText('Corporate and transactional saved as version 1.'), 'profile saved');
  await screenshot('05-profile-created');
  const [profile] = await sql`select id from practice_profiles where firm_id=${firm}`;
  assert.equal(
    (await sql`select count(*)::int as n from practice_profiles where firm_id=${firm}`)[0].n,
    1,
  );
  assert.equal(
    (
      await sql`select count(*)::int as n from command_receipts where firm_id=${firm} and command='practice_profile.create.v1'`
    )[0].n,
    1,
  );

  // A new matter uses the profile; the shared rules flag a missing required value in place.
  await navigate('/matters', 'Matters', 'matters');
  await button('New matter');
  await type('#matter-title', 'Northwind acquisition');
  await waitFor(
    `[...document.querySelectorAll('#matter-create-profile option')].length > 1`,
    'profile options',
  );
  await choose('#matter-create-profile', profile.id);
  await waitFor(`Boolean(document.querySelector('#matter-create-field-entity_name'))`, 'fields');
  await type('#matter-create-field-entity_name', 'Northwind Holdings');
  await button('Create matter');
  await waitFor(hasText('Board approval is required.'), 'required field');
  assert.equal(
    await evaluate(
      `document.querySelector('[aria-labelledby$="board_approval-label"]')?.getAttribute('aria-invalid')`,
    ),
    'true',
  );
  assert.equal(await unnamedControls(), 0, 'Matter creation controls are named');
  await screenshot('06-matter-required-field');
  await choose('[aria-labelledby$="board_approval-label"]', 'yes');
  await choose('#matter-create-field-engagement', 'Transaction');
  await button('Create matter');
  await waitFor(hasText('Corporate and transactional · version 1'), 'matter with profile');
  await waitFor(hasText('Northwind Holdings'), 'matter values');
  await screenshot('07-matter-fields');
  const [matter] =
    await sql`select id from matters where firm_id=${firm} and title='Northwind acquisition'`;

  // Revising the profile publishes version 2; the matter keeps version 1.
  await navigate('/settings', 'Corporate and transactional', 'profile list');
  await clickExpression(
    `document.querySelector('button[aria-label="Edit Corporate and transactional"]')`,
  );
  await waitFor(hasText('Changing fields publishes version 2'), 'profile edit');
  await button('Add field');
  await type('fieldset:last-of-type input[aria-labelledby$="-label-l"]', 'Closing checklist');
  await choose('fieldset:last-of-type select', 'long_text');
  await button('Save profile');
  await waitFor(hasText('Corporate and transactional saved as version 2.'), 'version 2');
  await screenshot('08-profile-version-2');
  await navigate(`/matters/${matter.id}`, 'Northwind Holdings', 'matter detail');
  await waitFor(hasText('Corporate and transactional · version 1.'), 'pinned version');
  assert.equal(await evaluate(hasText('Closing checklist')), false);
  await screenshot('09-matter-keeps-version-1');

  // Reviewed-revision edits: a save succeeds; a stale one is refused without overwriting.
  await button('Edit fields');
  await type('#matter-field-entity_name', 'Northwind Holdings LLC');
  await button('Save fields');
  await waitFor(hasText('Northwind Holdings LLC'), 'saved values');
  await button('Edit fields');
  await type('#matter-field-counterparty', 'Contoso Ltd');
  await sql`update matters set revision=revision+1 where id=${matter.id}`;
  await button('Save fields');
  await waitFor(hasText('This matter changed after you opened it.'), 'stale edit');
  await screenshot('10-matter-fields-stale');
  assert.equal(
    (await sql`select field_values->>'counterparty' as v from matters where id=${matter.id}`)[0].v,
    null,
  );
  await button('Close and refresh');
  await waitFor(hasText('Edit fields'), 'fields refreshed');

  // Archiving hides the profile from new matters; the matter still shows it.
  await navigate('/settings', 'Corporate and transactional', 'profile list again');
  await clickExpression(
    `document.querySelector('button[aria-label="Edit Corporate and transactional"]')`,
  );
  await waitFor(hasText('Changing fields publishes version 3'), 'profile edit again');
  await check('input[type="checkbox"]:not(fieldset input)');
  await button('Save profile');
  await waitFor(
    `[...document.querySelectorAll('.cl-pill')].some(p=>p.textContent.trim()==='Archived')`,
    'archived list',
  );
  await screenshot('11-profile-archived');
  await navigate(`/matters/${matter.id}`, 'Archived profile', 'archived on matter');
  await screenshot('12-matter-archived-profile');

  // A matter without a profile gets one assigned once.
  const advisory = randomUUID(),
    bare = randomUUID();
  await sql.begin(async (tx) => {
    await tx`insert into practice_profiles(id,firm_id,name,created_by) values (${advisory},${firm},'Advisory',${user})`;
    await tx`insert into practice_profile_versions(firm_id,profile_id,version,fields,created_by)
      values (${firm},${advisory},1,${tx.json([{ key: 'scope', label: 'Scope', type: 'long_text', required: true }])},${user})`;
  });
  await sql`insert into matters(id,firm_id,title,created_by) values (${bare},${firm},'Board governance advice',${user})`;
  await sql`insert into matter_access(firm_id,matter_id,user_id,role,created_by) values (${firm},${bare},${user},'manager',${user})`;
  await navigate(`/matters/${bare}`, 'No practice profile on this matter yet.', 'bare matter');
  await button('Add a practice profile');
  await waitFor(
    `[...document.querySelectorAll('#matter-assign-profile option')].some(o=>o.value===${JSON.stringify(advisory)})`,
    'assign options',
  );
  assert.equal(
    await evaluate(
      `[...document.querySelectorAll('#matter-assign-profile option')].some(o=>o.value===${JSON.stringify(profile.id)})`,
    ),
    false,
    'Archived profiles are not offered',
  );
  await choose('#matter-assign-profile', advisory);
  await waitFor(`Boolean(document.querySelector('#matter-field-scope'))`, 'assign fields');
  await type('#matter-field-scope', 'Board composition and committee charters.');
  await screenshot('13-matter-assign-profile');
  await button('Add profile');
  await waitFor(hasText('Advisory · version 1'), 'assigned');
  await waitFor(hasText('Board composition and committee charters.'), 'assigned values');
  await screenshot('14-matter-assigned');

  for (const [path, text, name] of [
    [`/matters/${matter.id}`, 'Northwind Holdings LLC', 'matter-fields'],
    ['/settings', 'Practice profiles', 'settings-profiles'],
  ])
    for (const width of [320, 768, 1024, 1440]) {
      await send('Emulation.setDeviceMetricsOverride', {
        width,
        height: 1000,
        deviceScaleFactor: 1,
        mobile: width === 320,
      });
      await navigate(path, text, `${name} at ${width}`);
      await waitFor(`innerWidth===${width}`, 'viewport');
      assert.equal(
        await evaluate('document.documentElement.scrollWidth <= innerWidth'),
        true,
        `No overflow on ${name} at ${width}`,
      );
      await screenshot(`15-${name}-${width}`);
    }
  await send('Emulation.setDeviceMetricsOverride', {
    width: 1440,
    height: 1000,
    deviceScaleFactor: 1,
    mobile: false,
  });

  // Live role and membership decide capability, not the token's claimed role.
  await sql`update firm_members set role='readonly' where firm_id=${firm} and user_id=${user}`;
  await sql`update matter_access set role='reader' where firm_id=${firm} and matter_id=${matter.id} and user_id=${user}`;
  await navigate('/settings', 'Advisory', 'readonly profiles');
  assert.equal(await evaluate(hasText('New profile')), false);
  assert.equal(
    await evaluate(`Boolean(document.querySelector('button[aria-label="Edit Advisory"]'))`),
    false,
  );
  await screenshot('16-profiles-readonly');
  await navigate(`/matters/${matter.id}`, 'Northwind Holdings LLC', 'readonly matter');
  assert.equal(await evaluate(hasText('Edit fields')), false);
  await screenshot('17-matter-fields-reader');
  await sql`update firm_members set deleted_at=now() where firm_id=${firm} and user_id=${user}`;
  await send('Page.reload');
  await waitFor(hasText('This matter is unavailable'), 'removed member');
  assert.equal(await evaluate(hasText('Northwind Holdings LLC')), false);
  await screenshot('18-matter-fields-denied');
  await sql`update firm_members set deleted_at=null,role='owner' where firm_id=${firm} and user_id=${user}`;
}
