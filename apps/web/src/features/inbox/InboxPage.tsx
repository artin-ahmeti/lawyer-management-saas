'use client';

import {
  AiSuggestion,
  Avatar,
  Banner,
  Button,
  Card,
  EmptyState,
  Icon,
  List,
  ListRow,
  Pill,
  SegmentedControl,
  Textarea,
} from '@lawfirm/ui-web';
import Link from 'next/link';
import { usePathname, useRouter, useSearchParams } from 'next/navigation';
import { useState } from 'react';
import { Page, QueryGate } from '@/components/PageState';
import { useInbox, useSettings, useWrites, type InboxItem, type InboxKind } from '@/lib/data';
import { todayIso } from '@/lib/clock';
import { daysFromToday, fmtDate, fmtTime, plural } from '@/lib/format';
import { useOverlays } from '@/stores/ui';

type Filter = 'All' | 'Leads' | 'Clients' | 'Approvals';
const FILTERS: Filter[] = ['All', 'Leads', 'Clients', 'Approvals'];
const KIND_OF: Record<Exclude<Filter, 'All'>, InboxKind> = {
  Leads: 'Lead',
  Clients: 'Client',
  Approvals: 'Approval',
};
const EMPTY_FILTER_COPY: Record<Filter, string> = {
  All: 'Nothing waiting',
  Leads: 'No leads waiting',
  Clients: 'No client messages unread',
  Approvals: 'Nothing to approve',
};

/** "8:52 AM" for today, "Yesterday", otherwise "Sep 26". */
function receivedLabel(iso: string): string {
  const day = iso.slice(0, 10);
  if (day === todayIso()) {
    const t = fmtTime(iso);
    return `${t.time} ${t.ampm}`;
  }
  if (daysFromToday(day) === -1) return 'Yesterday';
  return fmtDate(day);
}

/** The person behind a channel-prefixed lead name. */
const contactName = (name: string): string =>
  name.replace('Missed call · ', '').replace('Web form · ', '');

/** Inbox: leads, client messages and approvals in one list, with the AI first reply held for approval. */
export function InboxPage() {
  const inbox = useInbox();
  const settings = useSettings();
  const router = useRouter();
  const pathname = usePathname();
  const params = useSearchParams();
  const { removeInboxItem, patchPrebill } = useWrites();
  const openForm = useOverlays((s) => s.openForm);
  const [reply, setReply] = useState<{ id: string; text: string } | null>(null);
  const notify = useOverlays((s) => s.notify);
  const [dismissedAi, setDismissedAi] = useState<Record<string, boolean>>({});

  const filterParam = params.get('filter');
  const filter: Filter = FILTERS.includes(filterParam as Filter) ? (filterParam as Filter) : 'All';
  const itemParam = params.get('item');

  const setParams = (patch: Record<string, string | null>) => {
    const next = new URLSearchParams(params.toString());
    for (const [k, v] of Object.entries(patch)) {
      if (v === null) next.delete(k);
      else next.set(k, v);
    }
    const qs = next.toString();
    router.replace(qs ? `${pathname}?${qs}` : pathname, { scroll: false });
  };

  const items = inbox.data ?? [];
  const filtered = filter === 'All' ? items : items.filter((i) => i.kind === KIND_OF[filter]);
  const selected = filtered.find((i) => i.id === itemParam) ?? filtered[0] ?? null;
  const count = (kind: InboxKind) => items.filter((i) => i.kind === kind).length;

  const sendReply = (item: InboxItem, text: string) => {
    if (!text.trim()) return;
    const undo = removeInboxItem(item.id);
    setReply(null);
    notify('Reply recorded in the demo workspace', 'Undo', undo);
  };
  const primary = (item: InboxItem) => {
    if (item.kind === 'Approval') {
      const undoEntry = patchPrebill('p3', { approved: true });
      const undoInbox = removeInboxItem(item.id);
      notify('Write-down approved', 'Undo', () => {
        undoInbox();
        undoEntry();
      });
      router.push('/billing/prebill?entry=p3');
    } else if (item.kind === 'Lead') {
      openForm({ kind: item.cta === 'Open intake' ? 'contact' : 'event' });
    } else setReply({ id: item.id, text: '' });
  };

  return (
    <QueryGate queries={[inbox]} routeKey="inbox" empty={inbox.data?.length === 0}>
      <Page>
        <div className="cl-pagehead">
          <div>
            <h1>Inbox</h1>
            <div className="cl-t-caption cl-muted" style={{ marginTop: 4 }}>
              {plural(count('Lead'), 'lead')} · {plural(count('Client'), 'client message')} ·{' '}
              {plural(count('Approval'), 'approval')}
            </div>
          </div>
          <div className="cl-pagehead__actions">
            <SegmentedControl
              items={FILTERS.map((f) => ({ value: f, label: f }))}
              value={filter}
              onChange={(v) => setParams({ filter: v === 'All' ? null : v, item: null })}
            />
          </div>
        </div>

        <Banner
          tone="outline"
          compact
          icon="pen"
          title="Missed-call text-back is on · AI first replies are drafted, never sent without you"
          trailing={
            <Link href="/settings?section=integrations" className="cl-btn cl-btn--ghost">
              Settings
            </Link>
          }
        />

        <div className="cl-cols cl-cols--sidebar">
          {filtered.length ? (
            <List>
              {filtered.map((m) => (
                <ListRow
                  key={m.id}
                  selected={selected?.id === m.id}
                  onClick={() => setParams({ item: m.id })}
                  style={{ alignItems: 'flex-start', paddingTop: 12, paddingBottom: 12 }}
                  lead={
                    <Avatar
                      size="sm"
                      initials={m.initials}
                      kind={m.avatar === 'org' ? 'org' : 'person'}
                      tone={m.avatar === 'accent' ? 'accent' : 'default'}
                    />
                  }
                  title={
                    <span className="cl-spread">
                      <span className="cl-truncate">{m.name}</span>
                      <span className="cl-t-caption cl-faint" style={{ flex: 'none' }}>
                        {receivedLabel(m.receivedAt)}
                      </span>
                    </span>
                  }
                  subtitle={
                    <span
                      style={{
                        display: 'flex',
                        flexDirection: 'column',
                        gap: 6,
                        flex: 1,
                        minWidth: 0,
                        whiteSpace: 'normal',
                      }}
                    >
                      <span>{m.preview}</span>
                      <span className="cl-inline">
                        <Pill tone={m.tone}>{m.kind}</Pill>
                        {settings.data?.aiEnabled && m.ai && !dismissedAi[m.id] ? (
                          <Pill tone="outline" icon="pen">
                            AI reply drafted
                          </Pill>
                        ) : null}
                      </span>
                    </span>
                  }
                />
              ))}
            </List>
          ) : (
            <div className="cl-table-wrap">
              <EmptyState
                icon="inbox"
                title={EMPTY_FILTER_COPY[filter]}
                text="New items land here as they arrive."
              />
            </div>
          )}

          {selected ? (
            <div className="cl-stack cl-stack--lg">
              <Card key={selected.id} className="app-fade" style={{ alignSelf: 'start' }}>
                <div className="cl-stack cl-stack--sm">
                  <div className="cl-spread">
                    <span className="cl-t-title-3">{selected.name}</span>
                    <Pill tone={selected.tone}>{selected.kind}</Pill>
                  </div>
                  <div className="cl-t-caption cl-muted">{selected.meta}</div>
                </div>
                <div
                  style={{
                    marginTop: 14,
                    padding: '12px 14px',
                    borderRadius: 10,
                    background: 'var(--surface-2)',
                    font: 'var(--text-body-sm)',
                    color: 'var(--ink)',
                  }}
                >
                  {selected.body}
                </div>
                {settings.data?.aiEnabled && selected.ai && !dismissedAi[selected.id] ? (
                  <AiSuggestion
                    style={{ marginTop: 12 }}
                    label="AI first reply · not sent"
                    text={selected.aiText}
                    actions={[
                      {
                        label: 'Send as text',
                        onClick: () => sendReply(selected, selected.aiText),
                      },
                      {
                        label: 'Edit',
                        quiet: true,
                        onClick: () => setReply({ id: selected.id, text: selected.aiText }),
                      },
                      {
                        label: 'Dismiss',
                        quiet: true,
                        onClick: () => setDismissedAi((d) => ({ ...d, [selected.id]: true })),
                      },
                    ]}
                  />
                ) : null}
                {reply?.id === selected.id ? (
                  <form
                    className="cl-form"
                    style={{ marginTop: 12 }}
                    onSubmit={(e) => {
                      e.preventDefault();
                      sendReply(selected, reply.text);
                    }}
                  >
                    <Textarea
                      aria-label="Reply"
                      value={reply.text}
                      onChange={(e) => setReply({ id: selected.id, text: e.target.value })}
                      required
                      placeholder="Write your reply…"
                    />
                    <div className="cl-btn-row">
                      <Button variant="primary" type="submit">
                        Record reply
                      </Button>
                      <Button variant="ghost" onClick={() => setReply(null)}>
                        Cancel
                      </Button>
                    </div>
                  </form>
                ) : null}
                {selected.conflictCheck ? (
                  <div className="cl-ai" style={{ marginTop: 12 }}>
                    <Icon name="shield" />
                    <div className="cl-ai__body">
                      <div className="cl-ai__label">Conflict pre-check · no matches</div>
                      <div className="cl-ai__text">
                        Searched 212 contacts and 48 matters for “Bayview Medical Group” and “R.
                        Castillo”. Nothing found; run the full check at intake.
                      </div>
                    </div>
                  </div>
                ) : null}
                <div className="cl-btn-row" style={{ marginTop: 14 }}>
                  <Button
                    icon="phone"
                    onClick={() => {
                      const phone = selected.name.match(/\(\d{3}\) \d{3}-\d{4}/)?.[0];
                      if (phone) window.location.href = `tel:${phone.replace(/\D/g, '')}`;
                      else
                        router.push(
                          `/contacts?search=${encodeURIComponent(contactName(selected.name))}`,
                        );
                    }}
                  >
                    Call
                  </Button>
                  <Button icon="calendar" onClick={() => openForm({ kind: 'event' })}>
                    Book consult
                  </Button>
                  <Button variant="primary" onClick={() => primary(selected)}>
                    {selected.cta}
                  </Button>
                </div>
              </Card>
            </div>
          ) : null}
        </div>
      </Page>
    </QueryGate>
  );
}
