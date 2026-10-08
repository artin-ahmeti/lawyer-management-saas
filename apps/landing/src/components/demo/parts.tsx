'use client';

import { useEffect, useRef } from 'react';
import { SOURCES, splitMarked, type SourceId } from '@/content/sample-matter';
import { cn } from '@/lib/cn';
import { Icon } from '../ui/Icon';

/** One labelled region of a workflow stage: 1 Input, 2 Proposed, 3 Your decision. */
export function Region({
  step,
  title,
  aside,
  children,
  className,
}: {
  step: number;
  title: string;
  aside?: React.ReactNode;
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <div className={cn('min-w-0 p-4 sm:p-6', className)}>
      <div className="mb-4 flex items-center justify-between gap-3">
        <p className="flex items-center gap-2.5 text-overline text-ink-3">
          <span className="grid size-5 place-items-center rounded-full border border-line text-[10px] tabular text-ink-2">
            {step}
          </span>
          {title}
        </p>
        {aside}
      </div>
      {children}
    </div>
  );
}

export function DecisionBar({
  children,
  note,
}: {
  children: React.ReactNode;
  note?: React.ReactNode;
}) {
  return (
    <div className="border-t border-hairline bg-canvas/60 p-4 sm:px-6">
      <div className="flex flex-wrap items-center gap-3">
        <p className="flex items-center gap-2.5 text-overline text-ink-3">
          <span className="grid size-5 place-items-center rounded-full border border-accent/60 text-[10px] tabular text-accent">
            3
          </span>
          Your decision
        </p>
        <div className="ml-auto flex flex-wrap items-center gap-2">{children}</div>
      </div>
      {note ? <div className="mt-3 text-caption text-ink-3">{note}</div> : null}
    </div>
  );
}

/** Excerpt with the changed or relevant words marked. */
export function Marked({ text }: { text: string }) {
  return (
    <>
      {splitMarked(text).map((part, i) =>
        part.marked ? (
          <mark key={i} className="src-mark">
            {part.text}
          </mark>
        ) : (
          <span key={i}>{part.text}</span>
        ),
      )}
    </>
  );
}

/** A citation that resolves to real sample content: it opens the excerpt. */
export function SourceChip({
  id,
  onOpen,
  active,
}: {
  id: SourceId;
  onOpen: (id: SourceId, el: HTMLButtonElement) => void;
  active?: boolean;
}) {
  const s = SOURCES[id];
  return (
    <button
      type="button"
      onClick={(e) => onOpen(id, e.currentTarget)}
      aria-pressed={active}
      className={cn(
        'source-chip mx-0.5 inline-flex min-h-11 items-center gap-1 rounded-sm border px-2 py-1 align-baseline text-caption transition-colors duration-150',
        active
          ? 'border-accent bg-accent-tint text-accent-ink'
          : 'border-line text-ink-2 hover:border-accent/60 hover:text-ink',
      )}
    >
      <Icon name="link" size={11} />
      {s.ref}
      <span className="sr-only">, open source excerpt</span>
    </button>
  );
}

/** The opened source: kind, where it lives, the excerpt, and what it said before. */
export function SourcePanel({ id, onClose }: { id: SourceId; onClose: () => void }) {
  const s = SOURCES[id];
  const heading = useRef<HTMLHeadingElement>(null);
  useEffect(() => {
    heading.current?.focus();
  }, [id]);
  return (
    <div
      role="region"
      aria-label={`Source: ${s.title}`}
      onKeyDown={(e) => {
        if (e.key === 'Escape') onClose();
      }}
      className="rounded-lg border border-accent/40 bg-canvas p-4"
    >
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <p className="text-overline text-accent-ink">{s.kind}</p>
          <h4 ref={heading} tabIndex={-1} className="mt-1 text-body-strong text-ink outline-none">
            {s.title}
          </h4>
          <p className="text-caption text-ink-3">{s.meta}</p>
        </div>
        <button
          type="button"
          onClick={onClose}
          className="-mr-2 -mt-2 grid size-11 shrink-0 place-items-center rounded-md text-ink-2 hover:bg-surface hover:text-ink"
          aria-label="Close source"
        >
          <Icon name="x" size={18} />
        </button>
      </div>
      <blockquote className="mt-3 border-l-2 border-accent/50 pl-3 text-body-sm text-ink-2">
        <Marked text={s.excerpt} />
      </blockquote>
      {s.previous ? (
        <p className="mt-3 text-caption text-ink-3">
          <span className="text-ink-2">v2 said:</span> {s.previous}
        </p>
      ) : null}
    </div>
  );
}
