import assert from 'node:assert/strict';
import { randomUUID } from 'node:crypto';

/** M02-S02: firm directory, response-loss recovery, reviewed edits, party links and walls. */
export async function verifyContacts({
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
  const matter = randomUUID(),
    walled = randomUUID(),
    walledContact = randomUUID();
  await sql`insert into matters(id,firm_id,title,created_by) values
    (${matter},${firm},'Share purchase advisory',${user}),(${walled},${firm},'Walled estate plan',${user})`;
  await sql`insert into matter_access(firm_id,matter_id,user_id,role,created_by)
    values (${firm},${matter},${user},'manager',${user})`;
  await sql`insert into contacts(id,firm_id,kind,display_name,created_by)
    values (${walledContact},${firm},'person','Walled Client',${user})`;
  await sql`insert into matter_parties(firm_id,matter_id,contact_id,role,created_by)
    values (${firm},${walled},${walledContact},'client',${user})`;
  const navigate = async (path, text, label) => {
    await send('Page.navigate', { url: `${web}${path}` });
    await waitFor(hasText(text), label);
  };

  // Loading and the directory.
  let held;
  listeners.set('Fetch.requestPaused', (e) => {
    held = e.requestId;
  });
  await send('Fetch.enable', {
    patterns: [{ urlPattern: `${api}/contacts`, requestStage: 'Request' }],
  });
  await send('Page.navigate', { url: `${web}/contacts` });
  await waitFor(
    `Boolean(document.querySelector('[aria-label="Loading contacts"]'))`,
    'contact loading',
  );
  await screenshot('01-contacts-loading');
  assert(held);
  await send('Fetch.continueRequest', { requestId: held });
  await send('Fetch.disable');
  await waitFor(hasText('Walled Client'), 'directory');
  await screenshot('02-contacts-directory');

  // Creation whose committed response is lost keeps one intent and recovers the same record.
  await button('New contact');
  await waitFor(`document.activeElement?.id==='contact-name'`, 'name focus');
  await type('#contact-name', 'Maria Alvarez');
  await type('#contact-email', 'maria@example.test');
  await type('#contact-phone', '+1 (415) 555-0100');
  held = undefined;
  listeners.set('Fetch.requestPaused', (e) => {
    if (e.request.method === 'POST') held = e.requestId;
    else void send('Fetch.continueRequest', { requestId: e.requestId });
  });
  await send('Fetch.enable', {
    patterns: [{ urlPattern: `${api}/contacts`, requestStage: 'Response' }],
  });
  await button('Create contact');
  for (let i = 0; i < 100 && !held; i++) await new Promise((r) => setTimeout(r, 30));
  assert(held, 'Committed contact response intercepted');
  await send('Fetch.failRequest', { requestId: held, errorReason: 'ConnectionFailed' });
  await send('Fetch.disable');
  await waitFor(hasText('The result could not be confirmed.'), 'unknown contact response');
  assert.equal(await evaluate('document.querySelector("#contact-name")?.disabled'), true);
  await screenshot('03-contact-response-lost');
  await button('Check contact request');
  await waitFor(hasText('Contact details'), 'recovered contact');
  const created =
    await sql`select id from contacts where firm_id=${firm} and display_name='Maria Alvarez'`;
  assert.equal(created.length, 1, 'Replay created one contact');
  const maria = created[0].id;
  await screenshot('04-contact-detail');

  // A concurrent change refuses a stale edit; a reloaded edit saves.
  await button('Edit contact');
  await type('#contact-edit-phone', '+1 415 555 0199');
  await sql`update contacts set email='maria@alvarez.test',revision=revision+1 where id=${maria}`;
  await button('Save contact');
  await waitFor(hasText('This contact changed after you opened it.'), 'stale edit');
  await screenshot('05-contact-stale-edit');
  await button('Close and reload');
  await waitFor(hasText('maria@alvarez.test'), 'reloaded contact');
  await button('Edit contact');
  await type('#contact-edit-phone', '+1 415 555 0199');
  await button('Save contact');
  await waitFor(hasText('+1 415 555 0199'), 'saved edit');
  assert.equal((await sql`select revision from contacts where id=${maria}`)[0].revision, 3);

  // Search is literal and keyboard operable.
  await navigate('/contacts', 'Firm directory', 'directory');
  await type('input[type="search"]', 'ALV');
  await send('Input.dispatchKeyEvent', {
    type: 'keyDown',
    key: 'Enter',
    text: '\r',
    code: 'Enter',
    windowsVirtualKeyCode: 13,
  });
  await send('Input.dispatchKeyEvent', {
    type: 'keyUp',
    key: 'Enter',
    code: 'Enter',
    windowsVirtualKeyCode: 13,
  });
  await waitFor(
    `!document.body.innerText.includes('Walled Client') && document.body.innerText.includes('Maria Alvarez')`,
    'search',
  );
  const tree = await send('Accessibility.getFullAXTree');
  assert(
    tree.nodes.some((n) => n.role?.value === 'searchbox' && n.name?.value === 'Search by name'),
  );
  await screenshot('06-contacts-search');
  await type('input[type="search"]', '%');
  await button('Search');
  await waitFor(hasText('No contacts match “%”.'), 'literal wildcard search');
  await screenshot('07-contacts-search-empty');

  // Two clients on one matter: an existing contact and one created from the matter.
  await navigate(`/matters/${matter}`, 'No parties recorded yet.', 'empty parties');
  await type('input[aria-labelledby="party-search-label"]', 'maria');
  await button('Find contacts');
  await waitFor(`Boolean(document.querySelector('input[name="party-contact"]'))`, 'search results');
  await clickExpression(`document.querySelector('input[name="party-contact"]')`);
  await button('Add party');
  await waitFor(
    `document.querySelectorAll('[aria-label="Matter parties"] li').length===1`,
    'first client',
  );
  await button('New contact');
  await waitFor(`document.activeElement?.id==='party-contact-name'`, 'nested contact focus');
  await evaluate(
    `(() => { const s = document.querySelector('#party-contact-kind'); s.value='organization'; s.dispatchEvent(new Event('change',{bubbles:true})); })()`,
  );
  await type('#party-contact-name', 'Alvarez Holdings LLC');
  await button('Create contact');
  await waitFor(
    `document.querySelector('input[name="party-contact"]')?.checked===true`,
    'new contact selected',
  );
  await button('Add party');
  await waitFor(
    `document.querySelectorAll('[aria-label="Matter parties"] li').length===2`,
    'second client',
  );
  await screenshot('08-matter-two-clients');

  // The contact shows its accessible matters; a walled matter is neither shown nor counted.
  await navigate(`/contacts/${maria}`, 'Share purchase advisory', 'contact matters');
  await screenshot('09-contact-matters');
  await navigate(
    `/contacts/${walledContact}`,
    'No matters you can access list this contact.',
    'wall',
  );
  assert.equal(await evaluate(hasText('Walled estate plan')), false);
  await screenshot('10-contact-walled');

  // Ending a link removes it from the matter and keeps the history row.
  await navigate(`/matters/${matter}`, 'Alvarez Holdings LLC', 'parties');
  await clickExpression(
    `document.querySelector('button[aria-label="End Alvarez Holdings LLC as Client"]')`,
  );
  await waitFor(
    `document.querySelectorAll('[aria-label="Matter parties"] li').length===1`,
    'ended link',
  );
  assert.equal(
    (
      await sql`select count(*)::int as n from matter_parties where firm_id=${firm} and matter_id=${matter} and deleted_at is not null`
    )[0].n,
    1,
  );

  for (const width of [320, 768, 1024, 1440]) {
    await send('Emulation.setDeviceMetricsOverride', {
      width,
      height: 1000,
      deviceScaleFactor: 1,
      mobile: width === 320,
    });
    await waitFor(`innerWidth===${width}`, 'viewport');
    assert.equal(
      await evaluate('document.documentElement.scrollWidth <= innerWidth'),
      true,
      `No overflow at ${width}`,
    );
    await screenshot(`11-matter-parties-${width}`);
  }
  await send('Emulation.setDeviceMetricsOverride', {
    width: 1440,
    height: 1000,
    deviceScaleFactor: 1,
    mobile: false,
  });

  // Live role and membership decide capability, not the token's claimed role.
  await sql`update firm_members set role='readonly' where firm_id=${firm} and user_id=${user}`;
  await navigate('/contacts', 'Maria Alvarez', 'readonly directory');
  assert.equal(
    await evaluate(`[...document.querySelectorAll('button')].some(b=>b.innerText==='New contact')`),
    false,
  );
  await screenshot('12-contacts-readonly');
  await sql`update firm_members set deleted_at=now() where firm_id=${firm} and user_id=${user}`;
  await send('Page.reload');
  await waitFor(hasText('Contact directory unavailable'), 'removed member');
  assert.equal(await evaluate(hasText('Maria Alvarez')), false);
  await screenshot('13-contacts-denied');
  await sql`update firm_members set deleted_at=null,role='owner' where firm_id=${firm} and user_id=${user}`;
}
