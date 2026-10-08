'use client';

import { useId, useState } from 'react';
import { statusOf } from '@/config/features';
import {
  DETECTED_ACTIVITY,
  MATTER,
  OTHER_MATTERS,
  TIME_ENTRY_DEFAULT,
  VOICE_NOTE,
} from '@/content/sample-matter';
import { cn } from '@/lib/cn';
import { buttonClass } from '../ui/button-styles';
import { Icon } from '../ui/Icon';
import { StatusBadge } from '../ui/StatusBadge';
import { DecisionBar, Region } from './parts';

type Phase = 'draft' | 'reviewing' | 'saved';

const hhmm = (tenths: number) => {
  const minutes = tenths * 6;
  return `${Math.floor(minutes / 60)}:${String(minutes % 60).padStart(2, '0')}`;
};

export function TimeWorkflow({ onComplete }: { onComplete: (outcome: string) => void }) {
  const id = useId();
  const [phase, setPhase] = useState<Phase>('draft');
  const [matter, setMatter] = useState<string>(TIME_ENTRY_DEFAULT.matter);
  const [tenths, setTenths] = useState<number>(TIME_ENTRY_DEFAULT.tenths);
  const [narrative, setNarrative] = useState<string>(TIME_ENTRY_DEFAULT.narrative);
  const [billable, setBillable] = useState(true);
  const editable = phase === 'draft';
  const matters = [{ id: MATTER.id, title: MATTER.title }, ...OTHER_MATTERS];
  const matterTitle = matters.find((m) => m.id === matter)?.title ?? '';

  const reset = () => {
    setPhase('draft');
    setMatter(TIME_ENTRY_DEFAULT.matter);
    setTenths(TIME_ENTRY_DEFAULT.tenths);
    setNarrative(TIME_ENTRY_DEFAULT.narrative);
    setBillable(true);
  };

  return (
    <div>
      <div className="grid divide-y divide-hairline xl:grid-cols-[minmax(0,0.9fr)_minmax(0,1.1fr)] xl:divide-x xl:divide-y-0">
        <Region step={1} title="Work on Sep 30">
          <div className="rounded-lg border border-hairline bg-canvas/50 p-4">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <p className="flex items-center gap-2 text-label text-ink">
                <Icon name="mic" size={15} className="text-accent" /> Voice note ·{' '}
                {VOICE_NOTE.length}
              </p>
              <StatusBadge status={statusOf('voice')} detail="voice capture" />
            </div>
            <p className="mt-1 text-caption text-ink-3">{VOICE_NOTE.time}</p>
            <p className="mt-3 text-body-sm italic text-ink-2">“{VOICE_NOTE.transcript}”</p>
          </div>

          <p className="mb-2 mt-5 text-overline text-ink-3">Detected activity</p>
          <ul className="divide-y divide-hairline rounded-lg border border-hairline">
            {DETECTED_ACTIVITY.map((a) => (
              <li key={a.id} className="flex items-center gap-3 px-3 py-2.5">
                <Icon
                  name={a.suggested ? 'check' : 'x'}
                  size={15}
                  className={a.suggested ? 'text-success-ink' : 'text-ink-3'}
                />
                <div className="min-w-0 flex-1">
                  <p
                    className={cn('truncate text-body-sm', a.suggested ? 'text-ink' : 'text-ink-3')}
                  >
                    {a.label}
                  </p>
                  <p className="text-caption text-ink-3">{a.detail}</p>
                </div>
                <span className="text-caption text-ink-3">
                  {a.suggested ? 'Used' : 'Not suggested'}
                </span>
              </li>
            ))}
          </ul>
          <p className="mt-3 text-caption text-ink-3">
            Administrative work is left out. Detected activity is not billable time until you say
            so.
          </p>
        </Region>

        <Region
          step={2}
          title="Proposed time entry"
          aside={<span className="text-caption text-ink-3">Editable</span>}
        >
          <div className="grid gap-4">
            <label className="grid gap-1.5 text-label text-ink-2" htmlFor={`${id}-matter`}>
              Matter
              <select
                id={`${id}-matter`}
                value={matter}
                disabled={!editable}
                onChange={(e) => setMatter(e.target.value)}
                className="h-11 rounded-md border border-line bg-surface px-3 text-body-sm text-ink disabled:opacity-70"
              >
                {matters.map((m) => (
                  <option key={m.id} value={m.id}>
                    {m.id} · {m.title}
                  </option>
                ))}
              </select>
            </label>

            <div className="grid gap-1.5">
              <span className="text-label text-ink-2" id={`${id}-dur`}>
                Duration
              </span>
              <div className="flex items-center gap-2" role="group" aria-labelledby={`${id}-dur`}>
                <button
                  type="button"
                  disabled={!editable || tenths <= 1}
                  onClick={() => setTenths((t) => Math.max(1, t - 1))}
                  className="grid size-11 place-items-center rounded-md border border-line text-ink hover:bg-surface disabled:opacity-40"
                  aria-label="Decrease by 0.1 hour"
                >
                  <span aria-hidden="true" className="text-lg leading-none">
                    −
                  </span>
                </button>
                <output
                  className="min-w-28 rounded-md border border-hairline bg-surface px-3 py-2 text-center"
                  aria-live="polite"
                >
                  <span className="text-title-3 text-ink tabular">{(tenths / 10).toFixed(1)}h</span>
                  <span className="ml-2 text-caption text-ink-3 tabular">{hhmm(tenths)}</span>
                </output>
                <button
                  type="button"
                  disabled={!editable || tenths >= 40}
                  onClick={() => setTenths((t) => Math.min(40, t + 1))}
                  className="grid size-11 place-items-center rounded-md border border-line text-ink hover:bg-surface disabled:opacity-40"
                  aria-label="Increase by 0.1 hour"
                >
                  <Icon name="plus" size={16} />
                </button>
              </div>
              <p className="text-caption text-ink-3">
                40 min call + 25 min markup = 65 min, rounded up to the next tenth of an hour.
              </p>
            </div>

            <label className="grid gap-1.5 text-label text-ink-2" htmlFor={`${id}-narr`}>
              Narrative
              <textarea
                id={`${id}-narr`}
                value={narrative}
                readOnly={!editable}
                onChange={(e) => setNarrative(e.target.value)}
                rows={3}
                className="rounded-md border border-line bg-surface px-3 py-2.5 text-body-sm text-ink read-only:opacity-80"
              />
            </label>

            <label className="flex min-h-11 items-center gap-3 text-body-sm text-ink">
              <input
                type="checkbox"
                checked={billable}
                disabled={!editable}
                onChange={(e) => setBillable(e.target.checked)}
                className="size-5 accent-[var(--mk-cobalt)]"
              />
              Billable
              <span className="text-caption text-ink-3">
                Your call: detected time is only a suggestion.
              </span>
            </label>
          </div>
        </Region>
      </div>

      <DecisionBar
        note={
          <span role="status">
            {phase === 'draft' &&
              'Suggestions start from what happened, not from a target. Edit anything before review.'}
            {phase === 'reviewing' &&
              `${(tenths / 10).toFixed(1)}h on ${matter} (${matterTitle}), ${billable ? 'billable' : 'not billable'}. Save it or go back to edit.`}
            {phase === 'saved' &&
              'Time entry reviewed. Sample only: nothing was posted to a timesheet or invoice.'}
          </span>
        }
      >
        {phase === 'draft' ? (
          <button
            type="button"
            className={buttonClass('primary', 'md')}
            onClick={() => setPhase('reviewing')}
          >
            Review time entry
          </button>
        ) : null}
        {phase === 'reviewing' ? (
          <>
            <button
              type="button"
              className={buttonClass('quiet', 'md')}
              onClick={() => setPhase('draft')}
            >
              Back to edit
            </button>
            <button
              type="button"
              className={buttonClass('primary', 'md')}
              onClick={() => {
                setPhase('saved');
                onComplete(billable ? 'billable' : 'non-billable');
              }}
            >
              Save entry
            </button>
          </>
        ) : null}
        {phase === 'saved' ? (
          <button type="button" className={buttonClass('secondary', 'md')} onClick={reset}>
            <Icon name="replay" size={16} /> Reset sample
          </button>
        ) : null}
      </DecisionBar>
    </div>
  );
}
