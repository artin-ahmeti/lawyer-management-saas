'use client';

import { useCallback, useState } from 'react';
import { FEATURES, statusOf, type FeatureKey } from '@/config/features';
import { MATTER } from '@/content/sample-matter';
import { track } from '@/lib/analytics';
import { cn } from '@/lib/cn';
import { CtaButton } from '../site/Cta';
import { Icon, type IconName } from '../ui/Icon';
import { PreviewFrame } from '../ui/PreviewFrame';
import { SectionLabel } from '../ui/SectionLabel';
import { StatusBadge } from '../ui/StatusBadge';
import { Tabs, tabPanelProps } from '../ui/Tabs';
import { BriefWorkflow } from './BriefWorkflow';
import { EmailWorkflow } from './EmailWorkflow';
import { TimeWorkflow } from './TimeWorkflow';
import { UpdateWorkflow } from './UpdateWorkflow';

type WorkflowId = 'email' | 'brief' | 'time' | 'update';

const WORKFLOWS: { id: WorkflowId; feature: FeatureKey; icon: IconName; summary: string }[] = [
  {
    id: 'email',
    feature: 'aiEmailActions',
    icon: 'inbox',
    summary:
      'An email with a revised agreement becomes a filed document, a task with an owner and a draft reply.',
  },
  {
    id: 'brief',
    feature: 'aiMatterBrief',
    icon: 'search',
    summary: 'Ask what changed. Every line points to the email or clause it came from.',
  },
  {
    id: 'time',
    feature: 'aiTimeEntries',
    icon: 'clock',
    summary: 'A voice note and the day’s activity become a time entry you can edit.',
  },
  {
    id: 'update',
    feature: 'aiClientUpdate',
    icon: 'message',
    summary: 'Pick what happened; get a plain-language update with the next date.',
  },
];

export function AiWorkflows() {
  const [active, setActive] = useState<WorkflowId>('email');
  const [completed, setCompleted] = useState<Set<WorkflowId>>(() => new Set());

  const complete = useCallback((workflow: WorkflowId, outcome: string) => {
    setCompleted((prev) => new Set(prev).add(workflow));
    track({ name: 'ai_review_complete', workflow, outcome });
  }, []);

  const select = (id: WorkflowId) => {
    setActive(id);
    track({ name: 'ai_workflow_select', workflow: id });
  };

  const current = WORKFLOWS.find((w) => w.id === active)!;

  return (
    <section id="ai" aria-labelledby="ai-title" className="section-y ai-section">
      <div className="container-mk">
        <div className="section-heading">
          <SectionLabel index="03">Thoughtfully assisted. Always reviewed.</SectionLabel>
          <h2 id="ai-title" className="text-h2 text-ink">
            A head start on the work.
            <br />
            <span className="heading-accent">The final word is yours.</span>
          </h2>
          <p className="text-lede text-ink-2">
            Turn incoming information into useful drafts, summaries and next steps. Follow the
            sources. Decide what happens next.
          </p>
        </div>

        <p className="mt-7 flex flex-wrap items-center justify-center gap-x-3 gap-y-2 text-center text-caption text-ink-3">
          <StatusBadge status="preview" />
          These workflows are in preview. The demo runs on sample data; no AI service is called and
          nothing you type leaves this page.
        </p>

        <div className="ai-layout">
          <div className="min-w-0 lg:sticky lg:top-28">
            <Tabs
              items={WORKFLOWS.map((w) => ({
                id: w.id,
                label: (
                  <span className="flex items-center gap-3">
                    <span className="grid size-8 shrink-0 place-items-center rounded-md border border-hairline bg-surface text-ink-2">
                      <Icon name={w.icon} size={16} />
                    </span>
                    <span className="text-label text-ink">{FEATURES[w.feature].name}</span>
                    {completed.has(w.id) ? (
                      <span className="ml-auto inline-flex items-center gap-1 text-caption text-success-ink">
                        <Icon name="check" size={13} /> Reviewed
                      </span>
                    ) : null}
                  </span>
                ),
                description: (
                  <span className="mt-2 hidden text-body-sm text-ink-2 lg:block">{w.summary}</span>
                ),
              }))}
              selected={active}
              onSelect={select}
              label="AI workflows"
              idBase="ai"
              orientation="responsive"
              className="workflow-tabs no-scrollbar"
              tabClassName={() => 'workflow-tab'}
            />
            <p className="mt-4 text-body-sm text-ink-2 lg:hidden">{current.summary}</p>
          </div>

          <div className="min-w-0">
            <PreviewFrame
              title={
                <span>
                  <span className="text-mono-id text-ink-2">{MATTER.id}</span>{' '}
                  <span className="text-ink-3">·</span> {FEATURES[current.feature].name}
                </span>
              }
              toolbar={
                <StatusBadge status={statusOf(current.feature)} className="hidden sm:inline-flex" />
              }
            >
              {/* All four stay mounted so a reviewed workflow keeps its state while you compare. */}
              {WORKFLOWS.map((w) => (
                <div
                  key={w.id}
                  {...tabPanelProps('ai', w.id)}
                  hidden={w.id !== active}
                  className="workflow-panel focus-visible:outline-2 focus-visible:outline-accent focus-visible:outline-offset-4"
                >
                  {w.id === 'email' ? (
                    <EmailWorkflow onComplete={(o) => complete('email', o)} />
                  ) : null}
                  {w.id === 'brief' ? (
                    <BriefWorkflow onComplete={(o) => complete('brief', o)} />
                  ) : null}
                  {w.id === 'time' ? (
                    <TimeWorkflow onComplete={(o) => complete('time', o)} />
                  ) : null}
                  {w.id === 'update' ? (
                    <UpdateWorkflow onComplete={(o) => complete('update', o)} />
                  ) : null}
                </div>
              ))}
            </PreviewFrame>

            <div
              className={cn(
                'mt-6 flex flex-wrap items-center justify-between gap-4 rounded-xl border p-5 transition-colors duration-500 sm:p-6',
                completed.size > 0 ? 'border-accent/45 bg-accent-tint/25' : 'border-hairline',
              )}
            >
              <div>
                <p className="text-title-3 text-ink">See how this could work for your firm.</p>
                <p className="mt-1 text-body-sm text-ink-2" role="status">
                  {completed.size > 0
                    ? `You reviewed ${completed.size} of 4 sample workflows. Clepso is designed so every AI suggestion waits for this step.`
                    : 'Try a review above: every suggestion waits for a person.'}
                </p>
              </div>
              <CtaButton location="ai-demo" arrow />
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
