'use client';

import { AnimatePresence, motion, useReducedMotion } from 'motion/react';
import { useId, useState } from 'react';
import { EMAIL, PEOPLE, REQUESTED_DATE, type PersonKey } from '@/content/sample-matter';
import { cn } from '@/lib/cn';
import { Avatar } from '../ui/Avatar';
import { buttonClass } from '../ui/button-styles';
import { Icon, type IconName } from '../ui/Icon';
import { DecisionBar, Region } from './parts';

type Phase = 'proposed' | 'reviewing' | 'confirmed';
type ActionId = 'file' | 'task' | 'reply';

const OWNERS: PersonKey[] = ['priya', 'jordan', 'marcus'];

export function EmailWorkflow({ onComplete }: { onComplete: (outcome: string) => void }) {
  const id = useId();
  const reduce = useReducedMotion();
  const [phase, setPhase] = useState<Phase>('proposed');
  const [include, setInclude] = useState<Set<ActionId>>(
    () => new Set<ActionId>(['file', 'task', 'reply']),
  );
  const [owner, setOwner] = useState<PersonKey>('priya');

  const reviewing = phase === 'reviewing';
  const toggle = (a: ActionId) =>
    setInclude((prev) => {
      const next = new Set(prev);
      if (next.has(a)) next.delete(a);
      else next.add(a);
      return next;
    });
  const reset = () => {
    setPhase('proposed');
    setInclude(new Set<ActionId>(['file', 'task', 'reply']));
    setOwner('priya');
  };

  const actions: { id: ActionId; icon: IconName; title: string; body: React.ReactNode }[] = [
    {
      id: 'file',
      icon: 'file',
      title: 'File the attachment as version 3',
      body: (
        <p className="text-body-sm text-ink-2">
          <span className="text-ink">{EMAIL.attachment}</span> to Documents, marked latest. v1 and
          v2 stay in the history.
        </p>
      ),
    },
    {
      id: 'task',
      icon: 'calendar',
      title: 'Create a task',
      body: (
        <div className="grid gap-2.5">
          <p className="text-body-sm text-ink">
            Review revised indemnity (9.2) and liability cap (10.1)
          </p>
          <div className="flex flex-wrap items-center gap-x-4 gap-y-2 text-body-sm text-ink-2">
            <label className="inline-flex items-center gap-2">
              <span className="text-caption text-ink-3">Owner</span>
              {reviewing ? (
                <select
                  value={owner}
                  onChange={(e) => setOwner(e.target.value as PersonKey)}
                  className="h-9 rounded-md border border-line bg-surface px-2 text-body-sm text-ink"
                >
                  {OWNERS.map((o) => (
                    <option key={o} value={o}>
                      {PEOPLE[o].name}
                    </option>
                  ))}
                </select>
              ) : (
                <span className="inline-flex items-center gap-1.5 text-ink">
                  <Avatar person={owner} size={20} /> {PEOPLE[owner].name}
                </span>
              )}
            </label>
            <span className="inline-flex items-center gap-1.5">
              <span className="text-caption text-ink-3">Requested date</span>
              <span className="text-ink tabular">{REQUESTED_DATE}</span>
            </span>
          </div>
          <p className="flex items-start gap-2 rounded-md border border-warning-dot/35 bg-warning-bg/50 px-2.5 py-2 text-caption text-warning-ink">
            <Icon name="alert" size={14} className="mt-px" />
            <span>
              Found in the email as written: “by Friday 9 October”. This is the client’s requested
              date. Clepso did not calculate a legal deadline.
            </span>
          </p>
        </div>
      ),
    },
    {
      id: 'reply',
      icon: 'send',
      title: 'Prepare a reply',
      body: (
        <p className="rounded-md border border-hairline bg-surface px-3 py-2.5 text-body-sm text-ink-2">
          “Thanks, Dana. We have Norland’s v3 and will send our comments on 9.2 and 10.1 by Friday,
          October 9.”
        </p>
      ),
    },
  ];

  return (
    <div>
      <div className="grid divide-y divide-hairline xl:grid-cols-[minmax(0,0.9fr)_minmax(0,1.1fr)] xl:divide-x xl:divide-y-0">
        <Region step={1} title="Incoming email">
          <article
            className="rounded-lg border border-hairline bg-canvas/50 p-4"
            aria-label="Sample email"
          >
            <div className="flex items-start gap-3">
              <Avatar person="dana" size={32} />
              <div className="min-w-0">
                <p className="text-body-sm text-ink">
                  {EMAIL.from} <span className="text-ink-3">to {EMAIL.to}</span>
                </p>
                <p className="text-caption text-ink-3">{EMAIL.time}</p>
              </div>
            </div>
            <p className="mt-3 text-body-strong text-ink">{EMAIL.subject}</p>
            <div className="mt-2 grid gap-2 text-body-sm text-ink-2">
              {EMAIL.paragraphs.map((para) =>
                para.includes('Friday 9 October') ? (
                  <p key={para}>
                    Could you review and send us your comments{' '}
                    <mark className="src-mark">by Friday 9 October</mark>? We’d like to sign before
                    month end.
                  </p>
                ) : (
                  <p key={para} className="whitespace-pre-line">
                    {para}
                  </p>
                ),
              )}
            </div>
            <p className="mt-3 inline-flex items-center gap-1.5 rounded-md border border-hairline px-2 py-1 text-caption text-ink-2">
              <Icon name="paperclip" size={13} /> {EMAIL.attachment}
            </p>
          </article>
        </Region>

        <Region
          step={2}
          title="Suggested by Clepso"
          aside={<span className="text-caption text-ink-3">{include.size} of 3 selected</span>}
        >
          <ul className="grid gap-3">
            {actions.map((a) => {
              const on = include.has(a.id);
              const muted = phase !== 'proposed' && !on;
              return (
                <li
                  key={a.id}
                  className={cn(
                    'rounded-lg border p-3.5 transition-colors duration-200',
                    muted ? 'border-hairline opacity-55' : 'border-hairline bg-canvas/40',
                    reviewing && on && 'border-accent/45',
                  )}
                >
                  <div className="mb-2 flex items-center gap-2.5">
                    {reviewing ? (
                      <input
                        id={`${id}-${a.id}`}
                        type="checkbox"
                        checked={on}
                        onChange={() => toggle(a.id)}
                        className="size-5 accent-[var(--mk-cobalt)]"
                      />
                    ) : (
                      <Icon name={a.icon} size={16} className="text-accent" />
                    )}
                    {reviewing ? (
                      <label htmlFor={`${id}-${a.id}`} className="text-label text-ink">
                        {a.title}
                      </label>
                    ) : (
                      <span className="text-label text-ink">{a.title}</span>
                    )}
                    {phase === 'confirmed' && on ? (
                      <span className="ml-auto inline-flex items-center gap-1 text-caption text-success-ink">
                        <Icon name="check" size={13} /> Confirmed
                      </span>
                    ) : null}
                  </div>
                  <div className="pl-7">{a.body}</div>
                </li>
              );
            })}
          </ul>
        </Region>
      </div>

      <DecisionBar
        note={
          <AnimatePresence mode="wait" initial={false}>
            <motion.span
              key={phase}
              initial={reduce ? false : { opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={reduce ? undefined : { opacity: 0 }}
              transition={{ duration: 0.2 }}
              role="status"
              className="block"
            >
              {phase === 'proposed' && 'Nothing is filed, scheduled or sent until you confirm.'}
              {phase === 'reviewing' &&
                'Untick anything you don’t want, change the owner, then confirm.'}
              {phase === 'confirmed' &&
                `Reviewed: ${include.size} of 3 actions confirmed${include.has('reply') ? ', and the reply saved as a draft' : ''}. Sample only: nothing was saved, scheduled or sent.`}
            </motion.span>
          </AnimatePresence>
        }
      >
        {phase === 'proposed' ? (
          <button
            type="button"
            className={buttonClass('primary', 'md')}
            onClick={() => setPhase('reviewing')}
          >
            Review suggested actions
          </button>
        ) : null}
        {phase === 'reviewing' ? (
          <>
            <button
              type="button"
              className={buttonClass('quiet', 'md')}
              onClick={() => setPhase('proposed')}
            >
              Cancel
            </button>
            <button
              type="button"
              className={buttonClass('primary', 'md')}
              disabled={include.size === 0}
              onClick={() => {
                setPhase('confirmed');
                onComplete(`${include.size}-of-3`);
              }}
            >
              Confirm {include.size} {include.size === 1 ? 'action' : 'actions'}
            </button>
          </>
        ) : null}
        {phase === 'confirmed' ? (
          <button type="button" className={buttonClass('secondary', 'md')} onClick={reset}>
            <Icon name="replay" size={16} /> Reset sample
          </button>
        ) : null}
      </DecisionBar>
    </div>
  );
}
