import { useEffect, useRef, useState, type ReactNode } from 'react';
import { Pressable, ScrollView, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import {
  AiSuggestion,
  Amount,
  Avatar,
  Banner,
  Button,
  CaptureButton,
  CaptureGrid,
  Card,
  Checkbox,
  Chip,
  ChipGroup,
  Dialog,
  Divider,
  Dot,
  EmptyState,
  Field,
  Icon,
  IconButton,
  IconWell,
  Input,
  KeyValue,
  KpiRow,
  KpiTile,
  List,
  ListRow,
  Mono,
  NavBar,
  OptionRow,
  Pill,
  Radio,
  ScreenHeader,
  SectionHeader,
  SegmentedControl,
  Select,
  StageTracker,
  Stepper,
  Switch,
  Text,
  TimeBlock,
  Timeline,
  TimerBar,
  TimerHero,
  Toast,
} from '@/components/ui';
import type { IconName } from '@/components/ui/icons';
import { hasPersistedTimer, useTimerSeconds, useTimerStore } from '@/features/time/timerStore';
import { h1Preview } from '@/lib/h1Preview';
import { useThemeStore } from '@/theme/store';
import {
  CONTACTS,
  DEMO_TIMER,
  INVOICES,
  MATTERS,
  MATTER_ORDER,
  clock,
  duration,
  isMatterId,
  money,
  roundedHours,
  type MatterId,
} from './data';

type Screen =
  | 'today'
  | 'matters'
  | 'matter'
  | 'calendar'
  | 'billing'
  | 'invoice'
  | 'contacts'
  | 'contact'
  | 'settings';
type SheetName =
  | 'capture'
  | 'timer'
  | 'voice'
  | 'logtime'
  | 'expense'
  | 'task'
  | 'note'
  | 'record'
  | 'plan'
  | 'newmatter';
type ReviewId = 'call' | 'board' | 'memo';
type LogTime = {
  matterId: MatterId;
  minutes: number;
  narrative: string;
  source?: ReviewId | 'timer';
  ai: boolean;
  billable: boolean;
};
type ToastState = { message: string; action?: string; onAction?: () => void };

const reviewPresets: Record<ReviewId, LogTime> = {
  call: {
    matterId: 'alvarez',
    minutes: 12,
    narrative: 'call w/ Sofia re: IME scheduling, next steps on discovery',
    source: 'call',
    ai: false,
    billable: true,
  },
  board: {
    matterId: 'kessler',
    minutes: 60,
    narrative: 'kessler board sync - series B diligence status, warranties',
    source: 'board',
    ai: false,
    billable: true,
  },
  memo: {
    matterId: 'bennett',
    minutes: 18,
    narrative: 'Bennett, point three, reviewed appraiser report, reconciled schedule B',
    source: 'memo',
    ai: false,
    billable: true,
  },
};
const cleanedNarrative: Record<ReviewId | 'timer', string> = {
  call: 'Telephone conference with client regarding IME scheduling and next steps in discovery.',
  board: 'Attended Kessler board sync regarding Series B diligence status and warranty provisions.',
  memo: 'Reviewed appraiser’s report; reconciled Inventory Schedule B to appraised values.',
  timer:
    'Drafted Inventory and Appraisal Schedules A and B; reconciled asset values with appraiser’s report.',
};

function H1Sheet({
  title,
  subtitle,
  children,
  onClose,
}: {
  title: string;
  subtitle?: string;
  children: ReactNode;
  onClose: () => void;
}) {
  return (
    <View className="absolute inset-0 z-50 justify-end">
      <Pressable
        accessibilityRole="button"
        accessibilityLabel="Close sheet"
        onPress={onClose}
        className="absolute inset-0 bg-black/45"
      />
      <View className="max-h-[88%] rounded-t-xl border-t border-hairline bg-surface-3 shadow-lg">
        <View className="items-center pt-2.5">
          <View className="h-1 w-9 rounded-full bg-border-strong" />
        </View>
        <View className="flex-row items-start justify-between px-5 pb-3 pt-3">
          <View className="flex-1">
            <Text variant="title-2">{title}</Text>
            {subtitle ? (
              <Text variant="label" tone="muted" className="mt-1">
                {subtitle}
              </Text>
            ) : null}
          </View>
          <IconButton icon="x" label="Close" plain size="sm" onPress={onClose} />
        </View>
        <ScrollView
          keyboardShouldPersistTaps="handled"
          contentContainerClassName="gap-4 px-5 pb-8"
          showsVerticalScrollIndicator={false}
        >
          {children}
        </ScrollView>
      </View>
    </View>
  );
}

export default function H1App({
  initialScreen = 'today',
  initialMatterId = 'bennett',
  initialInvoiceId = '078',
  initialContactId = 'bennett',
}: {
  initialScreen?: Screen;
  initialMatterId?: MatterId;
  initialInvoiceId?: string;
  initialContactId?: string;
}) {
  const [screen, setScreen] = useState<Screen>(initialScreen);
  const [sheet, setSheet] = useState<SheetName | null>(null);
  const [dialog, setDialog] = useState<'text' | 'stop' | null>(null);
  const [toast, setToast] = useState<ToastState | null>(null);
  const [review, setReview] = useState<ReviewId[]>(['call', 'board', 'memo']);
  const [billedMinutes, setBilledMinutes] = useState(204);
  const [paymentCents, setPaymentCents] = useState(0);
  const [lastPaymentMethod, setLastPaymentMethod] = useState('ACH');
  const [linkTexted, setLinkTexted] = useState(false);
  const [selectedInvoiceId, setSelectedInvoiceId] = useState(initialInvoiceId);
  const [matterId, setMatterId] = useState<MatterId>(initialMatterId);
  const [matterTab, setMatterTab] = useState('overview');
  const [billingTab, setBillingTab] = useState('invoices');
  const [calendarTab, setCalendarTab] = useState('agenda');
  const [contactId, setContactId] = useState(initialContactId);
  const [matterFilter, setMatterFilter] = useState('All');
  const [matterQuery, setMatterQuery] = useState('');
  const [contactFilter, setContactFilter] = useState('All');
  const [contactQuery, setContactQuery] = useState('');
  const [offline, setOffline] = useState(false);
  const [logTime, setLogTime] = useState<LogTime>(reviewPresets.call);
  const [recordMethod, setRecordMethod] = useState('ach');
  const [planCount, setPlanCount] = useState(4);
  const [playbook, setPlaybook] = useState('probate');
  const [billToClient, setBillToClient] = useState(true);
  const [visibleToClient, setVisibleToClient] = useState(false);
  const [remindTask, setRemindTask] = useState(true);
  const [autoCharge, setAutoCharge] = useState(true);
  const [pauseFees, setPauseFees] = useState(true);
  const [expenseAmount, setExpenseAmount] = useState('435.00');
  const [expenseDescription, setExpenseDescription] = useState(
    'Probate court filing fee · Inventory',
  );
  const [taskTitle, setTaskTitle] = useState('Confirm appraiser invoice for disbursement');
  const [noteText, setNoteText] = useState(
    'Margaret wants the appraiser’s summary before Friday’s filing.',
  );
  const [recordAmount, setRecordAmount] = useState('8,125.00');
  const [newClient, setNewClient] = useState('Priya Raman');
  const [newMatterName, setNewMatterName] = useState('Estate of Vikram Raman');
  const [biometric, setBiometric] = useState(true);
  const [autoLock, setAutoLock] = useState(true);
  const [notifications, setNotifications] = useState(true);
  const [taskDone, setTaskDone] = useState<Record<string, boolean>>({});
  const [narrative, setNarrative] = useState(logTime.narrative);
  const preference = useThemeStore((s) => s.preference);
  const setPreference = useThemeStore((s) => s.setPreference);
  const toastTimeout = useRef<ReturnType<typeof setTimeout> | null>(null);
  const paymentTimeout = useRef<ReturnType<typeof setTimeout> | null>(null);
  const invoicePaid = paymentCents >= 812500;
  const partiallyPaid = paymentCents > 0 && !invoicePaid;
  const balanceCents = Math.max(0, 812500 - paymentCents);

  const timerMatterId = useTimerStore((s) => s.matterId);
  const timerActivity = useTimerStore((s) => s.activity);
  const timerPaused = useTimerStore((s) => s.matterId !== null && s.startedAt === null);
  const beginTimer = useTimerStore((s) => s.start);
  const pauseTimer = useTimerStore((s) => s.pause);
  const resumeTimer = useTimerStore((s) => s.resume);
  const clearTimer = useTimerStore((s) => s.stop);
  const timerSeconds = useTimerSeconds();
  const timerMatter = isMatterId(timerMatterId) ? MATTERS[timerMatterId] : null;

  // The prototype opens with a timer already running; seed it once per device, preview builds only.
  useEffect(() => {
    if (!h1Preview || hasPersistedTimer()) return;
    beginTimer(
      DEMO_TIMER.matterId,
      MATTERS[DEMO_TIMER.matterId].title,
      DEMO_TIMER.activity,
      DEMO_TIMER.elapsedSeconds * 1000,
    );
  }, [beginTimer]);
  useEffect(
    () => () => {
      if (toastTimeout.current) clearTimeout(toastTimeout.current);
      if (paymentTimeout.current) clearTimeout(paymentTimeout.current);
    },
    [],
  );

  const notify = (message: string, action?: string, onAction?: () => void) => {
    if (toastTimeout.current) clearTimeout(toastTimeout.current);
    setToast({ message, action, onAction });
    toastTimeout.current = setTimeout(() => setToast(null), 3200);
  };
  const go = (next: Screen) => {
    setScreen(next);
    setSheet(null);
    setDialog(null);
  };
  const openInvoice = (id: string) => {
    setSelectedInvoiceId(id);
    go('invoice');
  };
  const openMatter = (id: MatterId) => {
    setMatterId(id);
    setMatterTab('overview');
    go('matter');
  };
  const startTimer = (id: MatterId) => {
    beginTimer(id, MATTERS[id].title, 'Fact investigation');
    setSheet(null);
    notify(`Timer started · ${MATTERS[id].short}`);
  };
  const openLogTime = (entry: LogTime) => {
    setLogTime(entry);
    setNarrative(entry.narrative);
    setSheet('logtime');
  };
  const billReview = (id: ReviewId) => openLogTime(reviewPresets[id]);
  const stopTimer = () => {
    setDialog(null);
    const stoppedMatterId = isMatterId(timerMatterId) ? timerMatterId : matterId;
    const elapsedMinutes = Math.round(clearTimer() / 60000);
    openLogTime({
      matterId: stoppedMatterId,
      minutes: Math.max(6, elapsedMinutes),
      narrative: 'drafted inventory schedules A and B, reconciled w/ appraiser numbers',
      source: 'timer',
      ai: false,
      billable: true,
    });
  };
  const saveTime = () => {
    const hours = roundedHours(logTime.minutes);
    const previousReview = review;
    const previousBilled = billedMinutes;
    if (logTime.source && logTime.source !== 'timer')
      setReview((items) => items.filter((item) => item !== logTime.source));
    if (logTime.billable) setBilledMinutes((minutes) => minutes + Math.round(hours * 60));
    setSheet(null);
    notify(
      `Time entry saved · ${hours.toFixed(1)}h to ${MATTERS[logTime.matterId].short}`,
      'Undo',
      () => {
        setReview(previousReview);
        setBilledMinutes(previousBilled);
        notify('Time entry undone');
      },
    );
  };
  const markPaid = (method = 'ACH', amountCents = balanceCents) => {
    if (!Number.isFinite(amountCents) || amountCents <= 0 || amountCents > balanceCents) {
      notify(`Enter an amount between $0.01 and ${money(balanceCents)}`);
      return;
    }
    if (paymentTimeout.current) clearTimeout(paymentTimeout.current);
    setPaymentCents((current) => current + amountCents);
    setLastPaymentMethod(method);
    setSheet(null);
    setDialog(null);
    setScreen('invoice');
    notify(`Payment received · ${money(amountCents)} by ${method}`);
  };
  const sendPayLink = () => {
    setLinkTexted(true);
    setDialog(null);
    notify('Pay link texted to Margaret Bennett · (415) 555-0177');
    paymentTimeout.current = setTimeout(() => markPaid('ACH', balanceCents), 6000);
  };
  const selectCapture = (key: string) => {
    if (key === 'time')
      openLogTime({ matterId, minutes: 6, narrative: '', ai: false, billable: true });
    else
      setSheet(
        key === 'timer' || key === 'voice' || key === 'expense' || key === 'task' || key === 'note'
          ? key
          : 'capture',
      );
  };
  const offlineBanner = offline ? (
    <Banner
      tone="info"
      icon="wifi-off"
      compact
      title="Offline · changes will sync"
      trailing={<Pill tone="info">2 queued</Pill>}
      className="mt-3"
    />
  ) : null;

  const activeTab =
    screen === 'today' || screen === 'settings'
      ? 'today'
      : screen === 'matters' || screen === 'matter' || screen === 'contacts' || screen === 'contact'
        ? 'matters'
        : screen === 'calendar'
          ? 'calendar'
          : 'billing';
  const isDetail = ['matter', 'invoice', 'contact', 'settings', 'contacts'].includes(screen);

  const tab = (
    name: 'today' | 'matters' | 'calendar' | 'billing',
    icon: IconName,
    label: string,
  ) => (
    <Pressable
      key={name}
      accessibilityRole="tab"
      accessibilityState={{ selected: activeTab === name }}
      onPress={() => go(name)}
      className="min-h-11 flex-1 items-center justify-center gap-0.5"
    >
      <Icon
        name={icon}
        size="md"
        tone={activeTab === name ? 'accent' : 'ink-3'}
        filled={activeTab === name}
      />
      <Text variant="caption" weight="semibold" tone={activeTab === name ? 'accent' : 'faint'}>
        {label}
      </Text>
    </Pressable>
  );

  const bottom = (
    <View className="border-t border-hairline bg-surface px-2 pb-1">
      <View className="h-16 flex-row items-center">
        {tab('today', 'home', 'Today')}
        {tab('matters', 'briefcase', 'Matters')}
        <View className="w-[68px] items-center justify-center">
          <CaptureButton onPress={() => setSheet('capture')} />
        </View>
        {tab('calendar', 'calendar', 'Calendar')}
        {tab('billing', 'receipt', 'Billing')}
      </View>
    </View>
  );

  const invoiceRow = (id: string) => {
    const invoice = INVOICES.find((item) => item.id === id);
    if (!invoice) return null;
    const status =
      id === '078' && invoicePaid
        ? 'paid'
        : id === '078' && partiallyPaid
          ? 'partial'
          : invoice.status;
    const statusLabel =
      id === '078' && invoicePaid
        ? 'Paid today'
        : id === '078' && partiallyPaid
          ? `Partial · ${money(balanceCents)} due`
          : invoice.statusLabel;
    const tone =
      status === 'overdue'
        ? 'danger'
        : status === 'partial'
          ? 'warning'
          : status === 'paid'
            ? 'success'
            : status === 'sent'
              ? 'info'
              : 'neutral';
    return (
      <ListRow
        key={id}
        title={invoice.client}
        subtitle={`${invoice.number} · ${invoice.matter}`}
        value={money(invoice.totalCents)}
        pill={
          <Pill tone={tone} dot={status === 'overdue' || status === 'partial' || status === 'paid'}>
            {statusLabel}
          </Pill>
        }
        onPress={() => openInvoice(id)}
      />
    );
  };

  const today = () => (
    <>
      <ScreenHeader
        eyebrow="Monday, September 29"
        title="Good morning, Dana."
        actions={
          <>
            <IconButton
              icon="inbox"
              label="Inbox"
              badge={3}
              onPress={() => notify('Inbox · 3 new items')}
            />
            <Pressable
              accessibilityRole="button"
              accessibilityLabel="Settings"
              onPress={() => go('settings')}
            >
              <Avatar tone="accent" initials="DO" />
            </Pressable>
          </>
        }
      />
      {offlineBanner}
      <KpiRow className="mt-4">
        <KpiTile
          tint
          label="Billed today"
          value={(billedMinutes / 60).toFixed(1)}
          unit="of 6h"
          progress={Math.min(100, Math.round((billedMinutes / 360) * 100))}
        />
        <KpiTile
          label="Unbilled"
          value="$17,325"
          delta="Review & bill →"
          onPress={() => {
            setBillingTab('unbilled');
            go('billing');
          }}
        />
      </KpiRow>
      <SectionHeader title="Review your day" count={review.length || undefined} />
      {review.length ? (
        <List>
          {review.includes('call') ? (
            <ListRow
              lead={<IconWell name="phone" />}
              regular
              title="Call · Sofia Alvarez · 12 min"
              subtitle="Alvarez v. Meridian · 10:12 AM"
              trail={
                <>
                  <Button variant="primary" size="sm" onPress={() => billReview('call')}>
                    Bill 0.2h
                  </Button>
                  <Button
                    variant="ghost"
                    size="sm"
                    onPress={() => setReview((items) => items.filter((item) => item !== 'call'))}
                  >
                    Skip
                  </Button>
                </>
              }
            />
          ) : null}
          {review.includes('board') ? (
            <ListRow
              lead={<IconWell name="calendar" />}
              regular
              title="Kessler board sync · 1h"
              subtitle="Kessler — Series B · 2:00 PM"
              trail={
                <>
                  <Button variant="primary" size="sm" onPress={() => billReview('board')}>
                    Bill 1.0h
                  </Button>
                  <Button
                    variant="ghost"
                    size="sm"
                    onPress={() => setReview((items) => items.filter((item) => item !== 'board'))}
                  >
                    Skip
                  </Button>
                </>
              }
            />
          ) : null}
          {review.includes('memo') ? (
            <ListRow
              lead={<IconWell name="mic" />}
              regular
              title="Voice memo · Bennett, point three…"
              subtitle="Transcribed · 0.3h suggested"
              trail={
                <Button size="sm" onPress={() => setSheet('voice')}>
                  Review
                </Button>
              }
            />
          ) : null}
        </List>
      ) : (
        <List>
          <EmptyState
            icon="clock"
            title="Nothing to review"
            text="Calls, meetings and voice memos you haven’t billed will show up here."
          />
        </List>
      )}
      <SectionHeader title="Today" action="Calendar" onAction={() => go('calendar')} />
      <List>
        <ListRow
          lead={<TimeBlock main="9:30" sub="AM" />}
          title="Pretrial conference"
          subtitle="People v. Webb · Dept. 22"
          pill={
            <Pill tone="info" icon="gavel">
              Court
            </Pill>
          }
          onPress={() => openMatter('webb')}
        />
        <ListRow
          lead={<TimeBlock main="2:00" sub="PM" />}
          title="Kessler board sync"
          subtitle="Zoom"
          pill={<Pill>Meeting</Pill>}
        />
        <ListRow
          lead={<TimeBlock main="Fri" sub="Oct 3" />}
          title="Inventory filing due"
          subtitle="Estate of Bennett"
          pill={
            <Pill tone="warning" dot>
              4 days
            </Pill>
          }
          onPress={() => openMatter('bennett')}
        />
      </List>
      <SectionHeader
        title="Who to nudge"
        action="All AR"
        onAction={() => {
          setBillingTab('invoices');
          go('billing');
        }}
      />
      {invoicePaid ? (
        <List>
          <EmptyState
            icon="check"
            title="Nobody to nudge"
            text="Every sent invoice is inside its terms."
          />
        </List>
      ) : (
        <List>
          <ListRow
            lead={<Avatar name="Margaret Bennett" />}
            title="Margaret Bennett"
            subtitle={`INV-2026-078 · link ${linkTexted ? 'texted' : 'opened'}`}
            value={money(balanceCents)}
            meta="46 days late"
            metaTone="danger"
            onPress={() => openInvoice('078')}
          />
        </List>
      )}
    </>
  );

  const matterRow = (id: MatterId) => {
    const matter = MATTERS[id];
    return (
      <ListRow
        key={id}
        title={matter.title}
        subtitle={`${matter.client} · ${matter.area} · ${matter.number}`}
        pill={
          <Pill tone={matter.attentionTone ?? 'accent'} dot={!!matter.attention}>
            {matter.attention ?? matter.stage}
          </Pill>
        }
        meta={matter.meta}
        metaTone={matter.attentionTone ?? 'neutral'}
        onPress={() => openMatter(id)}
        onLongPress={() => {
          setMatterId(id);
          setSheet('capture');
        }}
      />
    );
  };

  const matters = () => {
    const matches = (id: MatterId) => {
      const matter = MATTERS[id];
      const q = matterQuery.trim().toLowerCase();
      return (
        (!q || `${matter.title} ${matter.client} ${matter.number}`.toLowerCase().includes(q)) &&
        (matterFilter === 'All' ||
          (matterFilter === 'Open' && matter.status === 'Open') ||
          (matterFilter === 'Pending' && matter.status === 'Pending') ||
          (matterFilter === 'Mine' && matter.attorney === 'D. Okafor') ||
          (matterFilter === 'Closed' && false))
      );
    };
    return (
      <>
        <ScreenHeader
          title="Matters"
          actions={
            <>
              <IconButton icon="users" label="Contacts" onPress={() => go('contacts')} />
              <IconButton icon="plus" label="New matter" onPress={() => setSheet('newmatter')} />
            </>
          }
        />
        {offlineBanner}
        <View className="mt-3">
          <Input
            search
            icon="search"
            placeholder="Search by name, client or number"
            value={matterQuery}
            onChangeText={setMatterQuery}
          />
        </View>
        <View className="mt-2.5">
          <ChipGroup>
            {['All', 'Mine', 'Open', 'Pending', 'Closed'].map((filter) => (
              <Chip
                key={filter}
                active={matterFilter === filter}
                count={filter === 'All' ? 12 : filter === 'Mine' ? 5 : undefined}
                onPress={() => setMatterFilter(filter)}
              >
                {filter}
              </Chip>
            ))}
          </ChipGroup>
        </View>
        {(['bennett', 'webb'] as MatterId[]).some(matches) ? (
          <>
            <SectionHeader title="Needs attention" count={2} />
            <List>{(['bennett', 'webb'] as MatterId[]).filter(matches).map(matterRow)}</List>
          </>
        ) : null}
        <SectionHeader
          title="Active"
          count={7}
          action="Sort · Recent"
          onAction={() => notify('Sorted by most recent activity')}
        />
        <List>
          {(['alvarez', 'kessler', 'delgado', 'okonkwo'] as MatterId[])
            .filter(matches)
            .map(matterRow)}
          {matterFilter === 'All' || matterFilter === 'Closed' ? (
            <ListRow
              title="Nguyen v. Cascade Property Mgmt"
              subtitle="Thanh Nguyen · Landlord/tenant · 2025-0388"
              pill={<Pill>Closed</Pill>}
              meta="Paid Jul 18"
            />
          ) : null}
        </List>
      </>
    );
  };

  const taskRows = (id: MatterId) =>
    MATTERS[id].tasks.map((task) => {
      const key = `${id}:${task.title}`;
      const done = !!taskDone[key];
      return (
        <ListRow
          key={key}
          lead={
            <Checkbox
              checked={done}
              label={task.title}
              onChange={(checked) => setTaskDone((items) => ({ ...items, [key]: checked }))}
            />
          }
          regular
          done={done}
          title={task.title}
          subtitle={task.who}
          meta={task.due}
          metaTone={task.tone ?? 'neutral'}
        />
      );
    });
  const timeRows = (id: MatterId) =>
    MATTERS[id].time.map((entry) => (
      <ListRow
        key={`${id}:${entry.title}`}
        lead={<TimeBlock main={entry.duration} sub={entry.date} />}
        regular
        title={entry.title}
        subtitle={entry.code}
        value={entry.amountCents === undefined ? '—' : money(entry.amountCents)}
        pill={
          <Pill tone={entry.noCharge ? 'neutral' : 'success'}>
            {entry.noCharge ? 'No charge' : 'Billable'}
          </Pill>
        }
      />
    ));

  const matterDetail = () => {
    const matter = MATTERS[matterId];
    return (
      <>
        <NavBar
          back="Matters"
          onBack={() => go('matters')}
          title={matter.number}
          mono
          actions={
            <>
              <IconButton
                plain
                icon="play"
                label="Start timer"
                onPress={() => startTimer(matterId)}
              />
              <IconButton
                plain
                icon="more"
                label="More"
                onPress={() => notify(`${matter.short} · more actions`)}
              />
            </>
          }
        />
        <Text variant="title-2" className="mt-1">
          {matter.title}
        </Text>
        <Text variant="label" tone="muted" className="mt-1">
          {matter.client} · {matter.area} · {matter.attorney}
        </Text>
        <View className="mt-2 flex-row flex-wrap gap-1.5">
          <Pill tone={matter.status === 'Pending' ? 'warning' : 'accent'}>{matter.status}</Pill>
          <Pill tone="outline">{matter.billing}</Pill>
          {matterId === 'bennett' ? (
            <Pill tone="outline" icon="shield">
              Walled
            </Pill>
          ) : null}
        </View>
        <StageTracker stages={matter.stages} className="mt-4" />
        <View className="mt-4">
          <SegmentedControl
            scroll
            value={matterTab}
            onChange={setMatterTab}
            items={[
              { value: 'overview', label: 'Overview' },
              { value: 'activity', label: 'Activity' },
              { value: 'tasks', label: 'Tasks', count: matter.tasks.length },
              { value: 'time', label: 'Time' },
              { value: 'docs', label: 'Docs' },
              { value: 'billing', label: 'Billing' },
            ]}
          />
        </View>
        {matterTab === 'overview' ? (
          <>
            {matter.deadline ? (
              <Banner
                className="mt-4"
                tone={matter.deadline.tone}
                icon={matterId === 'webb' ? 'gavel' : 'alert'}
                title={matter.deadline.title}
                text={matter.deadline.text}
                actions={
                  <>
                    <Button
                      variant="primary"
                      size="sm"
                      onPress={() =>
                        matterId === 'webb'
                          ? setSheet('note')
                          : notify(`${matter.deadline?.action} · ${matter.short}`)
                      }
                    >
                      {matter.deadline.action}
                    </Button>
                    <Button
                      variant="ghost"
                      size="sm"
                      onPress={() => notify(`Added to calendar · ${matter.deadline?.title}`)}
                    >
                      Add to calendar
                    </Button>
                  </>
                }
              />
            ) : null}
            <KpiRow className="mt-3">
              <KpiTile
                label="Unbilled"
                value={money(matter.unbilledCents).replace('.00', '')}
                delta={`${matter.hours}h · ${matter.entries} entries`}
              />
              <KpiTile
                label="Trust"
                value={money(matter.trustCents).replace('.00', '')}
                delta={matter.trustCents ? 'IOLTA ····4821' : 'No funds held'}
              />
            </KpiRow>
            <SectionHeader
              title="Open tasks"
              count={matter.tasks.length}
              action="Add"
              onAction={() => setSheet('task')}
            />
            <List>{taskRows(matterId)}</List>
            <SectionHeader
              title="Recent time"
              action={`All ${matter.entries}`}
              onAction={() => setMatterTab('time')}
            />
            <List>{timeRows(matterId).slice(0, 2)}</List>
          </>
        ) : null}
        {matterTab === 'activity' ? (
          <Timeline
            className="mt-4"
            events={
              matter.activity.length
                ? matter.activity
                : [
                    {
                      icon: 'clock',
                      title: 'No activity yet for this matter',
                      meta: 'New entries will appear here',
                    },
                  ]
            }
          />
        ) : null}
        {matterTab === 'tasks' ? (
          <>
            <SectionHeader
              title="Tasks"
              count={matter.tasks.length}
              action="Add"
              onAction={() => setSheet('task')}
            />
            <List>{taskRows(matterId)}</List>
          </>
        ) : null}
        {matterTab === 'time' ? (
          <>
            <SectionHeader
              title="Time"
              count={matter.entries}
              action="Log time"
              onAction={() =>
                openLogTime({ matterId, minutes: 6, narrative: '', ai: false, billable: true })
              }
            />
            <List
              footer={
                <>
                  <Text variant="label">Unbilled</Text>
                  <Amount cents={matter.unbilledCents} />
                </>
              }
            >
              {timeRows(matterId)}
            </List>
          </>
        ) : null}
        {matterTab === 'docs' ? (
          <>
            <SectionHeader title="Folders" />
            <List>
              {[
                ['Court filings', '4'],
                ['Correspondence', '11'],
                ['Client documents', '7'],
                ['Drafts', '3'],
              ].map(([name, count]) => (
                <ListRow
                  key={name}
                  lead={<IconWell name="folder" />}
                  title={name ?? ''}
                  meta={`${count} files`}
                  chevron
                  onPress={() => notify(`${name} opened`)}
                />
              ))}
            </List>
            <SectionHeader
              title="Recent"
              action="Upload"
              onAction={() => notify('Choose a document to upload')}
            />
            <List>
              <ListRow
                lead={<IconWell name="file" />}
                regular
                title="Inventory & Appraisal — Schedule A.pdf"
                subtitle="Draft · Sep 29"
                trail={
                  <Button
                    size="sm"
                    icon="link"
                    onPress={() => notify('Share link copied · expires in 7 days')}
                  >
                    Share
                  </Button>
                }
              />
              <ListRow
                lead={<IconWell name="file" />}
                regular
                title="Letters of administration.pdf"
                subtitle="Filed · Jun 3"
                trail={
                  <Button
                    size="sm"
                    icon="link"
                    onPress={() => notify('Share link copied · expires in 7 days')}
                  >
                    Share
                  </Button>
                }
              />
            </List>
          </>
        ) : null}
        {matterTab === 'billing' ? (
          <>
            <KpiRow className="mt-4">
              <KpiTile
                label="Unbilled"
                value={money(matter.unbilledCents).replace('.00', '')}
                delta={`${matter.hours}h since last invoice`}
              />
              <KpiTile
                label="Trust"
                value={money(matter.trustCents).replace('.00', '')}
                delta={matter.trustCents ? 'Reconciled Sep 1' : 'No funds held'}
              />
            </KpiRow>
            <SectionHeader title="Invoices" count={matter.invoices.length} />
            <List>
              {matter.invoices.length ? (
                matter.invoices.map(invoiceRow)
              ) : (
                <EmptyState
                  icon="receipt"
                  title="No invoices yet"
                  text="Invoices for this matter will show here."
                />
              )}
            </List>
            {matter.trustCents ? (
              <>
                <SectionHeader
                  title="Trust for this matter"
                  action="Ledger"
                  onAction={() => {
                    setBillingTab('trust');
                    go('billing');
                  }}
                />
                <List>
                  <ListRow
                    regular
                    title="Retainer received"
                    subtitle="Jun 3 · ACH"
                    value="$25,000.00"
                  />
                  <ListRow
                    regular
                    title="Applied to INV-2026-052"
                    subtitle="Jul 2"
                    value="−$6,760.00"
                  />
                </List>
              </>
            ) : null}
          </>
        ) : null}
      </>
    );
  };

  const agendaSection = (title: string, rows: ReactNode) => (
    <>
      <SectionHeader title={title} />
      <List>{rows}</List>
    </>
  );
  const calendar = () => {
    const dates = Array.from({ length: 35 }, (_, index) => {
      const day = index - 2;
      return day < 1 ? 30 + day : day > 31 ? day - 31 : day;
    });
    const monthDots: Record<number, 'warning' | 'danger' | 'info' | 'neutral'> = {
      1: 'danger',
      3: 'warning',
      9: 'neutral',
      11: 'neutral',
      24: 'neutral',
    };
    return (
      <>
        <ScreenHeader
          eyebrow="Monday, September 29"
          title="Calendar"
          actions={<IconButton icon="plus" label="Add event" onPress={() => notify('New event')} />}
        />
        {offlineBanner}
        <View className="mt-4">
          <SegmentedControl
            value={calendarTab}
            onChange={setCalendarTab}
            items={[
              { value: 'agenda', label: 'Agenda' },
              { value: 'month', label: 'Month' },
            ]}
          />
        </View>
        {calendarTab === 'agenda' ? (
          <>
            {agendaSection(
              'Today · Mon, Sep 29',
              <>
                <ListRow
                  lead={<TimeBlock main="9:30" sub="AM" />}
                  title="Pretrial conference"
                  subtitle="People v. Webb · Dept. 22"
                  pill={
                    <Pill tone="info" icon="gavel">
                      Court
                    </Pill>
                  }
                  onPress={() => openMatter('webb')}
                />
                <ListRow
                  lead={<TimeBlock main="2:00" sub="PM" />}
                  title="Kessler board sync"
                  subtitle="Zoom"
                  pill={<Pill>Meeting</Pill>}
                />
              </>,
            )}
            <Banner
              tone="danger"
              icon="alert"
              compact
              title="Two court events overlap Wed, Oct 1"
              trailing={<Icon name="chevron-right" />}
              className="mt-5"
            />
            {agendaSection(
              'Wed, Oct 1',
              <>
                <ListRow
                  lead={<TimeBlock main="10:00" sub="AM" />}
                  title="Deposition · Meridian safety officer"
                  subtitle="Alvarez v. Meridian · 2h"
                  pill={
                    <Pill tone="info" icon="gavel">
                      Court
                    </Pill>
                  }
                />
                <ListRow
                  lead={<TimeBlock main="10:30" sub="AM" />}
                  title="Motion hearing"
                  subtitle="People v. Webb · Dept. 22"
                  pill={
                    <Pill tone="danger" dot>
                      Conflict
                    </Pill>
                  }
                />
              </>,
            )}
            {agendaSection(
              'Fri, Oct 3',
              <ListRow
                lead={<TimeBlock main="5:00" sub="PM" />}
                title="Inventory filing due"
                subtitle="Estate of Bennett · Prob. Code §8800"
                pill={
                  <Pill tone="warning" dot>
                    4 days
                  </Pill>
                }
                onPress={() => openMatter('bennett')}
              />,
            )}
            {agendaSection(
              'Thu, Oct 9',
              <ListRow
                lead={<TimeBlock main="Due" />}
                title="INV-2026-092 due"
                subtitle="Kessler Holdings LLC · $25,000.00"
                pill={<Pill>Invoice</Pill>}
              />,
            )}
            {agendaSection(
              'Sat, Oct 11',
              <ListRow
                lead={<TimeBlock main="RFE" />}
                title="RFE response window closes"
                subtitle="Okonkwo I-130 petition"
                pill={<Pill>12 days</Pill>}
              />,
            )}
            {agendaSection(
              'Fri, Oct 24',
              <ListRow
                lead={<TimeBlock main="5:00" sub="PM" />}
                title="Discovery cutoff"
                subtitle="Alvarez v. Meridian · CCP §2024.020"
                pill={<Pill>25 days</Pill>}
              />,
            )}
          </>
        ) : (
          <>
            <View className="mt-5 flex-row items-center justify-between">
              <IconButton
                plain
                icon="chevron-left"
                label="Previous month"
                onPress={() => notify('September 2026')}
              />
              <Text variant="title-3">October 2026</Text>
              <IconButton
                plain
                icon="chevron-right"
                label="Next month"
                onPress={() => notify('November 2026')}
              />
            </View>
            <View className="mt-2 flex-row flex-wrap rounded-lg border border-hairline bg-surface p-2">
              {['M', 'T', 'W', 'T', 'F', 'S', 'S'].map((label, index) => (
                <View
                  key={`header-${index}`}
                  className="h-8 items-center justify-center"
                  style={{ width: '14.285%' }}
                >
                  <Text variant="overline" tone="muted">
                    {label}
                  </Text>
                </View>
              ))}
              {dates.map((date, index) => (
                <Pressable
                  key={`day-${index}`}
                  onPress={() => setCalendarTab('agenda')}
                  className="min-h-12 items-center gap-1 py-1.5"
                  style={{ width: '14.285%' }}
                >
                  <View
                    className={`h-7 w-7 items-center justify-center rounded-full ${index === 1 ? 'bg-accent' : ''}`}
                  >
                    <Text
                      variant="label"
                      tone={
                        index === 1 ? 'onAccent' : index < 3 || index > 33 ? 'faint' : 'default'
                      }
                    >
                      {date}
                    </Text>
                  </View>
                  {index === 1 ? (
                    <Dot tone="info" />
                  ) : monthDots[date ?? 0] && index >= 3 ? (
                    <Dot tone={monthDots[date ?? 0]} />
                  ) : null}
                </Pressable>
              ))}
            </View>
            <SectionHeader title="Deadline chains" />
            <List>
              <ListRow
                lead={<IconWell name="alert" tone="warning" />}
                title="Estate inventory filing"
                subtitle="Oct 3 · Probate Code §8800"
                pill={<Pill tone="warning">4 days</Pill>}
                onPress={() => openMatter('bennett')}
              />
              <ListRow
                lead={<IconWell name="alert" />}
                title="Discovery cutoff"
                subtitle="Oct 24 · CCP §2024.020"
                pill={<Pill>25 days</Pill>}
                onPress={() => openMatter('alvarez')}
              />
              <ListRow
                lead={<IconWell name="alert" />}
                title="RFE response window"
                subtitle="Oct 11 · Okonkwo I-130"
                pill={<Pill>12 days</Pill>}
                onPress={() => openMatter('okonkwo')}
              />
            </List>
          </>
        )}
      </>
    );
  };

  const billing = () => (
    <>
      <ScreenHeader
        title="Billing"
        actions={
          <IconButton
            icon="more"
            label="Billing actions"
            onPress={() => notify('Billing actions')}
          />
        }
      />
      {offlineBanner}
      <View className="mt-4">
        <SegmentedControl
          value={billingTab}
          onChange={setBillingTab}
          scroll
          items={[
            { value: 'unbilled', label: 'Unbilled' },
            { value: 'invoices', label: 'Invoices' },
            { value: 'payments', label: 'Payments' },
            { value: 'trust', label: 'Trust' },
          ]}
        />
      </View>
      {billingTab === 'invoices' ? (
        <>
          <KpiRow className="mt-4">
            <KpiTile
              label="Outstanding"
              value={money(3312500 - paymentCents, false)}
              delta={invoicePaid ? 'Nothing overdue' : `${money(balanceCents)} overdue`}
              deltaTone={invoicePaid ? 'up' : 'down'}
              deltaIcon={invoicePaid ? 'check' : 'alert'}
            />
            <KpiTile
              label="Collected · 30d"
              value={money(1245000 + paymentCents, false)}
              delta="↑ 18%"
              deltaTone="up"
            />
          </KpiRow>
          <Card
            tone="tint"
            title="Ready to bill"
            subtitle="3 matters · $17,325.00 unbilled · oldest 31 days"
            headerAction={
              <Button variant="primary" size="sm" onPress={() => setBillingTab('unbilled')}>
                Review
              </Button>
            }
            className="mt-4"
          />
          <SectionHeader title="Invoices" count={INVOICES.length} />
          <List>{INVOICES.map((item) => invoiceRow(item.id))}</List>
        </>
      ) : null}
      {billingTab === 'unbilled' ? (
        <>
          <KpiRow className="mt-4">
            <KpiTile tint label="Unbilled" value="$17,325" delta="3 matters ready to bill" />
            <KpiTile label="Written down" value="$162" delta="2 entries this month" />
          </KpiRow>
          <SectionHeader title="Estate of Harold Bennett" count={4} />
          <List
            footer={
              <>
                <Text variant="label">Bill</Text>
                <Amount cents={482500} />
              </>
            }
          >
            <ListRow
              lead={<TimeBlock main="1:36" sub="Sep 29" />}
              regular
              title="Draft inventory schedules"
              subtitle="L. Tran · L110"
              value="$520.00"
            />
            <ListRow
              lead={<TimeBlock main="0:30" sub="Sep 26" />}
              regular
              title="Call with appraiser re: valuation"
              subtitle="L. Tran · L120"
              value="$0.00"
              pill={
                <Pill tone="warning" dot>
                  Written down
                </Pill>
              }
            />
            <ListRow
              lead={<TimeBlock main="6:12" sub="Sep 19" />}
              regular
              title="Prepare Inventory & Appraisal"
              subtitle="L. Tran · L110"
              value="$2,015.00"
            />
            <ListRow
              lead={<TimeBlock main="7:00" sub="Sep 8" />}
              regular
              title="Creditor claim review"
              subtitle="D. Okafor · L120"
              value="$2,290.00"
            />
          </List>
          <SectionHeader title="Kessler Holdings — Series B" count={1} />
          <List
            footer={
              <>
                <Text variant="label">Bill</Text>
                <Amount cents={1250000} />
              </>
            }
          >
            <ListRow
              lead={<IconWell name="check" />}
              regular
              title="Milestone 2 of 3 · Diligence complete"
              subtitle="Flat fee · $37,500.00"
              value="$12,500.00"
            />
          </List>
          <Button
            variant="primary"
            size="lg"
            block
            className="mt-5"
            onPress={() => notify('3 draft invoices generated · $17,325.00')}
          >
            Generate 3 invoices · $17,325.00
          </Button>
        </>
      ) : null}
      {billingTab === 'payments' ? (
        <>
          <KpiRow className="mt-4">
            <KpiTile tint label="Collected · 30d" value={money(1245000 + paymentCents, false)} />
            <KpiTile label="Days to pay" value="19" unit="avg" />
          </KpiRow>
          <SectionHeader title="Recent payments" />
          <List>
            {paymentCents > 0 ? (
              <ListRow
                lead={<Avatar name="Margaret Bennett" />}
                title="Margaret Bennett"
                subtitle={`Today · ${lastPaymentMethod} · INV-2026-078`}
                value={money(paymentCents)}
                pill={
                  <Pill tone={invoicePaid ? 'success' : 'warning'}>
                    {invoicePaid ? 'Settled' : 'Partial'}
                  </Pill>
                }
                onPress={() => openInvoice('078')}
              />
            ) : null}
            <ListRow
              lead={<Avatar name="Thanh Nguyen" />}
              title="Thanh Nguyen"
              subtitle="Jul 18 · ACH · INV-2026-061"
              value="$4,450.00"
              pill={<Pill tone="success">Settled</Pill>}
            />
            <ListRow
              lead={<Avatar name="Elena Delgado" />}
              title="Elena Delgado"
              subtitle="Sep 20 · card · plan 2 of 4"
              value="$406.25"
              pill={<Pill tone="warning">Plan 2 of 4</Pill>}
            />
            <ListRow
              lead={<Avatar name="Marcus Webb" />}
              title="Marcus Webb"
              subtitle="Sep 12 · ACH"
              value="$3,000.00"
              pill={<Pill tone="success">Earned on receipt</Pill>}
            />
          </List>
        </>
      ) : null}
      {billingTab === 'trust' ? (
        <>
          <Card
            className="mt-4"
            title="IOLTA ····4821"
            subtitle="First Republic · 3-way reconciled Sep 1"
            headerLead={<IconWell name="lock" tone="success" />}
            headerAction={<Pill tone="success">Reconciled</Pill>}
          >
            <View className="mt-4 flex-row items-end justify-between">
              <View>
                <Amount cents={5124000} size="lg" />
                <Text variant="label" tone="muted">
                  Held for 4 clients
                </Text>
              </View>
              <Button size="sm" icon="download" onPress={() => notify('Trust audit pack prepared')}>
                Audit pack
              </Button>
            </View>
          </Card>
          <Banner
            className="mt-4"
            tone="warning"
            icon="alert"
            title="14-day notice · appraiser disbursement"
            text="Estate of Bennett · $1,850.00 · notice sent Sep 24 · disburse from Oct 8"
            actions={
              <Button size="sm" onPress={() => notify('Disbursement scheduled · Oct 8')}>
                Schedule disbursement
              </Button>
            }
          />
          <SectionHeader title="Balances by matter" />
          <List>
            <ListRow
              title="Estate of Harold Bennett"
              subtitle="Margaret Bennett · 2026-0187"
              value="$18,240.00"
              onPress={() => openMatter('bennett')}
            />
            <ListRow
              title="Kessler Holdings — Series B"
              subtitle="Retainer · 2026-0201"
              value="$18,240.00"
              meta="Applied Jul 2"
              onPress={() => openMatter('kessler')}
            />
            <ListRow
              title="In re Marriage of Delgado"
              subtitle="Plan deposits · 2026-0210"
              value="$3,250.00"
              pill={
                <Pill tone="warning" dot>
                  45-day timer · Oct 20
                </Pill>
              }
              onPress={() => openMatter('delgado')}
            />
            <ListRow
              title="Okonkwo I-130 petition"
              subtitle="Filing fees advanced · 2026-0214"
              value="$11,510.00"
              meta="Unreconciled 12 days"
              onPress={() => openMatter('okonkwo')}
            />
          </List>
          <SectionHeader title="Ledger" />
          <Timeline
            events={[
              {
                icon: 'download',
                strong: 'Notice sent',
                title: 'Appraiser disbursement · $1,850.00',
                meta: 'Sep 24 · Estate of Bennett',
              },
              {
                icon: 'dollar',
                strong: 'Retainer received',
                title: '$25,000.00 by ACH',
                meta: 'Jun 3 · Estate of Bennett',
              },
            ]}
          />
        </>
      ) : null}
    </>
  );

  const invoice = () => {
    const selected = INVOICES.find((item) => item.id === selectedInvoiceId) ?? INVOICES[0]!;
    if (selected.id !== '078') {
      const tone =
        selected.status === 'paid'
          ? 'success'
          : selected.status === 'partial'
            ? 'warning'
            : selected.status === 'sent'
              ? 'info'
              : 'neutral';
      return (
        <>
          <NavBar
            back="Billing"
            onBack={() => {
              setBillingTab('invoices');
              go('billing');
            }}
            title={selected.number}
            mono
          />
          <View className="mt-5">
            <Pill
              size="lg"
              tone={tone}
              dot={selected.status === 'paid' || selected.status === 'partial'}
            >
              {selected.statusLabel}
            </Pill>
          </View>
          <Amount cents={selected.totalCents} size="display" className="mt-3" />
          <Text variant="label" tone="muted" className="mt-1">
            {selected.client} · {selected.matter}
          </Text>
          <SectionHeader title="Details" />
          <KeyValue
            items={[
              { label: 'Invoice', value: selected.number },
              { label: 'Matter', value: selected.matter },
              { label: 'Status', value: selected.statusLabel },
            ]}
          />
          {selected.lines?.length ? (
            <>
              <SectionHeader title="Line items" count={selected.lines.length} />
              <List>
                {selected.lines.map((line) => (
                  <ListRow
                    key={line.title}
                    regular
                    title={line.title}
                    subtitle={line.detail}
                    value={money(line.cents)}
                  />
                ))}
              </List>
            </>
          ) : null}
        </>
      );
    }
    return (
      <>
        <NavBar
          back="Billing"
          onBack={() => {
            setBillingTab('invoices');
            go('billing');
          }}
          title="INV-2026-078"
          mono
          actions={
            <>
              <IconButton
                plain
                icon="upload"
                label="Share invoice"
                onPress={() => notify('Invoice share link copied')}
              />
              <IconButton
                plain
                icon="more"
                label="More"
                onPress={() => notify('Invoice actions')}
              />
            </>
          }
        />
        <View className="mt-5">
          <Pill size="lg" tone={invoicePaid ? 'success' : partiallyPaid ? 'warning' : 'danger'} dot>
            {invoicePaid ? 'Paid today' : partiallyPaid ? 'Partially paid' : 'Overdue 46 days'}
          </Pill>
        </View>
        <Amount cents={balanceCents} size="display" className="mt-3" />
        <Text variant="label" tone="muted" className="mt-1">
          Margaret Bennett · Estate of Harold Bennett
        </Text>
        {paymentCents > 0 ? (
          <Banner
            className="mt-5"
            tone={invoicePaid ? 'success' : 'warning'}
            icon="check"
            title={`Payment received · ${money(paymentCents)} by ${lastPaymentMethod}`}
            text={
              invoicePaid
                ? 'Today 9:52 AM · deposits to operating ····3310 in 1–2 business days. No card fee.'
                : `${money(balanceCents)} remains due on this invoice.`
            }
            actions={
              invoicePaid ? (
                <>
                  <Button size="sm" onPress={() => notify('Receipt sent to Margaret Bennett')}>
                    Send receipt
                  </Button>
                  <Button size="sm" variant="ghost" onPress={() => go('billing')}>
                    Back to Billing
                  </Button>
                </>
              ) : undefined
            }
          />
        ) : null}
        <SectionHeader title="Details" />
        <KeyValue
          items={[
            { label: 'Issued', value: 'Jul 15 · net 30' },
            { label: 'Due', value: 'Aug 14' },
            {
              label: 'Pay link',
              value: linkTexted
                ? 'Texted today · ACH offered first'
                : 'Texted Sep 12 · opened Sep 13 · ACH offered first',
            },
            { label: 'Trust', value: '$18,240.00 available · apply' },
          ]}
        />
        <SectionHeader
          title="Line items"
          count={3}
          action="Edit"
          onAction={() => notify('Invoice line items')}
        />
        <List
          footer={
            <>
              <Text variant="body-strong">Total</Text>
              <Amount cents={812500} />
            </>
          }
        >
          {INVOICES[0]?.lines?.map((line) => (
            <ListRow
              key={line.title}
              regular
              title={line.title}
              subtitle={line.detail}
              value={money(line.cents)}
            />
          ))}
        </List>
        <SectionHeader title="Activity" />
        <Timeline
          events={[
            ...(paymentCents > 0
              ? [
                  {
                    icon: 'check' as const,
                    strong: 'Payment received',
                    title: `${money(paymentCents)} by ${lastPaymentMethod}`,
                    meta: 'Today 9:52 AM',
                    tone: 'accent' as const,
                  },
                ]
              : []),
            ...(linkTexted
              ? [
                  {
                    icon: 'send' as const,
                    strong: 'Pay link texted',
                    title: 'to Margaret Bennett',
                    meta: 'Today 9:46 AM',
                  },
                ]
              : []),
            {
              icon: 'link',
              strong: 'Pay link opened',
              title: 'by Margaret Bennett',
              meta: 'Sep 13',
            },
            { icon: 'send', strong: 'Invoice sent', title: 'by text', meta: 'Sep 12' },
          ]}
        />
      </>
    );
  };

  const contacts = () => {
    const filtered = CONTACTS.filter((contact) => {
      const q = contactQuery.trim().toLowerCase();
      return (
        (!q || `${contact.name} ${contact.role} ${contact.matter}`.toLowerCase().includes(q)) &&
        (contactFilter === 'All' ||
          (contactFilter === 'Clients' && contact.role.startsWith('Client')) ||
          (contactFilter === 'Opposing' && contact.role.startsWith('Opposing')) ||
          (contactFilter === 'Experts' && contact.role.startsWith('Expert')) ||
          (contactFilter === 'Courts' && contact.role.startsWith('Court')))
      );
    });
    const row = (contact: (typeof CONTACTS)[number]) => (
      <ListRow
        key={contact.id}
        lead={
          <Avatar
            name={contact.name}
            kind={contact.kind}
            icon={contact.kind === 'org' ? 'building' : undefined}
          />
        }
        title={contact.name}
        subtitle={`${contact.role} · ${contact.matter}`}
        chevron
        onPress={() => {
          setContactId(contact.id);
          go('contact');
        }}
      />
    );
    return (
      <>
        <NavBar back="Matters" onBack={() => go('matters')} title="Contacts" />
        <Text variant="title-1" className="mt-3">
          Contacts
        </Text>
        <View className="mt-4">
          <Input
            search
            icon="search"
            placeholder="Search contacts"
            value={contactQuery}
            onChangeText={setContactQuery}
          />
        </View>
        <View className="mt-3">
          <ChipGroup>
            {['All', 'Clients', 'Opposing', 'Experts', 'Courts'].map((filter) => (
              <Chip
                key={filter}
                active={contactFilter === filter}
                count={filter === 'All' ? 14 : filter === 'Clients' ? 6 : undefined}
                onPress={() => setContactFilter(filter)}
              >
                {filter}
              </Chip>
            ))}
          </ChipGroup>
        </View>
        <SectionHeader title="Clients" />
        <List>{filtered.filter((contact) => contact.role.startsWith('Client')).map(row)}</List>
        <SectionHeader title="Other parties" />
        <List>{filtered.filter((contact) => !contact.role.startsWith('Client')).map(row)}</List>
      </>
    );
  };

  const contact = () => {
    const person = CONTACTS.find((item) => item.id === contactId) ?? CONTACTS[0];
    if (!person) return null;
    return (
      <>
        <NavBar back="Contacts" onBack={() => go('contacts')} title="Contact" />
        <View className="mt-6 items-center">
          <Avatar name={person.name} kind={person.kind} size="xl" />
          <Text variant="title-2" className="mt-3">
            {person.name}
          </Text>
          <Text variant="label" tone="muted" className="mt-1">
            {person.role} · {person.matter}
          </Text>
        </View>
        <View className="mt-5 flex-row gap-2">
          <Button icon="phone" className="flex-1" onPress={() => notify(`Call ${person.name}`)}>
            Call
          </Button>
          <Button
            variant="primary"
            icon="message"
            className="flex-1"
            onPress={() => notify(`Text ${person.name}`)}
          >
            Text
          </Button>
          <Button icon="send" className="flex-1" onPress={() => notify(`Email ${person.name}`)}>
            Email
          </Button>
        </View>
        <Banner
          className="mt-5"
          tone="outline"
          icon="shield"
          title="Conflict pre-check · no matches"
          text="Checked against 14 contacts and 12 matters on Sep 29. Aliases and related parties included."
          actions={
            <Button
              variant="ghost"
              size="sm"
              onPress={() => notify('Conflict pre-check complete · no matches')}
            >
              Run again
            </Button>
          }
        />
        <SectionHeader title="Details" />
        <KeyValue
          items={[
            { label: 'Phone', value: person.phone },
            { label: 'Email', value: person.email },
            { label: 'Type', value: person.kind === 'org' ? 'Company' : 'Person' },
            {
              label: 'Portal',
              value: person.role.startsWith('Client') ? 'Invited' : 'Not invited',
            },
          ]}
        />
        <SectionHeader title="Matters" />
        <List>
          {MATTER_ORDER.filter((id) => id === person.matterId).map((id) => (
            <ListRow
              key={id}
              title={MATTERS[id].title}
              subtitle={MATTERS[id].number}
              pill={<Pill tone="accent">{MATTERS[id].stage}</Pill>}
              onPress={() => openMatter(id)}
            />
          ))}
        </List>
      </>
    );
  };

  const settings = () => (
    <>
      <NavBar back="Today" onBack={() => go('today')} title="Settings" />
      <Text variant="title-1" className="mt-3">
        Settings
      </Text>
      <View className="mt-5 flex-row items-center gap-3 rounded-lg border border-hairline bg-surface p-4">
        <Avatar size="lg" tone="accent" initials="DO" />
        <View>
          <Text variant="body-strong">Dana Okafor</Text>
          <Text variant="label" tone="muted">
            Tran & Okafor LLP · Attorney
          </Text>
        </View>
      </View>
      <SectionHeader title="Rates" />
      <List>
        <ListRow title="Hourly rate" subtitle="Dana Okafor" value="$425.00" />
        <ListRow title="Rounding" subtitle="Time entries" value="0.1h" />
      </List>
      <SectionHeader title="Device" />
      <List flat>
        <OptionRow
          label="Courthouse mode"
          hint="Dark, silent, quick notes and timers"
          control={
            <Switch
              checked={preference === 'courthouse'}
              label="Courthouse mode"
              onChange={(value) => setPreference(value ? 'courthouse' : 'light')}
            />
          }
        />
        <Divider />
        <OptionRow
          label="Face ID"
          hint="Unlock without signing in again"
          control={<Switch checked={biometric} onChange={setBiometric} />}
        />
        <Divider />
        <OptionRow
          label="Lock after 15 min"
          hint="When courthouse mode is on"
          control={<Switch checked={autoLock} onChange={setAutoLock} />}
        />
        <Divider />
        <OptionRow
          label="Work offline"
          hint="Queue changes until the connection returns"
          control={<Switch checked={offline} onChange={setOffline} />}
        />
      </List>
      <SectionHeader title="Notifications" />
      <List flat>
        <OptionRow
          label="Review your day"
          hint="Daily at 5:30 PM"
          control={<Switch checked={notifications} onChange={setNotifications} />}
        />
        <Divider />
        <OptionRow
          label="Payments received"
          hint="As soon as clients pay"
          control={<Switch checked={notifications} onChange={setNotifications} />}
        />
        <Divider />
        <OptionRow
          label="Deadlines"
          hint="Rule-based court dates"
          control={<Switch checked={notifications} onChange={setNotifications} />}
        />
      </List>
      <SectionHeader title="Plan" />
      <List>
        <ListRow title="Clepso for firms" subtitle="3 users · renews Oct 12" value="$147.00" />
      </List>
      <Button
        variant="destructive"
        block
        className="mt-5"
        onPress={() => notify('Subscription cancellation is available in firm billing settings')}
      >
        Cancel subscription
      </Button>
      <Text variant="caption" tone="muted" className="mt-2 text-center">
        Cancel in two taps. We export your matters, time and trust ledger before anything closes.
      </Text>
    </>
  );

  const sheetTitle: Record<SheetName, string> = {
    capture: 'Capture',
    timer: 'Start timer',
    voice: 'Voice memo',
    logtime: 'Log time',
    expense: 'Expense',
    task: 'Task',
    note: preference === 'courthouse' ? 'Quick note' : 'Note',
    record: 'Record payment',
    plan: 'Offer a payment plan',
    newmatter: 'New matter',
  };
  const sheetSubtitle: Partial<Record<SheetName, string>> = {
    capture: `to ${MATTERS[matterId].short}`,
    note:
      preference === 'courthouse' ? 'People v. Webb · pretrial · timer keeps running' : undefined,
  };
  const sheetBody = (name: SheetName): ReactNode => {
    if (name === 'capture')
      return (
        <>
          <CaptureGrid onSelect={selectCapture} />
          <Text variant="label" tone="muted">
            Recent matters
          </Text>
          <ChipGroup>
            {(['bennett', 'alvarez', 'webb'] as MatterId[]).map((id) => (
              <Chip key={id} active={matterId === id} onPress={() => setMatterId(id)}>
                {MATTERS[id].short}
              </Chip>
            ))}
          </ChipGroup>
        </>
      );
    if (name === 'timer')
      return (
        <>
          <TimerHero
            time={timerMatter ? clock(timerSeconds) : '00:00:00'}
            caption={
              timerMatter
                ? [timerMatter.title, timerActivity].filter(Boolean).join(' · ')
                : 'Choose a matter to start'
            }
          />
          <ChipGroup>
            {(['webb', 'bennett', 'alvarez', 'kessler'] as MatterId[]).map((id) => (
              <Chip key={id} active={matterId === id} onPress={() => setMatterId(id)}>
                {MATTERS[id].short}
              </Chip>
            ))}
          </ChipGroup>
          <Field label="Activity">
            <Select
              code="L110"
              value="Fact investigation"
              onPress={() => notify('Activity · Fact investigation')}
            />
          </Field>
          {timerMatter ? (
            <View className="flex-row gap-2">
              <Button
                className="flex-1"
                icon={timerPaused ? 'play' : 'pause'}
                onPress={timerPaused ? resumeTimer : pauseTimer}
              >
                {timerPaused ? 'Resume' : 'Pause'}
              </Button>
              <Button
                className="flex-1"
                variant="primary"
                icon="stop"
                onPress={() => setDialog('stop')}
              >
                Stop & log
              </Button>
            </View>
          ) : (
            <Button
              variant="primary"
              size="lg"
              block
              onPress={() => startTimer(matterId)}
            >{`Start timer for ${MATTERS[matterId].short}`}</Button>
          )}
        </>
      );
    if (name === 'voice')
      return (
        <>
          <View className="flex-row items-center gap-3">
            <IconWell name="mic" tone="accent" size="lg" round />
            <View className="h-9 flex-1 flex-row items-center justify-between">
              {[6, 12, 20, 28, 18, 10, 22, 30, 16, 8, 14, 26, 20, 12, 6, 10, 18, 24, 14, 8].map(
                (height, index) => (
                  <View key={index} className="w-[3px] rounded-full bg-accent" style={{ height }} />
                ),
              )}
            </View>
            <Mono ink>0:14</Mono>
          </View>
          <View>
            <Text variant="overline" tone="muted">
              Transcript
            </Text>
            <Text tone="muted" className="mt-1">
              “Bennett, point three. Reviewed the appraiser’s report and reconciled Schedule B
              against it.”
            </Text>
          </View>
          <AiSuggestion
            label="Parsed into an entry · not applied"
            text="Estate of Harold Bennett · 0.3h · L110 · Reviewed appraiser’s report; reconciled Inventory Schedule B to appraised values."
            actions={[
              { label: 'Use this', onPress: () => billReview('memo') },
              { label: 'Edit', quiet: true, onPress: () => billReview('memo') },
              {
                label: 'Dismiss',
                quiet: true,
                onPress: () => {
                  setReview((items) => items.filter((item) => item !== 'memo'));
                  setSheet(null);
                },
              },
            ]}
          />
          <Banner
            tone="outline"
            icon="pen"
            compact
            title="Transcribed on device · nothing is saved until you tap Log"
          />
          <Button variant="primary" size="lg" block onPress={() => billReview('memo')}>
            Log 0.3h to Estate of Bennett
          </Button>
        </>
      );
    if (name === 'logtime') {
      const hours = roundedHours(logTime.minutes);
      const amount = Math.round(hours * 42500);
      const sourceHelp =
        logTime.source === 'call'
          ? 'From the 12-min call'
          : logTime.source === 'timer'
            ? 'From timer'
            : logTime.source === 'memo'
              ? 'From voice memo'
              : logTime.source === 'board'
                ? 'From calendar'
                : 'Rounds to 0.1h (6 min)';
      return (
        <>
          <Field label="Matter">
            <Select
              value={MATTERS[logTime.matterId].title}
              mono={MATTERS[logTime.matterId].number}
              onPress={() => {
                const next =
                  MATTER_ORDER[(MATTER_ORDER.indexOf(logTime.matterId) + 1) % MATTER_ORDER.length];
                if (next) setLogTime((value) => ({ ...value, matterId: next }));
              }}
            />
          </Field>
          <View className="flex-row gap-3">
            <View className="flex-1">
              <Field label="Duration" help={`${sourceHelp} · rounds to ${hours.toFixed(1)}h`}>
                <Stepper
                  value={duration(logTime.minutes)}
                  onDecrement={() =>
                    setLogTime((value) => ({ ...value, minutes: Math.max(6, value.minutes - 6) }))
                  }
                  onIncrement={() =>
                    setLogTime((value) => ({ ...value, minutes: value.minutes + 6 }))
                  }
                />
              </Field>
            </View>
            <View className="flex-1">
              <Field label="Amount" help={`${hours.toFixed(1)}h × $425.00`}>
                <Input amount prefix="$" value={money(amount).slice(1)} editable={false} />
              </Field>
            </View>
          </View>
          <View className="flex-row gap-3">
            <View className="flex-1">
              <Field label="Date">
                <Input icon="calendar" value="Today, Sep 29" editable={false} />
              </Field>
            </View>
            <View className="flex-1">
              <Field label="Activity">
                <Select
                  code={logTime.source === 'call' ? 'L120' : 'L110'}
                  value={logTime.source === 'call' ? 'Analysis/strategy' : 'Fact investigation'}
                  onPress={() => notify('Activity selected')}
                />
              </Field>
            </View>
          </View>
          <Field label="Narrative">
            <Input multiline minHeight={76} value={narrative} onChangeText={setNarrative} />
          </Field>
          {!logTime.ai ? (
            <AiSuggestion
              label="Suggested cleanup · not applied"
              text={
                logTime.source
                  ? cleanedNarrative[logTime.source]
                  : 'Reviewed file and prepared notes for next steps.'
              }
              actions={[
                {
                  label: 'Use this',
                  onPress: () => {
                    setNarrative(
                      logTime.source
                        ? cleanedNarrative[logTime.source]
                        : 'Reviewed file and prepared notes for next steps.',
                    );
                    setLogTime((value) => ({ ...value, ai: true }));
                  },
                },
                {
                  label: 'Dismiss',
                  quiet: true,
                  onPress: () => setLogTime((value) => ({ ...value, ai: true })),
                },
              ]}
            />
          ) : null}
          <OptionRow
            label="Billable"
            hint={logTime.billable ? undefined : 'Saved as no charge'}
            control={
              <Switch
                checked={logTime.billable}
                onChange={(value) => setLogTime((entry) => ({ ...entry, billable: value }))}
              />
            }
          />
          <Button variant="primary" size="lg" block onPress={saveTime}>
            {logTime.billable
              ? `Save ${hours.toFixed(1)}h · ${money(amount)}`
              : `Save ${hours.toFixed(1)}h · no charge`}
          </Button>
        </>
      );
    }
    if (name === 'expense')
      return (
        <>
          <Field label="Receipt">
            <Pressable
              accessibilityRole="button"
              onPress={() => notify('Camera ready · photograph receipt')}
              className="h-24 flex-row items-center justify-center gap-2 rounded-md border border-dashed border-border-strong bg-surface-2 px-3"
            >
              <Icon name="camera" tone="ink-2" />
              <Text variant="label" tone="muted" className="shrink">
                Photograph the receipt · amount is read for you
              </Text>
            </Pressable>
          </Field>
          <View className="flex-row gap-3">
            <View className="flex-1">
              <Field label="Amount">
                <Input
                  amount
                  prefix="$"
                  keyboardType="decimal-pad"
                  value={expenseAmount}
                  onChangeText={setExpenseAmount}
                />
              </Field>
            </View>
            <View className="flex-1">
              <Field label="Date">
                <Input icon="calendar" value="Today, Sep 29" editable={false} />
              </Field>
            </View>
          </View>
          <Field label="Matter">
            <Select
              value={MATTERS[matterId].title}
              mono={MATTERS[matterId].number}
              onPress={() => setMatterId('bennett')}
            />
          </Field>
          <Field label="Description">
            <Input value={expenseDescription} onChangeText={setExpenseDescription} />
          </Field>
          <AiSuggestion
            label="Read from receipt · not applied"
            text="SF Superior Court · $435.00 · Sep 29 · Filing fee"
            actions={[
              {
                label: 'Looks right',
                onPress: () => {
                  setExpenseAmount('435.00');
                  setExpenseDescription('SF Superior Court filing fee');
                },
              },
              { label: 'Dismiss', quiet: true },
            ]}
          />
          <OptionRow
            label="Bill to client"
            hint="Costs advanced · appears on the next invoice"
            control={<Switch checked={billToClient} onChange={setBillToClient} />}
          />
          <Button
            variant="primary"
            size="lg"
            block
            onPress={() => {
              setSheet(null);
              notify(`Expense saved · $${expenseAmount} to ${MATTERS[matterId].short}`);
            }}
          >{`Save expense · $${expenseAmount}`}</Button>
        </>
      );
    if (name === 'task')
      return (
        <>
          <Field label="Task">
            <Input value={taskTitle} onChangeText={setTaskTitle} />
          </Field>
          <Field label="Matter">
            <Select
              value={MATTERS[matterId].title}
              mono={MATTERS[matterId].number}
              onPress={() => setMatterId('bennett')}
            />
          </Field>
          <View className="flex-row gap-3">
            <View className="flex-1">
              <Field label="Due">
                <Input icon="calendar" value="Tue, Oct 7" editable={false} />
              </Field>
            </View>
            <View className="flex-1">
              <Field label="Assign to">
                <Select value="Dana Okafor" onPress={() => notify('Assigned to Dana Okafor')} />
              </Field>
            </View>
          </View>
          <OptionRow
            label="Remind me"
            hint="Morning of, 8:00 AM"
            control={<Switch checked={remindTask} onChange={setRemindTask} />}
          />
          <Button
            variant="primary"
            size="lg"
            block
            onPress={() => {
              setSheet(null);
              notify('Task added · due Tue, Oct 7');
            }}
          >
            Add task
          </Button>
        </>
      );
    if (name === 'note')
      return (
        <>
          {preference === 'courthouse' ? (
            <Pill tone="info" icon="gavel">
              Dept. 22
            </Pill>
          ) : null}
          <Field label={preference === 'courthouse' ? undefined : 'Note'}>
            <Input
              multiline
              minHeight={preference === 'courthouse' ? 132 : 96}
              value={noteText}
              onChangeText={setNoteText}
            />
          </Field>
          {preference === 'courthouse' ? (
            <AiSuggestion
              label="Found in your note · not applied"
              text="Hearing continued to Oct 15 at 9:00 AM · Task: Ask Marcus about alibi witness"
              actions={[
                {
                  label: 'Add both',
                  onPress: () => notify('Hearing and task added to People v. Webb'),
                },
                { label: 'Dismiss', quiet: true },
              ]}
            />
          ) : null}
          <OptionRow
            label="Visible to client"
            hint="Off · internal note"
            control={<Switch checked={visibleToClient} onChange={setVisibleToClient} />}
          />
          <Button
            variant="primary"
            size="lg"
            block
            onPress={() => {
              setSheet(null);
              notify(
                `Note saved · ${preference === 'courthouse' ? 'People v. Webb' : MATTERS[matterId].short}`,
              );
            }}
          >
            Save note
          </Button>
        </>
      );
    if (name === 'record')
      return (
        <>
          <Field label="Invoice">
            <Select value={`Margaret Bennett · ${money(balanceCents)}`} mono="INV-2026-078" />
          </Field>
          <Field label="Amount" help="Full balance · leave lower to record a partial">
            <Input
              amount
              prefix="$"
              keyboardType="decimal-pad"
              value={recordAmount}
              onChangeText={setRecordAmount}
            />
          </Field>
          <Field label="Method">
            <SegmentedControl
              value={recordMethod}
              onChange={setRecordMethod}
              items={[
                { value: 'ach', label: 'ACH' },
                { value: 'card', label: 'Card' },
                { value: 'check', label: 'Check' },
                { value: 'trust', label: 'Trust' },
              ]}
            />
          </Field>
          {recordMethod === 'trust' ? (
            <Banner
              tone="outline"
              icon="lock"
              title="Transfer from IOLTA ····4821"
              text={`${money(Math.max(0, 1824000 - Math.round(Number(recordAmount.replace(/,/g, '')) * 100 || 0)))} stays in trust after this $${recordAmount} transfer.`}
            />
          ) : null}
          <View className="flex-row gap-3">
            <View className="flex-1">
              <Field label="Received">
                <Input icon="calendar" value="Today, Sep 29" editable={false} />
              </Field>
            </View>
            <View className="flex-1">
              <Field label="Reference" optional>
                <Input placeholder={recordMethod === 'check' ? 'Check no.' : 'Confirmation'} />
              </Field>
            </View>
          </View>
          <Button
            variant="primary"
            size="lg"
            block
            onPress={() =>
              markPaid(
                recordMethod === 'trust' ? 'trust transfer' : recordMethod.toUpperCase(),
                Math.round(Number(recordAmount.replace(/,/g, '')) * 100),
              )
            }
          >
            {recordMethod === 'trust'
              ? `Apply $${recordAmount} from trust`
              : `Record $${recordAmount}`}
          </Button>
        </>
      );
    if (name === 'plan') {
      const per = Math.floor(balanceCents / planCount);
      const dates = ['On acceptance', 'Oct 29', 'Nov 29', 'Dec 29', 'Jan 29', 'Feb 28'];
      return (
        <>
          <Field label="Instalments">
            <SegmentedControl
              value={String(planCount)}
              onChange={(value) => setPlanCount(Number(value))}
              items={[2, 3, 4, 6].map((count) => ({ value: String(count), label: String(count) }))}
            />
          </Field>
          <Field label="Schedule" help="Monthly · first payment on acceptance">
            <List
              footer={
                <>
                  <Text variant="label">Total</Text>
                  <Amount cents={balanceCents} />
                </>
              }
            >
              {Array.from({ length: planCount }, (_, index) => (
                <ListRow
                  key={index}
                  regular
                  title={dates[index] ?? `Month ${index + 1}`}
                  subtitle={index === 0 ? 'On acceptance' : 'Auto-charged'}
                  value={money(
                    index === planCount - 1 ? balanceCents - per * (planCount - 1) : per,
                  )}
                />
              ))}
            </List>
          </Field>
          <OptionRow
            label="Auto-charge"
            hint="Bank account or card on file"
            control={<Switch checked={autoCharge} onChange={setAutoCharge} />}
          />
          <OptionRow
            label="Pause late fees"
            hint="While the plan is current"
            control={<Switch checked={pauseFees} onChange={setPauseFees} />}
          />
          <Button
            variant="primary"
            size="lg"
            block
            icon="send"
            onPress={() => {
              setSheet(null);
              notify(`Plan texted · ${planCount} × ${money(per)}`);
            }}
          >{`Text plan · ${planCount} × ${money(per)}`}</Button>
        </>
      );
    }
    const playbooks = [
      ['probate', 'Probate', '6 stages · hourly · Prob. Code deadlines'],
      ['pi', 'Personal injury', '6 stages · contingency · discovery chain'],
      ['family', 'Family', '4 stages · flat fee · disclosure chain'],
      ['criminal', 'Criminal defense', '5 stages · flat fee · court dates'],
      ['immigration', 'Immigration', '4 stages · flat fee · USCIS windows'],
    ];
    return (
      <>
        <Field
          label="Playbook"
          help="Stages, deadlines and the billing model come from the playbook."
        >
          <List>
            {playbooks.map(([key, label, hint]) => (
              <OptionRow
                key={key}
                label={label ?? ''}
                hint={hint}
                controlPosition="start"
                control={<Radio checked={playbook === key} />}
                onPress={() => {
                  setPlaybook(key ?? 'probate');
                  setNewMatterName(
                    key === 'probate'
                      ? 'Estate of Vikram Raman'
                      : key === 'pi'
                        ? 'Raman v. Bay Transit'
                        : key === 'family'
                          ? 'In re Marriage of Raman'
                          : key === 'criminal'
                            ? 'People v. Raman'
                            : 'Raman I-485 adjustment',
                  );
                }}
              />
            ))}
          </List>
        </Field>
        <Field label="Client" help="Conflict check runs as you type.">
          <Input value={newClient} onChangeText={setNewClient} />
        </Field>
        <Field label="Matter name">
          <Input value={newMatterName} onChangeText={setNewMatterName} />
        </Field>
        <Button
          variant="primary"
          size="lg"
          block
          onPress={() => {
            setSheet(null);
            notify('Matter 2026-0215 created from the playbook');
          }}
        >
          Create matter · 2026-0215
        </Button>
      </>
    );
  };

  const footer =
    isDetail && screen === 'matter' ? (
      <View className="flex-row gap-2 border-t border-hairline bg-bg px-5 py-2">
        <Button
          className="flex-1"
          icon="clock"
          onPress={() =>
            openLogTime({ matterId, minutes: 6, narrative: '', ai: false, billable: true })
          }
        >
          Log time
        </Button>
        <Button
          className="flex-1"
          icon="message"
          onPress={() => notify(`Message ${MATTERS[matterId].client}`)}
        >
          Message
        </Button>
        <Button
          className="flex-1"
          variant="primary"
          icon="receipt"
          onPress={() =>
            notify(`Draft invoice created · ${money(MATTERS[matterId].unbilledCents)}`)
          }
        >
          Invoice
        </Button>
      </View>
    ) : screen === 'invoice' && selectedInvoiceId === '078' ? (
      <View className="gap-1 border-t border-hairline bg-bg px-5 py-2">
        {invoicePaid ? (
          <Button
            variant="primary"
            block
            onPress={() => notify('Receipt sent to Margaret Bennett')}
          >
            Send receipt
          </Button>
        ) : (
          <>
            <View className="flex-row gap-2">
              <Button
                className="flex-1"
                onPress={() => {
                  setRecordAmount(money(balanceCents).slice(1));
                  setSheet('record');
                }}
              >
                Record payment
              </Button>
              <Button
                className="flex-1"
                variant="primary"
                icon="send"
                onPress={() => setDialog('text')}
              >
                Text pay link
              </Button>
            </View>
            <Button variant="tertiary" size="sm" block onPress={() => setSheet('plan')}>
              Offer a payment plan
            </Button>
          </>
        )}
      </View>
    ) : !isDetail ? (
      bottom
    ) : null;

  const content =
    screen === 'today'
      ? today()
      : screen === 'matters'
        ? matters()
        : screen === 'matter'
          ? matterDetail()
          : screen === 'calendar'
            ? calendar()
            : screen === 'billing'
              ? billing()
              : screen === 'invoice'
                ? invoice()
                : screen === 'contacts'
                  ? contacts()
                  : screen === 'contact'
                    ? contact()
                    : settings();

  return (
    <SafeAreaView className="flex-1 bg-bg" edges={['top', 'bottom']}>
      <ScrollView
        className="flex-1"
        contentContainerClassName="px-5 pb-7 pt-2"
        keyboardShouldPersistTaps="handled"
        showsVerticalScrollIndicator={false}
      >
        {content}
      </ScrollView>
      {timerMatter ? (
        <TimerBar
          title={timerMatter.title}
          subtitle={timerActivity ?? undefined}
          time={clock(timerSeconds)}
          paused={timerPaused}
          onPause={pauseTimer}
          onResume={resumeTimer}
          onStop={() => setDialog('stop')}
          onPress={() => setSheet('timer')}
          className="mx-3 mb-1"
        />
      ) : null}
      {footer}
      {toast ? (
        <View className="absolute bottom-24 left-5 right-5 z-40">
          <Toast message={toast.message} action={toast.action} onAction={toast.onAction} />
        </View>
      ) : null}
      {sheet ? (
        <H1Sheet
          title={sheetTitle[sheet]}
          subtitle={sheetSubtitle[sheet]}
          onClose={() => setSheet(null)}
        >
          {sheetBody(sheet)}
        </H1Sheet>
      ) : null}
      <Dialog
        visible={dialog === 'text'}
        title={`Text pay link for ${money(balanceCents)}?`}
        text="Margaret Bennett gets a text at (415) 555-0177 with a pay link. ACH is offered first; card adds 2.9%. She last opened a link on Sep 13."
        onRequestClose={() => setDialog(null)}
        actions={
          <>
            <Button variant="ghost" onPress={() => setDialog(null)}>
              Not yet
            </Button>
            <Button variant="primary" icon="send" onPress={sendPayLink}>
              Text pay link
            </Button>
          </>
        }
      />
      <Dialog
        visible={dialog === 'stop'}
        title={`Stop timer at ${duration(Math.round(timerSeconds / 60))}?`}
        text="Your time will be ready to review and save to this matter."
        onRequestClose={() => setDialog(null)}
        actions={
          <>
            <Button variant="ghost" onPress={() => setDialog(null)}>
              Keep running
            </Button>
            <Button variant="primary" onPress={stopTimer}>
              Stop & log
            </Button>
          </>
        }
      />
    </SafeAreaView>
  );
}
