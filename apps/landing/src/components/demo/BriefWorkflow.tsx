'use client';

import { AnimatePresence, motion, useReducedMotion } from 'motion/react';
import { useEffect, useRef, useState } from 'react';
import { statusOf } from '@/config/features';
import { MATTER, SOURCES, type SourceId } from '@/content/sample-matter';
import { track } from '@/lib/analytics';
import { cn } from '@/lib/cn';
import { buttonClass } from '../ui/button-styles';
import { Icon } from '../ui/Icon';
import { StatusBadge } from '../ui/StatusBadge';
import { DecisionBar, Region, SourceChip, SourcePanel } from './parts';

type Question = 'changes' | 'approval';

const QUESTIONS: { id: Question; text: string }[] = [
  { id: 'changes', text: 'What changed since my last review?' },
  { id: 'approval', text: 'Has Harlow approved the new liability cap?' },
];

export function BriefWorkflow({ onComplete }: { onComplete: (outcome: string) => void }) {
  const reduce = useReducedMotion();
  const [question, setQuestion] = useState<Question>('changes');
  const [source, setSource] = useState<SourceId | null>(null);
  const [reviewed, setReviewed] = useState(false);
  const [voice, setVoice] = useState<'idle' | 'listening' | 'heard'>('idle');
  const opener = useRef<HTMLButtonElement | null>(null);
  const timer = useRef<number | undefined>(undefined);

  useEffect(() => () => window.clearTimeout(timer.current), []);

  const open = (id: SourceId, el: HTMLButtonElement) => {
    opener.current = el;
    setSource((cur) => (cur === id ? null : id));
    track({ name: 'source_open', workflow: 'matter-brief', source: id });
  };
  const close = () => {
    setSource(null);
    opener.current?.focus();
  };
  const ask = (q: Question) => {
    setQuestion(q);
    setSource(null);
    setReviewed(false);
  };
  const simulateVoice = () => {
    setVoice('listening');
    window.clearTimeout(timer.current);
    timer.current = window.setTimeout(
      () => {
        setVoice('heard');
        ask('changes');
      },
      reduce ? 200 : 1400,
    );
  };

  const chip = (id: SourceId) => <SourceChip id={id} onOpen={open} active={source === id} />;

  return (
    <div>
      <div className="grid divide-y divide-hairline xl:grid-cols-[minmax(0,0.85fr)_minmax(0,1.15fr)] xl:divide-x xl:divide-y-0">
        <Region step={1} title="Your question">
          <fieldset>
            <legend className="sr-only">Choose a question about {MATTER.id}</legend>
            <div className="grid gap-2">
              {QUESTIONS.map((q) => (
                <label
                  key={q.id}
                  className={cn(
                    'flex min-h-11 cursor-pointer items-center gap-3 rounded-md border px-3 py-2.5 text-body-sm transition-colors duration-150',
                    question === q.id
                      ? 'border-accent/60 bg-accent-tint/50 text-ink'
                      : 'border-hairline text-ink-2 hover:text-ink',
                  )}
                >
                  <input
                    type="radio"
                    name="brief-question"
                    value={q.id}
                    checked={question === q.id}
                    onChange={() => ask(q.id)}
                    className="size-4 accent-[var(--mk-cobalt)]"
                  />
                  {q.text}
                </label>
              ))}
            </div>
          </fieldset>

          <div className="mt-5 rounded-md border border-dashed border-line p-3">
            <div className="flex flex-wrap items-center gap-3">
              <button
                type="button"
                onClick={simulateVoice}
                disabled={voice === 'listening'}
                className={cn(buttonClass('secondary', 'md'), 'h-10')}
              >
                <Icon name="mic" size={16} />
                {voice === 'listening' ? 'Listening…' : 'Ask by voice'}
              </button>
              <StatusBadge status={statusOf('voice')} />
            </div>
            <p className="mt-2 text-caption text-ink-3" aria-live="polite">
              {voice === 'listening' && (
                <span className="inline-flex items-center gap-2">
                  <span aria-hidden="true" className="inline-flex items-end gap-0.5">
                    {[0, 1, 2, 3].map((i) => (
                      <span
                        key={i}
                        className="w-0.5 rounded-full bg-accent motion-safe:animate-pulse"
                        style={{ height: 6 + ((i * 5) % 9), animationDelay: `${i * 120}ms` }}
                      />
                    ))}
                  </span>
                  Simulated voice input
                </span>
              )}
              {voice === 'heard' && '“What changed since my last review?” (simulated transcript)'}
              {voice === 'idle' && 'Simulated here: this page never uses your microphone.'}
            </p>
          </div>

          <div className="mt-5">
            <p className="mb-2 text-overline text-ink-3">Sources in this matter</p>
            <ul className="flex flex-wrap gap-1.5">
              {(Object.keys(SOURCES) as SourceId[]).map((id) => (
                <li key={id}>{chip(id)}</li>
              ))}
            </ul>
          </div>
        </Region>

        <Region
          step={2}
          title="Answer from the matter"
          aside={<span className="text-caption text-ink-3">Only from this matter’s sources</span>}
        >
          <AnimatePresence mode="wait" initial={false}>
            <motion.div
              key={question}
              initial={reduce ? false : { opacity: 0, y: 6 }}
              animate={{ opacity: 1, y: 0 }}
              exit={reduce ? undefined : { opacity: 0 }}
              transition={{ duration: 0.3, ease: [0.2, 0.8, 0.2, 1] }}
            >
              {question === 'changes' ? (
                <div>
                  <p className="text-body-strong text-ink">
                    Since your last review on {MATTER.lastReview}:
                  </p>
                  <ul className="mt-3 grid gap-3 text-body-sm leading-relaxed text-ink-2">
                    <li className="flex gap-2.5">
                      <span
                        aria-hidden="true"
                        className="mt-2 size-1 shrink-0 rounded-full bg-ink-3"
                      />
                      <span>
                        Norland narrowed the indemnity: it now excludes claims arising from Harlow’s
                        own instructions.
                        {chip('clause-9-2')}
                      </span>
                    </li>
                    <li className="flex gap-2.5">
                      <span
                        aria-hidden="true"
                        className="mt-2 size-1 shrink-0 rounded-full bg-ink-3"
                      />
                      <span>
                        The liability cap falls from twelve months of fees to six.
                        {chip('clause-10-1')} Harlow wants to keep twelve months.{chip('note')}
                      </span>
                    </li>
                    <li className="flex gap-2.5">
                      <span
                        aria-hidden="true"
                        className="mt-2 size-1 shrink-0 rounded-full bg-ink-3"
                      />
                      <span>
                        Termination notice shortens from 60 to 30 days.{chip('clause-14-1')}
                      </span>
                    </li>
                    <li className="flex gap-2.5">
                      <span
                        aria-hidden="true"
                        className="mt-2 size-1 shrink-0 rounded-full bg-ink-3"
                      />
                      <span>Dana asked for comments by Friday 9 October.{chip('email')}</span>
                    </li>
                  </ul>
                </div>
              ) : (
                <div className="rounded-lg border border-warning-dot/35 bg-warning-bg/40 p-4">
                  <p className="flex items-center gap-2 text-body-strong text-warning-ink">
                    <Icon name="alert" size={16} /> Not enough information to answer
                  </p>
                  <p className="mt-2 text-body-sm leading-relaxed text-ink-2">
                    No source in this matter records Harlow approving a six-month cap. Dana’s latest
                    email asks for a review{chip('email')} and Marcus’s note says Harlow wants to
                    keep twelve months.{chip('note')}
                  </p>
                  <p className="mt-3 text-caption text-ink-3">
                    Clepso won’t guess. Ask Dana, then add her answer to the matter.
                  </p>
                </div>
              )}
            </motion.div>
          </AnimatePresence>

          <AnimatePresence initial={false}>
            {source ? (
              <motion.div
                key={source}
                initial={reduce ? false : { opacity: 0, height: 0 }}
                animate={{ opacity: 1, height: 'auto' }}
                exit={reduce ? undefined : { opacity: 0, height: 0 }}
                transition={{ duration: 0.3, ease: [0.2, 0.8, 0.2, 1] }}
                className="overflow-hidden"
              >
                <div className="pt-4">
                  <SourcePanel id={source} onClose={close} />
                </div>
              </motion.div>
            ) : null}
          </AnimatePresence>
        </Region>
      </div>

      <DecisionBar
        note={
          <span role="status">
            {reviewed
              ? 'Marked reviewed. Sample only: nothing was saved to the matter.'
              : 'Open any source to check the answer against the original text.'}
          </span>
        }
      >
        {reviewed ? (
          <button
            type="button"
            className={buttonClass('secondary', 'md')}
            onClick={() => setReviewed(false)}
          >
            <Icon name="replay" size={16} /> Reset sample
          </button>
        ) : (
          <button
            type="button"
            className={buttonClass('primary', 'md')}
            onClick={() => {
              setReviewed(true);
              onComplete(question === 'changes' ? 'answered' : 'insufficient-information');
            }}
          >
            Mark brief as reviewed
          </button>
        )}
      </DecisionBar>
    </div>
  );
}
