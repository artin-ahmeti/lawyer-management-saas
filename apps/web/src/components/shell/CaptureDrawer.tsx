'use client';

import {
  AiSuggestion,
  Banner,
  Button,
  Field,
  FormRow,
  IconWell,
  Input,
  Stepper,
  Switch,
  Textarea,
  TimerHero,
} from '@lawfirm/ui-web';
import { useState, type FormEvent } from 'react';
import { Modal } from '@/components/Modal';
import { NativeSelect } from '@/components/NativeSelect';
import { useMatters, useSettings, useTimekeepers, useWrites } from '@/lib/data';
import { useVoiceRecorder } from './useVoiceRecorder';
import { CURRENT_USER } from '@/lib/data/fixtures';
import { todayIso } from '@/lib/clock';
import { clock, hoursMinutes, money, moneyShort, roundedHours } from '@/lib/format';
import { elapsedMs, isTimerPaused, useTimerSeconds, useTimerStore } from '@/stores/timer';
import { useOverlays, type CaptureKind } from '@/stores/ui';

const KINDS: { kind: CaptureKind; icon: 'play' | 'mic' | 'clock' | 'receipt' | 'check' | 'pen' }[] =
  [
    { kind: 'Start timer', icon: 'play' },
    { kind: 'Voice memo', icon: 'mic' },
    { kind: 'Log time', icon: 'clock' },
    { kind: 'Expense', icon: 'receipt' },
    { kind: 'Task', icon: 'check' },
    { kind: 'Note', icon: 'pen' },
  ];
/** UTBMS litigation codes offered in Capture, with the short label the picker shows. */
const CODES: Record<string, string> = {
  L110: 'Fact investigation',
  L120: 'Analysis / strategy',
  L130: 'Experts / consultants',
  L140: 'Document / file management',
  L230: 'Court mandated conferences',
  L310: 'Written discovery',
  L390: 'Other discovery',
};
const OTHER_FIELD: Record<string, { label: string; placeholder: string }> = {
  Expense: { label: 'Description', placeholder: 'Filing fee · Probate Dept.' },
  Task: { label: 'Task', placeholder: 'What needs doing, and by when?' },
  Note: { label: 'Note', placeholder: 'Quick note during the hearing…' },
  'Voice memo': { label: 'Memo', placeholder: 'Add the memo text…' },
};

export function CaptureDrawer() {
  const capture = useOverlays((s) => s.capture);
  return capture.open ? <CaptureForm key={capture.openedAt} /> : null;
}

function CaptureForm() {
  const { kind, prefill } = useOverlays((s) => s.capture);
  const close = useOverlays((s) => s.closeCapture);
  const setKind = useOverlays((s) => s.setCaptureKind);
  const notify = useOverlays((s) => s.notify);
  const confirm = useOverlays((s) => s.confirm);
  const matters = useMatters();
  const people = useTimekeepers();
  const settings = useSettings();
  const voice = useVoiceRecorder();
  const writes = useWrites();
  const timerId = useTimerStore((s) => s.matterId);
  const timerTitle = useTimerStore((s) => s.matterTitle);
  const timerPaused = useTimerStore(isTimerPaused);
  const seconds = useTimerSeconds();
  const [matterId, setMatterId] = useState(prefill.matterId ?? timerId ?? 'm2');
  const [minutes, setMinutes] = useState(prefill.minutes ?? 12);
  const [narrative, setNarrative] = useState(prefill.narrative ?? '');
  const [code, setCode] = useState('L120');
  const [billable, setBillable] = useState(true);
  const [visible, setVisible] = useState(false);
  const [other, setOther] = useState('');
  const [date, setDate] = useState(todayIso());
  const [assignee, setAssignee] = useState(CURRENT_USER.short);
  const [amount, setAmount] = useState('');
  const [aiDismissed, setAiDismissed] = useState(false);
  const [error, setError] = useState('');
  const matter = matters.data?.find((m) => m.id === matterId);
  const hours = roundedHours(minutes);
  const amountCents = Math.round(hours * CURRENT_USER.rateCents);
  const time = () => ({
    matterId,
    minutes,
    narrative,
    code,
    billable,
    rateCents: CURRENT_USER.rateCents,
    timekeeper: CURRENT_USER.short,
    date,
  });
  const start = () => {
    useTimerStore
      .getState()
      .start(matterId, matter?.title ?? '', narrative.trim() || 'Fact investigation');
    close();
    notify(`Timer running on ${matter?.title ?? 'matter'}`);
  };
  const submit = (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setError('');
    try {
      if (!matter) throw new Error('Choose a matter.');
      if (kind === 'Start timer') {
        if (timerId && timerId !== matterId) {
          confirm({
            title: 'Save the current timer and switch?',
            text: `${timerTitle} has ${hoursMinutes(Math.max(1, Math.ceil(seconds / 60)))} of tracked time. Save it before starting on ${matter.short}.`,
            cta: 'Save and switch',
            onConfirm: () => {
              const timer = useTimerStore.getState();
              if (timer.matterId)
                writes.logTime({
                  matterId: timer.matterId,
                  minutes: Math.max(1, Math.ceil(elapsedMs(timer) / 60000)),
                  narrative: timer.activity || 'Tracked work',
                  code: 'L110',
                  billable: true,
                  rateCents: CURRENT_USER.rateCents,
                  timekeeper: CURRENT_USER.short,
                });
              start();
            },
          });
          return;
        }
        if (timerId === matterId) {
          if (timerPaused) {
            useTimerStore.getState().resume();
            notify(`Timer running on ${matter.title}`);
          }
          close();
          return;
        }
        start();
        return;
      }
      let undo: () => void;
      if (kind === 'Log time') {
        undo = writes.logTime(time());
        if (prefill.fromTimer) useTimerStore.getState().stop();
      } else if (kind === 'Expense')
        undo = writes.createExpense({
          matterId,
          date,
          description: other,
          amountCents: Math.round(Number(amount) * 100),
          billable,
        });
      else if (kind === 'Task')
        undo = writes.createTask({ matterId, title: other, dueAt: date, assignee });
      else
        undo = writes.createNote({
          matterId,
          date,
          text: other,
          audioUrl: kind === 'Voice memo' ? voice.audioUrl || undefined : undefined,
          visibleToClient: kind === 'Note' && visible,
        });
      if (kind === 'Voice memo' && voice.audioUrl) {
        voice.retain();
        const undoNote = undo;
        const savedUrl = voice.audioUrl;
        undo = () => {
          undoNote();
          URL.revokeObjectURL(savedUrl);
        };
      }
      close();
      notify(
        `${kind === 'Log time' ? `Logged ${hours.toFixed(1)}h` : `${kind} saved`} to ${matter.title}`,
        'Undo',
        undo,
      );
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : 'Could not save. Try again.');
    }
  };
  return (
    <Modal drawer title="Capture" onClose={close}>
      <form className="app-capture-form" onSubmit={submit}>
        <div className="app-modal__body cl-stack cl-stack--lg">
          <div className="cl-capture">
            {KINDS.map((k) => (
              <button
                key={k.kind}
                type="button"
                className="cl-capture__item"
                aria-pressed={kind === k.kind}
                disabled={voice.recording || voice.pending}
                onClick={() => {
                  setKind(k.kind);
                  setError('');
                }}
                style={{
                  borderColor: kind === k.kind ? 'var(--accent)' : 'var(--hairline)',
                  background: kind === k.kind ? 'var(--accent-tint)' : 'var(--surface)',
                }}
              >
                <IconWell name={k.icon} tone={kind === k.kind ? 'accent' : 'neutral'} />
                {k.kind}
              </button>
            ))}
          </div>
          {error ? <Banner tone="danger" title={error} role="alert" /> : null}
          <Field label="Matter">
            <NativeSelect
              label="Matter"
              value={matterId}
              onChange={setMatterId}
              icon="briefcase"
              options={(matters.data ?? []).map((m) => ({ value: m.id, label: m.title }))}
            />
          </Field>
          {kind === 'Start timer' ? (
            <>
              <TimerHero
                time={timerId ? clock(seconds) : '00:00:00'}
                caption={timerId ? timerTitle : 'Choose a matter to start'}
              />
              <Field label="Activity">
                <Input
                  aria-label="Activity"
                  value={narrative}
                  onChange={(e) => setNarrative(e.target.value)}
                  placeholder="What are you working on?"
                />
              </Field>
            </>
          ) : (
            <>
              <FormRow>
                {kind === 'Log time' ? (
                  <Field label="Duration">
                    <Stepper
                      className="app-duration-stepper"
                      value={`${hoursMinutes(minutes)} · ${hours.toFixed(1)}h`}
                      onDecrement={() => setMinutes((m) => Math.max(6, m - 6))}
                      onIncrement={() => setMinutes((m) => m + 6)}
                    />
                  </Field>
                ) : kind === 'Expense' ? (
                  <Field label="Amount">
                    <Input
                      aria-label="Amount"
                      type="number"
                      min="0.01"
                      step="0.01"
                      required
                      value={amount}
                      onChange={(e) => setAmount(e.target.value)}
                      prefix="$"
                    />
                  </Field>
                ) : null}
                <Field label={kind === 'Task' ? 'Due date' : 'Date'}>
                  <Input
                    aria-label={kind === 'Task' ? 'Due date' : 'Date'}
                    type="date"
                    value={date}
                    onChange={(e) => setDate(e.target.value)}
                    required
                  />
                </Field>
              </FormRow>
              {kind === 'Log time' ? (
                <>
                  <FormRow>
                    <Field label="Code">
                      <NativeSelect
                        label="UTBMS code"
                        value={code}
                        onChange={setCode}
                        code={code}
                        display={CODES[code]}
                        options={Object.entries(CODES).map(([value, label]) => ({
                          value,
                          label: `${value} · ${label}`,
                        }))}
                      />
                    </Field>
                    <Field label="Rate">
                      <Input
                        aria-label="Rate"
                        prefix="$"
                        value={(CURRENT_USER.rateCents / 100).toFixed(2)}
                        readOnly
                        style={{ fontVariantNumeric: 'tabular-nums' }}
                      />
                    </Field>
                  </FormRow>
                  <Field label="Narrative">
                    <Textarea
                      aria-label="Narrative"
                      required
                      value={narrative}
                      onChange={(e) => setNarrative(e.target.value)}
                      placeholder="What did you do?"
                    />
                  </Field>
                  {settings.data?.aiEnabled && narrative.trim() && !aiDismissed ? (
                    <AiSuggestion
                      label="AI cleanup · suggested"
                      text={
                        narrative.trim().replace(/^./, (c) => c.toUpperCase()) +
                        (/[.!?]$/.test(narrative.trim()) ? '' : '.')
                      }
                      actions={[
                        {
                          label: 'Use this',
                          onClick: () => {
                            setNarrative(
                              narrative.trim().replace(/^./, (c) => c.toUpperCase()) +
                                (/[.!?]$/.test(narrative.trim()) ? '' : '.'),
                            );
                            setAiDismissed(true);
                          },
                        },
                        { label: 'Keep mine', quiet: true, onClick: () => setAiDismissed(true) },
                      ]}
                    />
                  ) : null}
                </>
              ) : (
                <>
                  {kind === 'Voice memo' ? (
                    <div className="cl-stack cl-stack--sm">
                      <Button
                        icon={voice.recording ? 'stop' : 'mic'}
                        disabled={voice.pending}
                        onClick={() => (voice.recording ? voice.stop() : void voice.start())}
                      >
                        {voice.pending
                          ? 'Opening microphone…'
                          : voice.recording
                            ? 'Stop recording'
                            : voice.audioUrl
                              ? 'Record again'
                              : 'Record voice memo'}
                      </Button>
                      {voice.recording ? (
                        <span role="status" className="cl-t-caption">
                          Recording… stop to review your memo.
                        </span>
                      ) : null}
                      {voice.audioUrl ? (
                        <audio
                          controls
                          src={voice.audioUrl}
                          aria-label="Review voice memo"
                          style={{ maxWidth: '100%' }}
                        />
                      ) : null}
                      {voice.error ? (
                        <Banner tone="danger" title={voice.error} role="alert" />
                      ) : null}
                    </div>
                  ) : null}
                  <Field label={OTHER_FIELD[kind]?.label ?? 'Note'}>
                    <Textarea
                      aria-label={OTHER_FIELD[kind]?.label ?? 'Note'}
                      required={kind !== 'Voice memo' || !voice.audioUrl}
                      value={other}
                      onChange={(e) => setOther(e.target.value)}
                      placeholder={
                        kind === 'Voice memo' && voice.recording
                          ? 'Recording… stop to review the memo.'
                          : (OTHER_FIELD[kind]?.placeholder ?? 'Add the details…')
                      }
                    />
                  </Field>
                </>
              )}
              {kind === 'Task' ? (
                <Field label="Assigned to">
                  <NativeSelect
                    label="Assigned to"
                    value={assignee}
                    onChange={setAssignee}
                    options={(people.data ?? []).map((p) => ({ value: p.short, label: p.name }))}
                  />
                </Field>
              ) : null}
              {kind === 'Log time' || kind === 'Expense' ? (
                <div className="cl-option">
                  <span className="cl-t-body-sm">Billable</span>
                  <span
                    className="cl-t-caption cl-muted"
                    style={{ marginLeft: 'auto', marginRight: 10 }}
                  >
                    {kind === 'Log time'
                      ? billable
                        ? `${money(amountCents)} at ${moneyShort(CURRENT_USER.rateCents)}/h`
                        : 'No charge'
                      : ''}
                  </span>
                  <Switch checked={billable} onChange={setBillable} label="Billable" />
                </div>
              ) : null}
              {kind === 'Note' ? (
                <div className="cl-option">
                  <span>Visible to client</span>
                  <Switch checked={visible} onChange={setVisible} label="Visible to client" />
                </div>
              ) : null}
              {kind === 'Voice memo' && other.trim() ? (
                <Button
                  onClick={() => {
                    setNarrative(other);
                    setKind('Log time');
                  }}
                >
                  Use transcript to log time
                </Button>
              ) : null}
            </>
          )}
        </div>
        <div className="app-modal__footer">
          <Button
            variant="primary"
            size="lg"
            block
            type="submit"
            disabled={voice.recording || voice.pending}
          >
            {kind === 'Log time'
              ? `Log ${hours.toFixed(1)}h · ${billable ? money(amountCents) : 'no charge'}`
              : kind === 'Start timer'
                ? timerId === matterId
                  ? timerPaused
                    ? 'Resume timer'
                    : 'Timer is running'
                  : 'Start timer'
                : `Save ${kind.toLowerCase()}`}
          </Button>
        </div>
      </form>
    </Modal>
  );
}
