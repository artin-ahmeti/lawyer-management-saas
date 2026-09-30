'use client';

import {
  Avatar,
  Button,
  Card,
  CellTitle,
  Chip,
  EmptyState,
  Icon,
  Input,
  Pill,
  Table,
  Toolbar,
} from '@lawfirm/ui-web';
import { usePathname, useRouter, useSearchParams } from 'next/navigation';
import { useState } from 'react';
import { Page, QueryGate } from '@/components/PageState';
import { useContacts, useMatters, type Contact, type ContactRole, type Matter } from '@/lib/data';
import { useOverlays } from '@/stores/ui';
import { Modal } from '@/components/Modal';
import { fmtDate, plural } from '@/lib/format';
import { todayIso } from '@/lib/clock';

type ChipKey = 'All' | 'Clients' | 'Opposing' | 'Experts';
const CHIPS: { key: ChipKey; role: ContactRole | null }[] = [
  { key: 'All', role: null },
  { key: 'Clients', role: 'Client' },
  { key: 'Opposing', role: 'Opposing party' },
  { key: 'Experts', role: 'Expert witness' },
];
const DEFAULT_SELECTED = 'c2';

/** Role → status tone: clients are ours (accent), opposing parties are adverse (danger), experts are neutral third parties (info). */
const roleTone = (role: ContactRole): 'accent' | 'danger' | 'info' | 'outline' =>
  role === 'Client'
    ? 'accent'
    : role === 'Opposing party'
      ? 'danger'
      : role === 'Expert witness'
        ? 'info'
        : 'outline';

/** The matter a call on this contact bills to: their own matter, else the first one named on their card. */
function matterFor(contact: Contact, matters: Matter[]): Matter | undefined {
  return (
    matters.find((m) => m.clientId === contact.id) ??
    matters.find((m) => contact.matters.includes(m.short))
  );
}

/** Contacts: people and companies across matters, with a conflict pre-check on every card. */
export function ContactsPage() {
  const contacts = useContacts();
  const matters = useMatters();
  const router = useRouter();
  const pathname = usePathname();
  const params = useSearchParams();
  const notify = useOverlays((s) => s.notify);
  const openForm = useOverlays((s) => s.openForm);
  const openCapture = useOverlays((s) => s.openCapture);
  const [check, setCheck] = useState<{ name: string; matches: string[] } | null>(null);
  const [history, setHistory] = useState<{ name: string; matches: string[] }[]>([]);
  const [showHistory, setShowHistory] = useState(false);
  const [query, setQuery] = useState(params.get('search') ?? '');

  const chipParam = params.get('role');
  const chip: ChipKey = CHIPS.some((c) => c.key === chipParam) ? (chipParam as ChipKey) : 'All';
  const selectedParam = params.get('selected') ?? DEFAULT_SELECTED;

  const setParams = (patch: Record<string, string | null>) => {
    const next = new URLSearchParams(params.toString());
    for (const [k, v] of Object.entries(patch)) {
      if (v === null) next.delete(k);
      else next.set(k, v);
    }
    const qs = next.toString();
    router.replace(qs ? `${pathname}?${qs}` : pathname, { scroll: false });
  };

  const all = contacts.data ?? [];
  const role = CHIPS.find((c) => c.key === chip)?.role ?? null;
  const q = query.trim().toLowerCase();
  const rows = all.filter(
    (c) =>
      (role === null || c.role === role) &&
      (!q || `${c.name} ${c.email} ${c.matters}`.toLowerCase().includes(q)),
  );
  const selected = all.find((c) => c.id === selectedParam) ?? all[0] ?? null;
  const countFor = (r: ContactRole | null) =>
    r === null ? all.length : all.filter((c) => c.role === r).length;

  const call = (c: Contact) => {
    const m = matterFor(c, matters.data ?? []);
    if (m) openCapture('Start timer', { matterId: m.id, narrative: 'Telephone conference' });
    else notify('Choose a matter in Capture to track this call.');
  };
  const runCheck = (c: Contact) => {
    const words = c.name
      .toLowerCase()
      .split(/\W+/)
      .filter((word) => word.length > 2);
    const matches = [
      ...all
        .filter(
          (other) =>
            other.id !== c.id && words.some((word) => other.name.toLowerCase().includes(word)),
        )
        .map((other) => `${other.name} · ${other.role}`),
      ...(matters.data ?? [])
        .filter((m) =>
          words.some((word) => `${m.title} ${m.clientName}`.toLowerCase().includes(word)),
        )
        .map((m) => `${m.title} · ${m.number}`),
    ];
    const result = { name: c.name, matches };
    setCheck(result);
    setHistory((previous) => [result, ...previous]);
  };

  return (
    <QueryGate queries={[contacts, matters]} routeKey="contacts" empty={all.length === 0}>
      <Page>
        <div className="cl-pagehead">
          <div>
            <h1>Contacts</h1>
          </div>
          <div className="cl-pagehead__actions">
            <Button variant="primary" icon="plus" onClick={() => openForm({ kind: 'contact' })}>
              New contact
            </Button>
          </div>
        </div>

        <Toolbar>
          <div style={{ width: 260 }}>
            <Input
              search
              icon="search"
              placeholder="Search people and companies"
              aria-label="Search people and companies"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
            />
          </div>
          {CHIPS.map((c) => (
            <Chip
              key={c.key}
              active={chip === c.key}
              count={countFor(c.role)}
              onClick={() => setParams({ role: c.key === 'All' ? null : c.key })}
            >
              {c.key}
            </Chip>
          ))}
        </Toolbar>

        <div className="cl-cols cl-cols--sidebar">
          {rows.length ? (
            <Table
              compact
              // Email rides under the name: five single-line columns do not fit
              // beside the 360px card at 1440, and the row must not scroll off.
              columns={[
                { key: 'name', header: 'Name' },
                { key: 'role', header: 'Role' },
                { key: 'matters', header: 'Matters' },
                { key: 'phone', header: 'Phone' },
              ]}
              rows={rows.map((c) => ({
                id: c.id,
                selected: c.id === selected?.id,
                onClick: () => setParams({ selected: c.id }),
                cells: [
                  <span key="name" className="cl-inline cl-inline--nowrap">
                    <Avatar
                      size="xs"
                      initials={c.initials}
                      kind={c.kind}
                      tone={c.role === 'Client' ? 'accent' : 'default'}
                    />
                    <span style={{ minWidth: 0 }}>
                      <CellTitle title={c.name} sub={c.email} />
                    </span>
                  </span>,
                  <Pill key="role" tone={roleTone(c.role)}>
                    {c.role}
                  </Pill>,
                  <span
                    key="matters"
                    className="cl-truncate"
                    style={{ display: 'block', maxWidth: 200 }}
                    title={c.matters}
                  >
                    {c.matters}
                  </span>,
                  <span key="phone" className="cl-num">
                    {c.phone}
                  </span>,
                ],
              }))}
            />
          ) : (
            <div className="cl-table-wrap">
              <EmptyState
                icon="users"
                title="No matches"
                text="Try another name, company or email."
              />
            </div>
          )}

          {selected ? (
            <Card key={selected.id} className="app-fade" style={{ alignSelf: 'start' }}>
              <div className="cl-inline" style={{ gap: 12 }}>
                <Avatar
                  size="lg"
                  initials={selected.initials}
                  kind={selected.kind}
                  tone={selected.role === 'Client' ? 'accent' : 'default'}
                />
                <div>
                  <div className="cl-t-title-3">{selected.name}</div>
                  <div className="cl-t-caption cl-muted">
                    {selected.role} · {selected.matters}
                  </div>
                </div>
              </div>
              <div className="cl-btn-row" style={{ marginTop: 14 }}>
                <a
                  className="cl-btn cl-btn--secondary"
                  href={`tel:${selected.phone.replace(/[^+\d]/g, '')}`}
                  onClick={() => call(selected)}
                >
                  <Icon name="phone" />
                  Call
                </a>
                <a
                  className="cl-btn cl-btn--secondary"
                  href={`sms:${selected.phone.replace(/[^+\d]/g, '')}`}
                >
                  <Icon name="message" />
                  Text
                </a>
                <a
                  href={`mailto:${selected.email}`}
                  className="cl-btn cl-btn--secondary"
                  style={{ textDecoration: 'none' }}
                >
                  <Icon name="send" />
                  <span>Email</span>
                </a>
              </div>
              <div className="cl-divider" style={{ margin: '16px 0' }} />
              <div className="cl-stack cl-stack--sm">
                <div className="cl-spread">
                  <span className="cl-t-label cl-muted">Email</span>
                  <span className="cl-t-label">{selected.email}</span>
                </div>
                <div className="cl-spread">
                  <span className="cl-t-label cl-muted">Phone</span>
                  <span className="cl-t-label cl-num">{selected.phone}</span>
                </div>
                <div className="cl-spread">
                  <span className="cl-t-label cl-muted">Type</span>
                  <span className="cl-t-label">
                    {selected.kind === 'org' ? 'Company' : 'Person'}
                  </span>
                </div>
              </div>
              <div className="cl-ai" style={{ marginTop: 16 }}>
                <Icon name="shield" />
                <div className="cl-ai__body">
                  <div className="cl-ai__label">Conflict pre-check</div>
                  <div className="cl-ai__text">{selected.conflict}</div>
                  <div className="cl-ai__actions">
                    <button type="button" onClick={() => runCheck(selected)}>
                      Run full check
                    </button>
                    <button type="button" className="quiet" onClick={() => setShowHistory(true)}>
                      History
                    </button>
                  </div>
                </div>
              </div>
            </Card>
          ) : null}
        </div>
        {check ? (
          <Modal title={`Full check · ${check.name}`} onClose={() => setCheck(null)}>
            <div className="app-modal__body cl-stack">
              <p className="cl-t-body-sm cl-muted">
                Searched {all.length} contacts and {matters.data?.length ?? 0} matters for this
                name. Confirm party identities and relationships before clearing a conflict.
              </p>
              {check.matches.length ? (
                check.matches.map((match) => (
                  <div className="cl-row" key={match}>
                    {match}
                  </div>
                ))
              ) : (
                <p>No name matches in this workspace.</p>
              )}
            </div>
          </Modal>
        ) : null}
        {showHistory ? (
          <Modal title="Conflict check history" onClose={() => setShowHistory(false)}>
            <div className="app-modal__body cl-stack">
              {history.length ? (
                history.map((entry, i) => (
                  <div key={i}>
                    <div className="cl-t-body-strong">{entry.name}</div>
                    <div className="cl-t-caption cl-muted">
                      {fmtDate(todayIso())} · {plural(entry.matches.length, 'match', 'matches')}
                    </div>
                  </div>
                ))
              ) : (
                <p className="cl-t-body-sm cl-muted">No full checks run in this session.</p>
              )}
            </div>
          </Modal>
        ) : null}
      </Page>
    </QueryGate>
  );
}
