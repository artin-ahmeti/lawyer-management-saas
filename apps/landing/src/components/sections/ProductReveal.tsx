'use client';

import { AnimatePresence, motion, useReducedMotion } from 'motion/react';
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
  const reduce = useReducedMotion();

  const select = (v: View) => {
    setView(v);
    track({ name: 'product_view_select', view: v });
  };

  return (
    <section id="product" aria-labelledby="product-title" className="section-y relative bg-deep">
      <div className="container-mk">
        <div className="grid grid-cols-12 gap-x-6 gap-y-6">
          <div className="col-span-12 lg:col-span-8">
            <SectionLabel index="02">Product</SectionLabel>
            <h2 id="product-title" className="text-h2 mt-6 text-ink">
              Everything connected
              <br className="hidden sm:block" /> to the matter.
            </h2>
          </div>
          <div className="col-span-12 self-end lg:col-span-4">
            <p className="text-lede text-ink-2">
              See what changed, what’s due, and who owns the next step.
            </p>
            <StatusBadge status={statusOf('matters')} className="mt-4" detail="sample data" />
          </div>
        </div>

        <div className="mt-14 grid grid-cols-12 gap-x-6 gap-y-6 lg:mt-20">
          <div className="col-span-12 lg:col-span-4">
            <div className="lg:sticky lg:top-28">
              <Tabs
                items={VIEWS.map((v) => ({
                  id: v.id,
                  label: <span className="block text-title-3">{v.label}</span>,
                  description: (
                    <span className="mt-1 hidden text-body-sm text-ink-2 lg:block">{v.text}</span>
                  ),
                }))}
                selected={view}
                onSelect={select}
                label="Matter views"
                idBase="product"
                className="no-scrollbar -mx-[var(--mk-gutter)] flex gap-2 overflow-x-auto px-[var(--mk-gutter)] lg:mx-0 lg:grid lg:gap-0 lg:overflow-visible lg:border-l lg:border-hairline lg:px-0"
                tabClassName={(active) =>
                  cn(
                    'min-h-11 shrink-0 rounded-md border px-4 py-2 transition-colors duration-200 lg:rounded-none lg:border-0 lg:border-l-2 lg:-ml-px lg:px-6 lg:py-5',
                    active
                      ? 'border-accent/50 bg-accent-tint/60 text-ink lg:border-accent lg:bg-transparent'
                      : 'border-hairline text-ink-2 hover:text-ink lg:border-transparent',
                  )
                }
              />
              <p className="mt-4 text-body-sm text-ink-2 lg:hidden">
                {VIEWS.find((v) => v.id === view)?.text}
              </p>
              <div className="mt-8 hidden lg:block">
                <a href="#ai" className={buttonClass('secondary', 'md')}>
                  Explore the AI workflow <Icon name="arrow-right" size={18} />
                </a>
              </div>
            </div>
          </div>

          <div className="col-span-12 lg:col-span-8">
            <PreviewFrame
              title={
                <span>
                  Matters <span className="text-ink-3">/</span>{' '}
                  <span className="text-mono-id text-ink-2">{MATTER.id}</span>
                </span>
              }
            >
              <MatterHeader />
              <div className="min-h-[520px] p-4 sm:p-6">
                <AnimatePresence mode="wait" initial={false}>
                  <motion.div
                    key={view}
                    {...tabPanelProps('product', view)}
                    initial={reduce ? false : { opacity: 0, y: 8 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={reduce ? undefined : { opacity: 0, y: -6 }}
                    transition={{ duration: 0.32, ease: [0.2, 0.8, 0.2, 1] }}
                    className="outline-none"
                  >
                    {view === 'overview' ? (
                      <Overview />
                    ) : view === 'actions' ? (
                      <NextActions />
                    ) : (
                      <Activity />
                    )}
                  </motion.div>
                </AnimatePresence>
              </div>
            </PreviewFrame>
            <div className="mt-6 flex flex-wrap items-center gap-3 lg:hidden">
              <a href="#ai" className={buttonClass('secondary', 'md')}>
                Explore the AI workflow <Icon name="arrow-right" size={18} />
              </a>
            </div>
            <div className="mt-8 flex flex-wrap items-center justify-between gap-4 border-t border-hairline pt-6">
              <p className="text-body text-ink-2">
                One place for the matter, from the first email to the final bill.
              </p>
              <CtaButton location="product" />
            </div>
          </div>
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
