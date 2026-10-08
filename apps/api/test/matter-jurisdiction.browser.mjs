import assert from 'node:assert/strict';
import { randomUUID } from 'node:crypto';

/**
 * M02-S04: firm forums in Settings (add, name clash, archive) and matter jurisdiction
 * references (loading, error, empty, governing law without a court, lost-response replay,
 * several venues in different jurisdictions, an inline new forum, duplicates, ending),
 * responsive layouts, accessible names, the no-automation notice and live role/membership.
 */
export async function verifyJurisdictions({
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
    await waitFor(
      `[...(document.querySelector(${JSON.stringify(selector)})?.options ?? [])].some(o => o.value === ${JSON.stringify(value)})`,
      `option ${value} in ${selector}`,
    );
    assert(
      await evaluate(`(() => { const el = document.querySelector(${JSON.stringify(selector)});
        if (!el || el.disabled) return false;
        Object.getOwnPropertyDescriptor(HTMLSelectElement.prototype, 'value').set.call(el, ${JSON.stringify(value)});
        el.dispatchEvent(new Event('change', { bubbles: true })); return true; })()`),
      `Select ${selector} is enabled`,
    );
  };
  const unnamedControls = () =>
    evaluate(`[...document.querySelectorAll('main input, main select, main textarea')]
      .filter((el) => el.offsetParent !== null)
      .filter((el) => {
        const by = el.getAttribute('aria-labelledby');
        const named = by && by.split(' ').every((id) => document.getElementById(id)?.textContent.trim());
        return !(named || el.labels?.length || el.getAttribute('aria-label'));
      }).length`);
  const count = async (query) => (await query)[0].n;
  /** Returning to the window refetches live lists; open forms must keep what was typed. */
  const returnToWindow = async () => {
    // React Query listens for visibilitychange on window.
    await evaluate(`window.dispatchEvent(new Event('visibilitychange')), true`);
    await new Promise((r) => setTimeout(r, 800));
  };
  /** Waits out a forum load, which keeps the add button disabled, then submits. */
  const addReference = async () => {
    await waitFor(
      `[...document.querySelectorAll('button')].some(b => b.textContent.trim() === 'Add reference' && !b.disabled)`,
      'add reference enabled',
    );
    await button('Add reference');
  };
  /** Text in the current reference list, not in the form's selected options. */
  const listed = (text) =>
    `(document.querySelector('[aria-label="Matter jurisdictions"]')?.innerText ?? '').includes(${JSON.stringify(text)})`;
  const purpose = 'select[aria-labelledby="reference-purpose-label"]',
    place = 'select[aria-labelledby="reference-jurisdiction-label"]',
    forumSelect = 'select[aria-labelledby="reference-forum-label"]',
    docket = 'input[aria-labelledby="reference-docket-label"]';

  const matter = randomUUID();
  await sql`insert into matters(id,firm_id,title,created_by) values (${matter},${firm},'Cross-border supply dispute',${user})`;
  await sql`insert into matter_access(firm_id,matter_id,user_id,role,created_by) values (${firm},${matter},${user},'manager',${user})`;

  // Settings: an empty forum list, a forum added, and a recoverable name clash.
  await navigate('/settings', 'No forums yet. Add the courts and agencies', 'empty forums');
  await screenshot('01-forums-empty');
  await button('Add forum');
  await type('input[aria-labelledby="settings-forum-name-label"]', 'U.S. District Court, S.D.N.Y.');
  await choose('select[aria-labelledby="settings-forum-jurisdiction-label"]', 'US');
  assert.equal(await unnamedControls(), 0, 'Forum form controls are named');
  await screenshot('02-forum-form');
  await button('Add forum');
  await waitFor(hasText('U.S. District Court, S.D.N.Y. added.'), 'forum added');
  await waitFor(`document.activeElement?.id==='forums-heading'`, 'focus returns to forums');
  await screenshot('03-forum-added');
  await button('Add forum');
  await type('input[aria-labelledby="settings-forum-name-label"]', 'u.s. district court, s.d.n.y.');
  await choose('select[aria-labelledby="settings-forum-jurisdiction-label"]', 'US');
  await button('Add forum');
  await waitFor(hasText('already uses this name'), 'name clash');
  assert.equal(
    await evaluate(
      `document.querySelector('input[aria-labelledby="settings-forum-name-label"]').disabled`,
    ),
    false,
    'A name clash leaves the name editable',
  );
  await screenshot('04-forum-name-taken');
  await button('Cancel');
  const [sdny] = await sql`select id from forums where firm_id=${firm}`;
  // An open rename survives a refetch on returning to the window.
  await clickExpression(
    `document.querySelector('button[aria-label="Rename U.S. District Court, S.D.N.Y."]')`,
  );
  await type(`input[aria-labelledby="forum-${sdny.id}-name"]`, 'Southern District of New York');
  await returnToWindow();
  assert.equal(
    await evaluate(
      `document.querySelector('input[aria-labelledby="forum-${sdny.id}-name"]')?.value`,
    ),
    'Southern District of New York',
    'Typed rename survives a refetch',
  );
  await button('Cancel');

  // Matter: loading, a failed load with retry, then the empty state and the notice.
  let held;
  listeners.set('Fetch.requestPaused', (e) => {
    if (e.request.method === 'GET') held = e.requestId;
    else void send('Fetch.continueRequest', { requestId: e.requestId });
  });
  await send('Fetch.enable', {
    patterns: [{ urlPattern: `${api}/matters/${matter}/jurisdictions`, requestStage: 'Request' }],
  });
  await send('Page.navigate', { url: `${web}/matters/${matter}` });
  await waitFor(
    `Boolean(document.querySelector('[aria-label="Loading jurisdictions"]'))`,
    'jurisdictions loading',
  );
  await screenshot('05-jurisdictions-loading');
  for (let i = 0; i < 100 && !held; i++) await new Promise((r) => setTimeout(r, 30));
  assert(held, 'Jurisdiction list request held');
  await send('Fetch.failRequest', { requestId: held, errorReason: 'ConnectionFailed' });
  await send('Fetch.disable');
  await waitFor(hasText('Jurisdictions could not be loaded'), 'jurisdictions error');
  await screenshot('06-jurisdictions-error');
  await button('Retry jurisdictions');
  await waitFor(hasText('No jurisdictions recorded.'), 'empty jurisdictions');
  assert(await evaluate(hasText('No jurisdiction-specific automation')), 'Notice shown');
  await screenshot('07-jurisdictions-empty');

  // Governing law needs no court; a lost committed response replays one reference.
  await choose(purpose, 'governing_law');
  await choose(place, 'DE');
  assert.equal(
    await evaluate(`Boolean(document.querySelector(${JSON.stringify(forumSelect)}))`),
    false,
    'Governing law offers no forum',
  );
  assert.equal(await unnamedControls(), 0, 'Reference form controls are named');
  held = undefined;
  listeners.set('Fetch.requestPaused', (e) => {
    if (e.request.method === 'POST') held = e.requestId;
    else void send('Fetch.continueRequest', { requestId: e.requestId });
  });
  await send('Fetch.enable', {
    patterns: [{ urlPattern: `${api}/matters/${matter}/jurisdictions`, requestStage: 'Response' }],
  });
  await addReference();
  for (let i = 0; i < 100 && !held; i++) await new Promise((r) => setTimeout(r, 30));
  assert(held, 'Committed reference response intercepted');
  await send('Fetch.failRequest', { requestId: held, errorReason: 'ConnectionFailed' });
  await send('Fetch.disable');
  await waitFor(hasText('The result could not be confirmed.'), 'unknown reference response');
  await screenshot('08-reference-response-lost');
  await button('Check reference request');
  await waitFor(listed('Governing law'), 'governing law listed');
  await waitFor(listed('Delaware'), 'Delaware listed');
  assert.equal(
    await count(sql`select count(*)::int as n from matter_jurisdictions where matter_id=${matter}`),
    1,
  );
  assert.equal(
    await count(
      sql`select count(*)::int as n from command_receipts where firm_id=${firm} and command='matter.jurisdiction.add.v1'`,
    ),
    1,
  );
  await screenshot('09-governing-law');

  // Two venues in different jurisdictions: an existing federal forum and a new state court.
  await choose(purpose, 'venue');
  await choose(place, 'US');
  await choose(forumSelect, sdny.id);
  await type(docket, '1:26-cv-04410');
  await returnToWindow();
  assert.equal(
    await evaluate(`document.querySelector(${JSON.stringify(docket)})?.value`),
    '1:26-cv-04410',
    'Typed docket survives returning to the window',
  );
  await addReference();
  await waitFor(listed('No. 1:26-cv-04410'), 'federal venue');
  await choose(purpose, 'venue');
  await choose(place, 'NY');
  await waitFor(`!document.querySelector(${JSON.stringify(forumSelect)}).disabled`, 'NY forums');
  await button('New forum');
  await waitFor(`document.activeElement?.id==='reference-forum-heading'`, 'inline forum focus');
  await type(
    'input[aria-labelledby="reference-forum-name-label"]',
    'Supreme Court of the State of New York, New York County',
  );
  assert(await evaluate(hasText('New forum in New York')), 'Inline forum names its jurisdiction');
  assert.equal(await unnamedControls(), 0, 'Inline forum controls are named');
  await screenshot('10-inline-new-forum');
  await button('Add forum');
  await waitFor(
    `document.querySelector(${JSON.stringify(forumSelect)})?.selectedOptions[0]?.textContent.startsWith('Supreme Court')`,
    'new forum selected',
  );
  await addReference();
  await waitFor(listed('Supreme Court of the State of New York, New York County'), 'state venue');
  await choose(purpose, 'agency');
  await choose(place, 'CA');
  await type(docket, 'ADJ-123456');
  await addReference();
  await waitFor(listed('No. ADJ-123456'), 'agency without a forum');
  await screenshot('11-several-references');
  assert.equal(
    await count(
      sql`select count(*)::int as n from matter_jurisdictions where matter_id=${matter} and deleted_at is null`,
    ),
    4,
  );

  // A duplicate is refused in place; Start over returns to a clean form.
  await choose(purpose, 'governing_law');
  await choose(place, 'DE');
  await addReference();
  await waitFor(hasText('This matter already holds this reference.'), 'duplicate');
  await screenshot('12-duplicate-reference');
  await button('Start over');
  await waitFor(`!document.body.innerText.includes('already holds this reference')`, 'reset');

  // Ending keeps history and removes the reference from the current list.
  // Start over refetches the list; click only once it has settled.
  const settled = `Boolean(document.querySelector('button[aria-label^="End Agency"]')) && !document.querySelector('[aria-label="Loading jurisdictions"]')`;
  await waitFor(settled, 'list after start over');
  await new Promise((r) => setTimeout(r, 300));
  await waitFor(settled, 'list still settled');
  await clickExpression(`document.querySelector('button[aria-label^="End Agency"]')`);
  await waitFor(`!document.body.innerText.includes('No. ADJ-123456')`, 'agency ended');
  assert.equal(
    await count(
      sql`select count(*)::int as n from matter_jurisdictions where matter_id=${matter} and deleted_at is not null`,
    ),
    1,
  );
  await screenshot('13-reference-ended');

  // Archiving a forum keeps it on the matter that names it.
  await navigate('/settings', 'U.S. District Court, S.D.N.Y.', 'forum list');
  await clickExpression(
    `document.querySelector('button[aria-label="Archive U.S. District Court, S.D.N.Y."]')`,
  );
  await waitFor(hasText('U.S. District Court, S.D.N.Y. archived.'), 'forum archived');
  await waitFor(`document.activeElement?.id==='forums-heading'`, 'focus after archive');
  await clickExpression(
    `[...document.querySelectorAll('[aria-label="Forum status"] button')].find(b => b.textContent.trim() === 'Archived')`,
  );
  await waitFor(
    `[...document.querySelectorAll('.cl-pill')].some(p=>p.textContent.trim()==='Archived')`,
    'archived forum list',
  );
  await screenshot('14-forum-archived');
  await navigate(
    `/matters/${matter}`,
    'U.S. District Court, S.D.N.Y. (archived)',
    'archived on matter',
  );
  await screenshot('15-matter-archived-forum');

  for (const [path, text, name] of [
    [`/matters/${matter}`, 'No. 1:26-cv-04410', 'matter-jurisdictions'],
    ['/settings', 'Courts and agencies', 'settings-forums'],
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
      assert.equal(await unnamedControls(), 0, `Controls named on ${name} at ${width}`);
      // Show the slice's own panel in the evidence, not the top of a long page.
      await evaluate(
        `[...document.querySelectorAll('h2')].find(h => ['Jurisdictions','Courts and agencies'].includes(h.textContent.trim()))?.scrollIntoView({ block: 'start' }), true`,
      );
      await screenshot(`16-${name}-${width}`);
    }
  await send('Emulation.setDeviceMetricsOverride', {
    width: 1440,
    height: 1000,
    deviceScaleFactor: 1,
    mobile: false,
  });

  // Live role and grant decide capability: a reader sees references and dockets, no changes.
  await sql`update firm_members set role='readonly' where firm_id=${firm} and user_id=${user}`;
  await sql`update matter_access set role='reader' where firm_id=${firm} and matter_id=${matter} and user_id=${user}`;
  await navigate(`/matters/${matter}`, 'No. 1:26-cv-04410', 'reader matter');
  assert.equal(await evaluate(hasText('Add a jurisdiction')), false);
  assert.equal(
    await evaluate(`Boolean(document.querySelector('button[aria-label^="End "]'))`),
    false,
  );
  await screenshot('17-jurisdictions-reader');
  await navigate('/settings', 'Courts and agencies', 'readonly forums');
  await waitFor(hasText('Supreme Court of the State of New York'), 'readonly forum list');
  assert.equal(await evaluate(hasText('Add forum')), false);
  assert.equal(
    await evaluate(`Boolean(document.querySelector('button[aria-label^="Rename "]'))`),
    false,
  );
  await screenshot('18-forums-readonly');
  await sql`update firm_members set deleted_at=now() where firm_id=${firm} and user_id=${user}`;
  await send('Page.navigate', { url: `${web}/matters/${matter}` });
  await waitFor(hasText('This matter is unavailable'), 'removed member');
  assert.equal(await evaluate(hasText('No. 1:26-cv-04410')), false);
  await screenshot('19-jurisdictions-denied');
  await sql`update firm_members set deleted_at=null,role='owner' where firm_id=${firm} and user_id=${user}`;
}
