import {
  Avatar,
  Button,
  CaptureGrid,
  Card,
  Chip,
  ChipGroup,
  IconButton,
  IconWell,
  KpiRow,
  KpiTile,
  List,
  ListRow,
  Mono,
  PhoneFrame,
  Pill,
  RowSep,
  Scrim,
  ScreenHeader,
  SectionHeader,
  SegmentedControl,
  Sheet,
  TabBar,
  Text,
  TimeBlock,
  TimerBar,
  type TabBarItem,
} from '@lawfirm/ui-web';

const TABS: TabBarItem[] = [
  { key: 'today', label: 'Today', icon: 'home' },
  { key: 'matters', label: 'Matters', icon: 'briefcase' },
  { key: 'calendar', label: 'Calendar', icon: 'calendar' },
  { key: 'billing', label: 'Billing', icon: 'receipt' },
];

const BillSkip = ({ hours }: { hours: string }) => (
  <>
    <Button variant="primary" size="sm">
      Bill {hours}
    </Button>
    <Button variant="ghost" size="sm">
      Skip
    </Button>
  </>
);

const TodayScreen = ({ short = false }: { short?: boolean }) => (
  <>
    <ScreenHeader
      eyebrow="Monday, September 29"
      title="Good morning, Dana."
      actions={
        <>
          <IconButton icon="inbox" label="Inbox" badge={3} />
          <Avatar initials="DO" tone="accent" />
        </>
      }
    />
    <KpiRow style={{ marginTop: 14 }}>
      <KpiTile tint label="Billed today" value="3.4" unit="of 6h" progress={57} />
      <KpiTile
        label="Unbilled"
        value="$17,325"
        delta={<span style={{ color: 'var(--accent)', fontWeight: 600 }}>{'Review & bill →'}</span>}
      />
    </KpiRow>
    <SectionHeader title="Review your day" count={3} />
    <List>
      <ListRow
        lead={<IconWell name="phone" />}
        regular
        title="Call · Sofia Alvarez · 12 min"
        subtitle={
          <>
            Alvarez v. Meridian <RowSep /> 10:12 AM
          </>
        }
        trail={<BillSkip hours="0.2h" />}
      />
      <ListRow
        lead={<IconWell name="calendar" />}
        regular
        title="Kessler board sync · 1h"
        subtitle={
          <>
            Kessler — Series B <RowSep /> 2:00 PM
          </>
        }
        trail={<BillSkip hours="1.0h" />}
      />
      {short ? null : (
        <ListRow
          lead={<IconWell name="mic" />}
          regular
          title="Voice memo · “Bennett, point three…”"
          subtitle={
            <>
              Transcribed <RowSep /> 0.3h suggested
            </>
          }
          trail={
            <Button variant="secondary" size="sm">
              Review
            </Button>
          }
        />
      )}
    </List>
    {short ? null : (
      <>
        <SectionHeader title="Today" action="Calendar" />
        <List>
          <ListRow
            lead={<TimeBlock main="9:30" sub="AM" />}
            title="Pretrial conference"
            subtitle={
              <>
                People v. Webb <RowSep /> Dept. 22
              </>
            }
            pill={
              <Pill tone="info" icon="gavel">
                Court
              </Pill>
            }
          />
          <ListRow
            lead={<TimeBlock main="2:00" sub="PM" />}
            title="Kessler board sync"
            subtitle="Zoom"
            pill={<Pill>Meeting</Pill>}
          />
          <ListRow
            lead={<TimeBlock main="5:00" sub="PM" />}
            title="Inventory filing deadline"
            subtitle="Estate of Bennett"
            pill={
              <Pill tone="danger" dot>
                Deadline
              </Pill>
            }
          />
        </List>
        <SectionHeader title="Who to nudge" action="All AR" />
        <List>
          <ListRow
            inset
            lead={<Avatar name="Margaret Bennett" />}
            title="Margaret Bennett"
            subtitle={
              <>
                <Mono>INV-2026-078</Mono> <RowSep /> link opened
              </>
            }
            value="$8,125.00"
            meta="46 days late"
            metaTone="danger"
          />
        </List>
      </>
    )}
  </>
);

const TodayBottom = (
  <>
    <TimerBar title="Estate of Harold Bennett" subtitle="Draft inventory schedules" time="00:42:17" />
    <TabBar items={TABS} activeKey="today" />
  </>
);

export const Today = () => (
  <PhoneFrame bottom={TodayBottom}>
    <TodayScreen />
  </PhoneFrame>
);

export const TodayDark = () => (
  <PhoneFrame dark bottom={TodayBottom}>
    <TodayScreen />
  </PhoneFrame>
);

export const Billing = () => (
  <PhoneFrame bottom={<TabBar items={TABS} activeKey="billing" />}>
    <ScreenHeader
      title="Billing"
      actions={
        <>
          <IconButton icon="search" label="Search" />
          <IconButton icon="plus" label="New invoice" />
        </>
      }
    />
    <SegmentedControl
      block
      style={{ marginTop: 12 }}
      value="invoices"
      items={[
        { value: 'unbilled', label: 'Unbilled' },
        { value: 'invoices', label: 'Invoices' },
        { value: 'payments', label: 'Payments' },
        { value: 'trust', label: 'Trust' },
      ]}
    />
    <KpiRow style={{ marginTop: 14 }}>
      <KpiTile
        label="Outstanding"
        value="$33,125"
        delta="$8,125 overdue"
        deltaTone="down"
        deltaIcon="alert"
      />
      <KpiTile
        label="Collected · 30d"
        value="$12,450"
        delta="18%"
        deltaTone="up"
        deltaIcon="arrow-up-right"
      />
    </KpiRow>
    <Card
      tone="tint"
      style={{ marginTop: 12 }}
      title="Ready to bill"
      subtitle={
        <span style={{ color: 'var(--accent-ink)' }}>
          3 matters · $17,325.00 unbilled · oldest 31 days
        </span>
      }
      headerAction={
        <Button variant="primary" size="sm">
          Create invoices
        </Button>
      }
    />
    <SectionHeader title="Invoices" action="Filter · All" />
    <List>
      <ListRow
        pressable
        title="Margaret Bennett"
        subtitle={
          <>
            <Mono>INV-2026-078</Mono> <RowSep /> Estate of Bennett
          </>
        }
        value="$8,125.00"
        pill={
          <Pill tone="danger" dot>
            Overdue 46d
          </Pill>
        }
      />
      <ListRow
        pressable
        title="Kessler Holdings LLC"
        subtitle={
          <>
            <Mono>INV-2026-092</Mono> <RowSep /> Series B
          </>
        }
        value="$25,000.00"
        pill={<Pill tone="info">Sent · due Oct 9</Pill>}
      />
      <ListRow
        pressable
        title="Marcus Webb"
        subtitle={
          <>
            <Mono>INV-2026-095</Mono> <RowSep /> People v. Webb
          </>
        }
        value="$3,000.00"
        pill={<Pill>Draft</Pill>}
      />
      <ListRow
        pressable
        title="Elena Delgado"
        subtitle={
          <>
            <Mono>INV-2026-094</Mono> <RowSep /> Delgado · plan 2 of 4
          </>
        }
        value="$1,625.00"
        pill={
          <Pill tone="warning" dot>
            Partial
          </Pill>
        }
      />
      <ListRow
        pressable
        title="Thanh Nguyen"
        subtitle={
          <>
            <Mono>INV-2026-061</Mono> <RowSep /> Nguyen v. Cascade
          </>
        }
        value="$4,450.00"
        pill={
          <Pill tone="success" dot>
            Paid Jul 18
          </Pill>
        }
      />
    </List>
  </PhoneFrame>
);

export const CaptureOverlay = () => (
  <PhoneFrame
    fade={false}
    bottom={<TabBar items={TABS} activeKey="today" />}
    overlay={
      <Scrim>
        <Sheet
          style={{ width: '100%', paddingBottom: 34 }}
          title="Capture"
          headerRight={
            <Text variant="label" tone="muted">
              to <b style={{ color: 'var(--ink)' }}>Estate of Bennett</b>
            </Text>
          }
        >
          <CaptureGrid />
          <ChipGroup>
            <span className="cl-t-caption cl-muted" style={{ alignSelf: 'center', flex: 'none' }}>
              Recent
            </span>
            <Chip active>Estate of Bennett</Chip>
            <Chip>People v. Webb</Chip>
            <Chip>Kessler</Chip>
          </ChipGroup>
        </Sheet>
      </Scrim>
    }
  >
    <TodayScreen short />
  </PhoneFrame>
);
