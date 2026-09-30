'use client';

import {
  Avatar,
  Banner,
  Button,
  CellTitle,
  Checkbox,
  Chip,
  EmptyState,
  Icon,
  Input,
  KpiTile,
  Mono,
  Pill,
  StageTracker,
  Table,
  Toolbar,
  type TableRow,
} from '@lawfirm/ui-web';
import Link from 'next/link';
import { useRouter, useSearchParams } from 'next/navigation';
import { useState } from 'react';
import { DrawerLayout } from '@/components/DrawerLayout';
import { QueryGate } from '@/components/PageState';
import { NativeSelect } from '@/components/NativeSelect';
import { PersonRow, TaskList } from '@/components/DataTables';
import { useMatters, useContacts, useTasks, useTimekeepers } from '@/lib/data';
import { CURRENT_USER } from '@/lib/data/fixtures';
import { moneyOrDash, fmtDate } from '@/lib/format';
import { useOverlays } from '@/stores/ui';

export function MattersPage() {
  const matters = useMatters();
  const contacts = useContacts();
  const tasks = useTasks();
  const people = useTimekeepers();
  const params = useSearchParams();
  const router = useRouter();
  const [query, setQuery] = useState('');
  const [chip, setChip] = useState('Open');
  const [area, setArea] = useState('All');
  const [stage, setStage] = useState('All');
  const openCapture = useOverlays((s) => s.openCapture);
  const openForm = useOverlays((s) => s.openForm);
  const all = matters.data ?? [];
  const selectedId = params.get('selected') ?? 'm2';
  const selected = all.find((m) => m.id === selectedId);
  const filtered = all.filter(
    (m) =>
      (!query ||
        `${m.title} ${m.clientName} ${m.number}`.toLowerCase().includes(query.toLowerCase())) &&
      (chip !== 'Mine' || m.responsibleId === CURRENT_USER.id) &&
      (chip !== 'Attention' || m.needsAttention) &&
      (area === 'All' || m.area === area) &&
      (stage === 'All' || m.stages[m.stageIndex - 1] === stage),
  );
  const select = (id: string | null) => {
    const p = new URLSearchParams(params);
    if (id) p.set('selected', id);
    else p.set('selected', '');
    router.replace(`/matters${p.size ? `?${p}` : ''}`, { scroll: false });
  };
  // With the drawer open the table has ~740px at 1440: Trust and Responsible
  // step out (the drawer names both) and Matter / Client truncate, so Unbilled
  // and the deadline pill stay in view instead of scrolling off.
  const dense = Boolean(selected);
  const rows: TableRow[] = [];
  for (const attention of [true, false]) {
    const group = filtered.filter((m) => m.needsAttention === attention);
    if (!group.length) continue;
    rows.push({
      id: `group-${attention}`,
      kind: 'group',
      cells: [`${attention ? 'Needs attention' : 'Active'} · ${group.length}`],
    });
    for (const m of group) {
      const person = people.data?.find((p) => p.id === m.responsibleId);
      rows.push({
        id: m.id,
        selected: selectedId === m.id,
        onClick: () => select(m.id),
        strong: [dense ? 4 : 5],
        cells: [
          <Checkbox
            key="selection"
            shape="square"
            checked={selectedId === m.id}
            label={`Preview ${m.title}`}
            onChange={(checked) => select(checked ? m.id : null)}
          />,
          <span
            key="matter"
            style={{ display: 'block', maxWidth: dense ? 150 : undefined }}
            title={dense ? m.title : undefined}
          >
            <CellTitle
              title={
                <span className="cl-truncate" style={{ display: 'block' }}>
                  {m.title}
                </span>
              }
              sub={
                <span className="cl-truncate" style={{ display: 'block' }}>
                  <Mono>{m.number}</Mono> · {m.area}
                </span>
              }
            />
          </span>,
          <span
            key="client"
            className="cl-truncate"
            style={{ display: 'block', maxWidth: dense ? 96 : undefined }}
            title={dense ? m.clientName : undefined}
          >
            {m.clientName}
          </span>,
          <Pill key="stage" tone="accent">
            {m.stages[m.stageIndex - 1]}
          </Pill>,
          ...(dense
            ? []
            : [
                <span className="cl-inline cl-inline--nowrap" key="who">
                  <Avatar initials={person?.initials ?? ''} size="xs" />
                  {person?.short}
                </span>,
              ]),
          moneyOrDash(m.unbilledCents),
          ...(dense ? [] : [moneyOrDash(m.trustCents)]),
          m.deadline ? (
            <Pill key="deadline" tone={m.deadline.tone} dot>
              {m.deadline.label}
            </Pill>
          ) : (
            '—'
          ),
        ],
      });
    }
  }
  if (filtered.length)
    rows.push({
      id: 'totals',
      kind: 'foot',
      cells: [
        '',
        `${filtered.length} matters`,
        '',
        '',
        ...(dense ? [] : ['']),
        moneyOrDash(filtered.reduce((sum, m) => sum + (m.unbilledCents ?? 0), 0)),
        ...(dense ? [] : [moneyOrDash(filtered.reduce((sum, m) => sum + (m.trustCents ?? 0), 0))]),
        '',
      ],
    });
  const responsible = people.data?.find((p) => p.id === selected?.responsibleId);
  const openTasks = (tasks.data ?? []).filter((t) => t.matterId === selected?.id && !t.done);
  return (
    <QueryGate
      routeKey="matters"
      queries={[matters, tasks, contacts, people]}
      empty={!all.length}
      emptyAction={
        <Button variant="primary" onClick={() => openForm({ kind: 'matter' })}>
          New matter
        </Button>
      }
    >
      <DrawerLayout
        header={
          <>
            <div className="cl-pagehead">
              <h1>Matters</h1>
              <div className="cl-pagehead__actions">
                <Link href="/settings?section=integrations" className="cl-btn cl-btn--secondary">
                  <Icon name="download" />
                  Import from Clio
                </Link>
                <Button variant="primary" icon="plus" onClick={() => openForm({ kind: 'matter' })}>
                  New matter
                </Button>
              </div>
            </div>
            <Toolbar
              right={<span className="cl-t-caption cl-muted">{filtered.length} matters</span>}
            >
              <Input
                search
                icon="search"
                aria-label="Search matters"
                placeholder="Search matters"
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                style={{ width: 260, maxWidth: '100%' }}
              />
              {['Open', 'Mine', 'Attention', 'All'].map((c) => (
                <Chip
                  key={c}
                  active={chip === c}
                  onClick={() => setChip(c)}
                  count={
                    c === 'Mine'
                      ? all.filter((m) => m.responsibleId === CURRENT_USER.id).length
                      : c === 'Attention'
                        ? all.filter((m) => m.needsAttention).length
                        : all.length
                  }
                >
                  {c}
                </Chip>
              ))}
              <NativeSelect
                appearance="chip"
                label="Practice area"
                value={area}
                onChange={setArea}
                options={['All', ...new Set(all.map((m) => m.area))].map((a) => ({
                  value: a,
                  label: a === 'All' ? 'Practice area' : a,
                }))}
              />
              <NativeSelect
                appearance="chip"
                label="Stage"
                value={stage}
                onChange={setStage}
                options={['All', ...new Set(all.flatMap((m) => m.stages))].map((s) => ({
                  value: s,
                  label: s === 'All' ? 'Stage' : s,
                }))}
              />
            </Toolbar>
          </>
        }
        drawer={
          selected ? (
            <>
              <div className="cl-spread">
                <Mono>{selected.number}</Mono>
                <div className="cl-inline">
                  <Link
                    href={`/matters/${selected.id}`}
                    className="cl-btn cl-btn--ghost cl-btn--icon"
                    aria-label="Open matter"
                  >
                    <Icon name="arrow-up-right" />
                  </Link>
                  <Button
                    variant="ghost"
                    iconOnly
                    icon="x"
                    aria-label="Close matter drawer"
                    onClick={() => select(null)}
                  />
                </div>
              </div>
              <div>
                <h2 className="cl-t-title-3" style={{ fontSize: 19, lineHeight: '26px' }}>
                  {selected.title}
                </h2>
                <div className="cl-t-caption cl-muted">
                  {selected.clientName} · {selected.area} · {responsible?.short} · opened{' '}
                  {fmtDate(selected.openedAt)}
                </div>
                <div className="cl-inline" style={{ marginTop: 8 }}>
                  <Pill tone="accent">Open</Pill>
                  <Pill tone="outline">{selected.billingLabel}</Pill>
                </div>
              </div>
              <StageTracker
                stages={selected.stages.map((label, i) => ({
                  label,
                  state:
                    i + 1 < selected.stageIndex
                      ? 'done'
                      : i + 1 === selected.stageIndex
                        ? 'current'
                        : 'upcoming',
                }))}
              />
              {selected.deadline ? (
                <Banner
                  compact
                  tone={selected.deadline.tone === 'neutral' ? 'outline' : selected.deadline.tone}
                  icon="alert"
                  title={selected.deadline.long}
                />
              ) : null}
              <div className="cl-grid-3 app-drawer-kpis">
                <KpiTile label="Unbilled" value={moneyOrDash(selected.unbilledCents, true)} />
                <KpiTile label="Trust" value={moneyOrDash(selected.trustCents, true)} />
                <KpiTile label="Hours" value={selected.hoursToDate.toFixed(1)} />
              </div>
              <div>
                <div className="cl-section">
                  <span className="cl-section__title">
                    Open tasks <span className="cl-section__count">{openTasks.length}</span>
                  </span>
                </div>
                <TaskList tasks={openTasks} />
              </div>
              <div>
                <div className="cl-section">
                  <span className="cl-section__title">People</span>
                </div>
                <div className="cl-list">
                  {(contacts.data ?? [])
                    .filter((c) => c.id === selected.clientId || c.matters.includes(selected.short))
                    .map((c) => (
                      <PersonRow
                        key={c.id}
                        name={c.name}
                        initials={c.initials}
                        role={c.role}
                        kind={c.kind}
                        tone={c.role === 'Client' ? 'default' : 'accent'}
                        href={`/contacts?selected=${c.id}`}
                      />
                    ))}
                  {responsible ? (
                    <PersonRow
                      name={responsible.name}
                      initials={responsible.initials}
                      role="Responsible attorney"
                      href="/settings?section=users"
                    />
                  ) : null}
                </div>
              </div>
              <div className="cl-btn-row" style={{ marginTop: 'auto' }}>
                <Button
                  icon="play"
                  onClick={() => openCapture('Start timer', { matterId: selected.id })}
                >
                  Timer
                </Button>
                <Link className="cl-btn cl-btn--secondary" href="/inbox">
                  Message
                </Link>
                <Link
                  className="cl-btn cl-btn--primary"
                  href={`/billing/prebill?matter=${selected.id}`}
                >
                  Invoice
                </Link>
              </div>
            </>
          ) : null
        }
      >
        {rows.length ? (
          <Table
            compact
            columns={[
              {
                key: 'select',
                header: <span className="app-sr-only">Preview matter</span>,
                width: 36,
              },
              { key: 'matter', header: 'Matter' },
              { key: 'client', header: 'Client' },
              { key: 'stage', header: 'Stage' },
              ...(dense ? [] : [{ key: 'who', header: 'Responsible' }]),
              { key: 'unbilled', header: 'Unbilled', align: 'right' },
              ...(dense ? [] : [{ key: 'trust', header: 'Trust', align: 'right' as const }]),
              { key: 'deadline', header: dense ? 'Deadline' : 'Next deadline' },
            ]}
            rows={rows}
          />
        ) : (
          <EmptyState
            icon="briefcase"
            title="No matching matters"
            text="Try another search or clear the filters."
          />
        )}
      </DrawerLayout>
    </QueryGate>
  );
}
