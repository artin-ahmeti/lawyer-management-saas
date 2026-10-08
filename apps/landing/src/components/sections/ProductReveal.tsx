'use client';

import { useState } from 'react';
import { statusOf } from '@/config/features';
import {
  ACTIVITY,
  DOCUMENT_VERSIONS,
  EMAIL,
  MATTER,
  PEOPLE,
  REQUESTED_DATE,
  TASKS,
  type ActivityItem,
} from '@/content/sample-matter';
import { track } from '@/lib/analytics';
import { cn } from '@/lib/cn';
import { CtaButton } from '../site/Cta';
import { Avatar } from '../ui/Avatar';
import { buttonClass } from '../ui/button-styles';
import { Icon, type IconName } from '../ui/Icon';
import { PreviewFrame } from '../ui/PreviewFrame';
import { SectionLabel } from '../ui/SectionLabel';
import { StatusBadge } from '../ui/StatusBadge';
import { Tabs, tabPanelProps } from '../ui/Tabs';

type View = 'overview' | 'actions' | 'activity';

const VIEWS = [
  {
    id: 'overview',
    label: 'Overview',
    text: 'The latest document, the next step, recent messages and anything waiting for review, on one screen.',
  },
  {
    id: 'actions',
    label: 'Next actions',
    text: 'Every task has an owner and a date, and every date says where it came from.',
  },
  {
    id: 'activity',
    label: 'Activity',
    text: 'What changed and who did it, in order, including anything Clepso prepared.',
  },
] as const satisfies readonly { id: View; label: string; text: string }[];

export function ProductReveal() {
  const [view, setView] = useState<View>('overview');

  const select = (v: View) => {
    setView(v);
    track({ name: 'product_view_select', view: v });
  };

  return (
    <section id="product" aria-labelledby="product-title" className="product-section">
      <div className="container-mk">
        <div className="section-heading">
          <SectionLabel index="02">Meet your new workspace</SectionLabel>
          <h2 id="product-title" className="text-h2 text-ink">
            Everything connected.
            <br />
            <span className="heading-accent">Nothing lost in between.</span>
          </h2>
          <p className="text-lede text-ink-2">
            See what changed, what’s due, and who owns the next step. The whole matter, in one clear
            view.
          </p>
        </div>
        <Tabs
          items={VIEWS.map((v) => ({ id: v.id, label: v.label }))}
          selected={view}
          onSelect={select}
          label="Matter views"
          idBase="product"
          className="product-tabs"
          tabClassName={() => 'product-tab'}
        />
        <p className="product-view-description">{VIEWS.find((v) => v.id === view)?.text}</p>
        <PreviewFrame
          title={
            <span>
              Workspace <span className="text-ink-3">/</span>{' '}
              <span className="text-mono-id">{MATTER.id}</span>
            </span>
          }
        >
          <div className="product-workspace">
            <aside className="product-sidebar" aria-label="Sample workspace navigation">
              <p className="product-sidebar-title">
                Clepso <span className="text-accent">/</span> Studio
              </p>
              <ul>
                {(
                  [
                    ['folder', 'Matters'],
                    ['calendar', 'Tasks & dates'],
                    ['file', 'Documents'],
                    ['message', 'Messages'],
                    ['clock', 'Time & billing'],
                  ] as const
                ).map(([icon, label]) => (
                  <li key={label}>
                    <Icon name={icon} size={16} />
                    {label}
                  </li>
                ))}
              </ul>
              <p className="product-sidebar-note">
                Illustrative navigation
                <br />
                Try the views above to explore.
              </p>
            </aside>
            <div className="product-body">
              <MatterHeader />
              <div className="min-h-[440px] p-4 sm:p-6">
                {VIEWS.map((v) => (
                  <div
                    key={v.id}
                    {...tabPanelProps('product', v.id)}
                    hidden={view !== v.id}
                    className="workflow-panel focus-visible:outline-2 focus-visible:outline-accent focus-visible:outline-offset-4"
                  >
                    {v.id === 'overview' ? (
                      <Overview />
                    ) : v.id === 'actions' ? (
                      <NextActions />
                    ) : (
                      <Activity />
                    )}
                  </div>
                ))}
              </div>
            </div>
          </div>
        </PreviewFrame>
        <div className="product-footnote">
          <StatusBadge status={statusOf('matters')} detail="sample data" />
          <a href="#ai" className={buttonClass('quiet')}>
            Try the AI workflows <Icon name="arrow-right" size={16} />
          </a>
          <CtaButton location="product" />
        </div>
      </div>
    </section>
  );
}

function MatterHeader() {
  return (
    <div className="flex flex-wrap items-end justify-between gap-4 border-b border-hairline px-4 py-5 sm:px-6">
      <div className="min-w-0">
        <p className="text-caption text-ink-3">
          {MATTER.client} · {MATTER.practice}
        </p>
        <h3 className="mt-1 text-h3 text-ink">{MATTER.title}</h3>
      </div>
      <div className="flex flex-wrap items-center gap-2 text-caption">
        <span className="inline-flex items-center gap-1.5 rounded-full bg-accent-tint px-2.5 py-1 text-accent-ink">
          <span aria-hidden="true" className="size-1.5 rounded-full bg-accent" /> Open ·{' '}
          {MATTER.stage}
        </span>
        <span className="inline-flex items-center gap-1.5 rounded-full border border-hairline px-2 py-0.5 text-ink-2">
          <Avatar person="priya" size={20} /> {PEOPLE.priya.name}
        </span>
      </div>
    </div>
  );
}

function Card({
  title,
  icon,
  children,
  className,
}: {
  title: string;
  icon: IconName;
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <div className={cn('rounded-lg border border-hairline bg-canvas/50 p-4', className)}>
      <p className="mb-3 flex items-center gap-2 text-overline text-ink-3">
        <Icon name={icon} size={14} /> {title}
      </p>
      {children}
    </div>
  );
}

function Overview() {
  const latest = DOCUMENT_VERSIONS[0];
  return (
    <div className="grid gap-4 md:grid-cols-2">
      <Card title="Latest document" icon="file">
        <p className="text-body-strong text-ink">{latest.name}</p>
        <p className="mt-0.5 text-caption text-ink-3">
          {latest.date} · {latest.note}
        </p>
        <ol className="mt-4 grid gap-1.5" aria-label="Versions">
          {DOCUMENT_VERSIONS.map((v) => (
            <li key={v.version} className="flex items-center gap-3 text-body-sm">
              <span className={cn('text-mono-id', v.latest ? 'text-accent' : 'text-ink-3')}>
                {v.version}
              </span>
              <span className={cn('min-w-0 flex-1 truncate', v.latest ? 'text-ink' : 'text-ink-2')}>
                {v.note}
              </span>
              {v.latest ? <span className="text-caption text-accent-ink">Latest</span> : null}
            </li>
          ))}
        </ol>
        <p className="mt-4 border-t border-hairline pt-3 text-caption text-ink-2">
          3 clauses changed since v2: 9.2, 10.1 and 14.1
        </p>
      </Card>

      <Card title="Next step" icon="calendar">
        <p className="text-body-strong text-ink">{TASKS[0]!.title}</p>
        <div className="mt-3 flex flex-wrap items-center gap-x-4 gap-y-2 text-body-sm text-ink-2">
          <span className="inline-flex items-center gap-2">
            <Avatar person="priya" size={20} /> {PEOPLE.priya.name}
          </span>
          <span className="inline-flex items-center gap-1.5 text-warning-ink">
            <Icon name="calendar" size={14} /> Requested {REQUESTED_DATE}
          </span>
        </div>
        <p className="mt-4 border-t border-hairline pt-3 text-caption text-ink-3">
          Date from Dana’s email. A requested date, not a court deadline.
        </p>
      </Card>

      <Card title="Recent communication" icon="message">
        <ul className="grid gap-3">
          <li className="flex gap-3">
            <Avatar person="dana" size={28} />
            <div className="min-w-0">
              <p className="truncate text-body-sm text-ink">{EMAIL.subject}</p>
              <p className="text-caption text-ink-3">
                {EMAIL.from} · {EMAIL.time}
              </p>
            </div>
          </li>
          <li className="flex gap-3">
            <Avatar person="priya" size={28} />
            <div className="min-w-0">
              <p className="truncate text-body-sm text-ink">Call on the liability cap, 40 min</p>
              <p className="text-caption text-ink-3">{PEOPLE.priya.name} · Wed, Sep 30 · 10:02</p>
            </div>
          </li>
        </ul>
      </Card>

      <Card title="Waiting for your review" icon="pen">
        <p className="text-body-strong text-ink">Client update draft</p>
        <p className="mt-0.5 text-caption text-ink-3">
          Prepared by Clepso from 3 sources · not sent
        </p>
        <div className="mt-4 flex flex-wrap items-center gap-2">
          <StatusBadge status={statusOf('aiClientUpdate')} />
          <a href="#ai" className="text-label text-accent underline-offset-4 hover:underline">
            See how review works
          </a>
        </div>
      </Card>
    </div>
  );
}

function NextActions() {
  const [done, setDone] = useState<Set<string>>(
    () => new Set(TASKS.filter((t) => t.status === 'done').map((t) => t.id)),
  );
  return (
    <div>
      <div className="mb-3 hidden grid-cols-[1fr_150px_150px] gap-4 px-3 text-overline text-ink-3 sm:grid">
        <span>Task</span>
        <span>Owner</span>
        <span>Date and source</span>
      </div>
      <ul className="divide-y divide-hairline rounded-lg border border-hairline">
        {TASKS.map((t) => {
          const isDone = done.has(t.id);
          return (
            <li
              key={t.id}
              className="grid gap-2 px-3 py-3 sm:grid-cols-[1fr_150px_150px] sm:items-center sm:gap-4"
            >
              <label className="flex min-h-11 cursor-pointer items-center gap-3 sm:min-h-0">
                <input
                  type="checkbox"
                  checked={isDone}
                  onChange={() =>
                    setDone((prev) => {
                      const next = new Set(prev);
                      if (next.has(t.id)) next.delete(t.id);
                      else next.add(t.id);
                      return next;
                    })
                  }
                  className="size-5 shrink-0 accent-[var(--mk-cobalt)]"
                />
                <span
                  className={cn('text-body-sm', isDone ? 'text-ink-3 line-through' : 'text-ink')}
                >
                  {t.title}
                </span>
              </label>
              <span className="flex items-center gap-2 pl-8 text-body-sm text-ink-2 sm:pl-0">
                <Avatar person={t.owner} size={22} /> {PEOPLE[t.owner].name}
              </span>
              <span className="pl-8 sm:pl-0">
                <span
                  className={cn(
                    'block text-body-sm tabular',
                    t.dateKind === 'requested' && !isDone ? 'text-warning-ink' : 'text-ink-2',
                  )}
                >
                  {t.date}
                </span>
                <span className="block text-caption text-ink-3">
                  {t.dateKind === 'requested' ? 'Requested by client' : t.origin}
                </span>
              </span>
            </li>
          );
        })}
      </ul>
      <p className="mt-4 text-caption text-ink-3">
        Tick a task to see it complete. Sample only: nothing is saved.
      </p>
    </div>
  );
}

const ACTIVITY_ICON: Record<ActivityItem['kind'], IconName> = {
  email: 'message',
  document: 'file',
  task: 'check',
  time: 'mic',
  ai: 'pen',
  call: 'phone',
  note: 'tag',
};

function Activity() {
  const days = [...new Set(ACTIVITY.map((a) => a.day))];
  return (
    <div className="grid gap-6">
      {days.map((day) => (
        <div key={day}>
          <p className="mb-2 text-overline text-ink-3">{day}</p>
          <ol className="relative grid gap-0 border-l border-hairline pl-5">
            {ACTIVITY.filter((a) => a.day === day).map((a) => (
              <li key={a.id} className="relative py-2.5">
                <span
                  aria-hidden="true"
                  className={cn(
                    'absolute -left-[31px] top-2.5 grid size-5 place-items-center rounded-full border bg-surface',
                    a.kind === 'ai' ? 'border-accent/60 text-accent' : 'border-line text-ink-3',
                  )}
                >
                  <Icon name={ACTIVITY_ICON[a.kind]} size={11} />
                </span>
                <p className="text-body-sm text-ink">
                  <span className="font-medium">{a.actor}</span>{' '}
                  <span className="text-ink-2">{a.text}</span>
                </p>
                <p className="text-caption text-ink-3 tabular">{a.time}</p>
              </li>
            ))}
          </ol>
        </div>
      ))}
    </div>
  );
}
