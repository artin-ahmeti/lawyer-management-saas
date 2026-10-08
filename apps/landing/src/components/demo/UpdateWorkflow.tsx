'use client';

import { useId, useMemo, useState } from 'react';
import { composeUpdate, PEOPLE, UPDATE_ITEMS, type UpdateItemId } from '@/content/sample-matter';
import { cn } from '@/lib/cn';
import { Avatar } from '../ui/Avatar';
import { buttonClass } from '../ui/button-styles';
import { Icon } from '../ui/Icon';
import { DecisionBar, Region } from './parts';

type Phase = 'draft' | 'editing' | 'approved';

const defaults = () =>
  new Set<UpdateItemId>(UPDATE_ITEMS.filter((i) => i.defaultOn).map((i) => i.id));

export function UpdateWorkflow({ onComplete }: { onComplete: (outcome: string) => void }) {
  const id = useId();
  const [selected, setSelected] = useState<Set<UpdateItemId>>(defaults);
  const [phase, setPhase] = useState<Phase>('draft');
  const [edited, setEdited] = useState<string | null>(null);
  const generated = useMemo(() => composeUpdate(selected), [selected]);
  const text = edited ?? generated;

  const toggle = (item: UpdateItemId) => {
    setSelected((prev) => {
      const next = new Set(prev);
      if (next.has(item)) next.delete(item);
      else next.add(item);
      return next;
    });
  };
  const reset = () => {
    setSelected(defaults());
    setEdited(null);
    setPhase('draft');
  };

  return (
    <div>
      <div className="grid divide-y divide-hairline xl:grid-cols-[minmax(0,0.85fr)_minmax(0,1.15fr)] xl:divide-x xl:divide-y-0">
        <Region step={1} title="Choose what to include">
          <fieldset disabled={phase === 'approved'}>
            <legend className="sr-only">Matter activity to include in the update</legend>
            <ul className="grid gap-2">
              {UPDATE_ITEMS.map((item) => (
                <li key={item.id}>
                  <label
                    className={cn(
                      'flex min-h-11 cursor-pointer items-start gap-3 rounded-md border px-3 py-2.5 text-body-sm transition-colors duration-150',
                      selected.has(item.id)
                        ? 'border-accent/50 bg-accent-tint/40 text-ink'
                        : 'border-hairline text-ink-2',
                    )}
                  >
                    <input
                      type="checkbox"
                      checked={selected.has(item.id)}
                      onChange={() => toggle(item.id)}
                      className="mt-0.5 size-5 shrink-0 accent-[var(--mk-cobalt)]"
                    />
                    {item.label}
                  </label>
                </li>
              ))}
            </ul>
          </fieldset>
          {edited !== null && phase !== 'approved' ? (
            <button
              type="button"
              onClick={() => setEdited(null)}
              className="mt-3 inline-flex min-h-11 items-center gap-1.5 text-label text-accent hover:underline"
            >
              <Icon name="replay" size={14} /> Rebuild the draft from this selection
            </button>
          ) : null}
          <p className="mt-4 text-caption text-ink-3">
            Plain language, with the next step and its date. No internal codes or timekeeper detail.
          </p>
        </Region>

        <Region
          step={2}
          title="Draft update to Dana Whitfield"
          aside={
            <span className="text-caption text-ink-3">
              {edited !== null ? 'Edited by you' : 'Prepared by Clepso'}
            </span>
          }
        >
          <div className="rounded-lg border border-hairline bg-canvas/50">
            <div className="flex items-center gap-3 border-b border-hairline px-4 py-3">
              <Avatar person="priya" size={28} />
              <div className="min-w-0 text-caption">
                <p className="text-ink">
                  {PEOPLE.priya.name} <span className="text-ink-3">to {PEOPLE.dana.name}</span>
                </p>
                <p className="text-ink-3">Not sent · draft</p>
              </div>
            </div>
            {phase === 'editing' ? (
              <div className="p-3">
                <label htmlFor={`${id}-text`} className="sr-only">
                  Edit the draft update
                </label>
                <textarea
                  id={`${id}-text`}
                  value={text}
                  onChange={(e) => setEdited(e.target.value)}
                  rows={10}
                  className="w-full rounded-md border border-line bg-surface px-3 py-2.5 text-body-sm leading-relaxed text-ink"
                />
              </div>
            ) : text ? (
              <div className="whitespace-pre-line px-4 py-4 text-body-sm leading-relaxed text-ink-2">
                {text}
              </div>
            ) : (
              <p className="px-4 py-6 text-body-sm text-ink-3">
                Choose at least one item to draft an update.
              </p>
            )}
          </div>
        </Region>
      </div>

      <DecisionBar
        note={
          <span role="status">
            {phase === 'draft' && 'An update goes out only when a person approves and sends it.'}
            {phase === 'editing' && 'Your edits are kept. Approve when it reads right.'}
            {phase === 'approved' &&
              'Approved and ready for you to send. Sample only: nothing was sent to anyone.'}
          </span>
        }
      >
        {phase !== 'approved' ? (
          <>
            <button
              type="button"
              className={buttonClass('secondary', 'md')}
              onClick={() => setPhase(phase === 'editing' ? 'draft' : 'editing')}
              disabled={!text}
            >
              <Icon name="pen" size={16} /> {phase === 'editing' ? 'Done editing' : 'Edit draft'}
            </button>
            <button
              type="button"
              className={buttonClass('primary', 'md')}
              disabled={!text.trim()}
              onClick={() => {
                setPhase('approved');
                onComplete(edited !== null ? 'approved-edited' : 'approved');
              }}
            >
              Approve draft
            </button>
          </>
        ) : (
          <button type="button" className={buttonClass('secondary', 'md')} onClick={reset}>
            <Icon name="replay" size={16} /> Reset sample
          </button>
        )}
      </DecisionBar>
    </div>
  );
}
