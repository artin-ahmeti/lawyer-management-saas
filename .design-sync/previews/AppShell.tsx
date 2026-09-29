import {
  AppShell,
  Avatar,
  Banner,
  Button,
  ButtonRow,
  Card,
  CellTitle,
  Checkbox,
  Chip,
  Columns,
  Drawer,
  IconButton,
  IconWell,
  Input,
  KpiRow,
  KpiTile,
  List,
  ListRow,
  MiniBars,
  Mono,
  NavItem,
  PageHeader,
  Pill,
  RowSep,
  SectionHeader,
  SegmentedControl,
  Sidebar,
  SidebarGroup,
  StageTracker,
  Table,
  Text,
  TimeBlock,
  Toolbar,
  TopBar,
  type TableColumn,
  type TableRow,
} from '@lawfirm/ui-web';

const frame = {
  width: 1280,
  height: 820,
  overflow: 'hidden',
  border: '1px solid var(--hairline)',
  borderRadius: 10,
  zoom: 0.66,
} as const;

function AppSidebar({ active }: { active: 'today' | 'matters' }) {
  return (
    <Sidebar
      firm="Tran & Okafor LLP"
      footer={
        <>
          <NavItem icon="settings" label="Settings" />
          <NavItem lead={<Avatar size="xs" tone="accent" initials="DO" />} label="Dana Okafor" />
        </>
      }
    >
      <NavItem icon="home" label="Today" active={active === 'today'} />
      <NavItem icon="inbox" label="Inbox" count={3} badge />
      <SidebarGroup label="Work" />
      <NavItem icon="briefcase" label="Matters" count={12} active={active === 'matters'} />
      <NavItem icon="users" label="Contacts" />
      <NavItem icon="calendar" label="Calendar" />
      <NavItem icon="check" label="Tasks" count={7} />
      <NavItem icon="folder" label="Documents" />
      <SidebarGroup label="Money" />
      <NavItem icon="clock" label="Time & expenses" />
      <NavItem icon="receipt" label="Billing" />
      <NavItem icon="lock" label="Trust" />
      <NavItem icon="chart" label="Reports" />
    </Sidebar>
  );
}

function AppTopBar() {
  return (
    <TopBar
      timer={{ title: 'Estate of Bennett', time: '00:42:17' }}
      right={
        <>
          <Button variant="primary" icon="plus">
            Capture
          </Button>
          <IconButton icon="bell" label="Alerts" badge={2} />
          <Avatar size="sm" tone="accent" initials="DO" />
        </>
      }
    />
  );
}

export const Dashboard = () => (
  <div className="cl-web" style={frame}>
    <AppShell sidebar={<AppSidebar active="today" />} topbar={<AppTopBar />}>
      <PageHeader
        eyebrow="Monday, September 29"
        title="Good morning, Dana."
        greeting
        actions={
          <SegmentedControl
            value="me"
            items={[
              { value: 'me', label: 'Me' },
              { value: 'firm', label: 'Firm' },
            ]}
          />
        }
      />
      <KpiRow columns={4}>
        <KpiTile tint label="Billed this week" value="21.4" unit="of 30h" progress={71} />
        <KpiTile label="Unbilled" value="$41,300" delta="38 entries · 6 matters · oldest 31d" />
        <KpiTile
          label="Outstanding"
          value="$33,125"
          delta="$8,125.00 overdue"
          deltaTone="down"
          deltaIcon="alert"
        />
        <KpiTile
          label="Collected · MTD"
          value="$58,900"
          delta="12% vs Aug · 6.2 days to paid"
          deltaTone="up"
          deltaIcon="arrow-up-right"
        />
      </KpiRow>
      <Columns layout="main">
        <div className="cl-stack cl-stack--xl">
          <Card
            flush
            title="Review your day"
            subtitle="3 things you probably billed for · +0.9h"
            headerAction={<Button variant="secondary">Bill all</Button>}
          >
            <List flat style={{ padding: '0 16px 6px' }}>
              <ListRow
                lead={<IconWell name="phone" />}
                regular
                title="Call · Sofia Alvarez · 12 min"
                subtitle="Alvarez v. Meridian · 10:12 AM"
                trail={
                  <>
                    <Button variant="primary">Bill 0.2h</Button>
                    <Button variant="ghost">Skip</Button>
                  </>
                }
              />
              <ListRow
                lead={<IconWell name="calendar" />}
                regular
                title="Kessler board sync · 1h"
                subtitle="Kessler — Series B · 2:00 PM"
                trail={
                  <>
                    <Button variant="primary">Bill 1.0h</Button>
                    <Button variant="ghost">Skip</Button>
                  </>
                }
              />
              <ListRow
                lead={<IconWell name="mic" />}
                regular
                title="Voice memo · “Bennett, point three, call with the appraiser”"
                subtitle="Transcribed on device · 0.3h suggested"
                trail={<Button variant="secondary">Review</Button>}
              />
            </List>
          </Card>
          <div>
            <SectionHeader title="Today" action="Open calendar" />
            <List>
              <ListRow
                lead={<TimeBlock main="9:30" sub="AM" />}
                title="Pretrial conference · People v. Webb"
                subtitle="Dept. 22, SF Superior · J. Whitfield"
                pill={
                  <Pill tone="info" icon="gavel">
                    Court
                  </Pill>
                }
              />
              <ListRow
                lead={<TimeBlock main="2:00" sub="PM" />}
                title="Kessler board sync"
                subtitle="Zoom · Kessler — Series B"
                pill={<Pill>Meeting</Pill>}
              />
              <ListRow
                lead={<TimeBlock main="5:00" sub="PM" />}
                title="Inventory filing deadline · Estate of Bennett"
                subtitle="Prob. Code §8800 · L. Tran"
                pill={
                  <Pill tone="danger" dot>
                    Deadline
                  </Pill>
                }
              />
            </List>
          </div>
        </div>
        <div className="cl-stack cl-stack--xl">
          <Card>
            <MiniBars
              title="Hours billed · this week"
              total="21.4h"
              max={9}
              goal={6}
              goalLabel="goal 6h"
              bars={[
                { label: 'Mon', value: 7.1 },
                { label: 'Tue', value: 4.7 },
                { label: 'Wed', value: 6.3 },
                { label: 'Today', value: 3.4, today: true },
                { label: 'Fri', value: 0, future: true },
              ]}
            />
          </Card>
          <Card
            flush
            title="Who to nudge"
            subtitle="$8,125.00 overdue · $25,000.00 due in 10 days"
            headerAction={
              <Button variant="tertiary" size="sm">
                All AR
              </Button>
            }
            footer={
              <>
                <Button variant="primary" icon="send">
                  Text pay link to Margaret
                </Button>
                <Button variant="secondary">Offer a plan</Button>
              </>
            }
          >
            <List flat style={{ padding: '0 16px' }}>
              <ListRow
                lead={<Avatar size="sm" initials="MB" />}
                title="Margaret Bennett"
                subtitle={
                  <>
                    <Mono>INV-2026-078</Mono> <RowSep /> link opened Sep 13
                  </>
                }
                value="$8,125.00"
                meta="46 days late"
                metaTone="danger"
              />
              <ListRow
                lead={<Avatar size="sm" kind="org" initials="KH" />}
                title="Kessler Holdings LLC"
                subtitle={
                  <>
                    <Mono>INV-2026-092</Mono> <RowSep /> sent Sep 10
                  </>
                }
                value="$25,000.00"
                meta="Due Oct 9"
              />
            </List>
          </Card>
          <div>
            <SectionHeader title="Deadlines · next 14 days" action="Docket" />
            <List>
              <ListRow
                title="Inventory filing · Estate of Bennett"
                subtitle="Prob. Code §8800"
                pill={
                  <Pill tone="warning" dot>
                    Fri Oct 3
                  </Pill>
                }
              />
              <ListRow
                title="14-day trust notice · Alvarez"
                subtitle="Rule 1.15 · funds received Sep 18"
                pill={
                  <Pill tone="warning" dot>
                    Thu Oct 2
                  </Pill>
                }
              />
              <ListRow
                title="RFE response window · Okonkwo"
                subtitle="USCIS · 87 days"
                pill={<Pill>Oct 11</Pill>}
              />
            </List>
          </div>
        </div>
      </Columns>
    </AppShell>
  </div>
);

const Person = ({ initials, name }: { initials: string; name: string }) => (
  <span className="cl-inline cl-inline--nowrap">
    <Avatar size="xs" initials={initials} />
    {name}
  </span>
);

const COLUMNS: TableColumn[] = [
  { key: 'sel', header: <Checkbox checked={false} shape="square" label="Select all" />, width: 36 },
  { key: 'matter', header: 'Matter' },
  { key: 'client', header: 'Client' },
  { key: 'stage', header: 'Stage' },
  { key: 'resp', header: 'Responsible' },
  { key: 'unbilled', header: 'Unbilled', align: 'right' },
  { key: 'trust', header: 'Trust', align: 'right' },
  { key: 'deadline', header: 'Next deadline' },
];

const ROWS: TableRow[] = [
  { id: 'g1', kind: 'group', cells: ['Needs attention · 2'] },
  {
    id: 'bennett',
    selected: true,
    strong: [5],
    cells: [
      <Checkbox checked shape="square" label="Select" />,
      <CellTitle
        title="Estate of Harold Bennett"
        sub={
          <>
            <Mono>2026-0187</Mono> · Probate
          </>
        }
      />,
      'Margaret Bennett',
      <Pill tone="accent">Inventory</Pill>,
      <Person initials="LT" name="L. Tran" />,
      '$4,825.00',
      '$18,240.00',
      <Pill tone="warning" dot>
        Filing · Oct 3
      </Pill>,
    ],
  },
  {
    id: 'webb',
    strong: [5],
    cells: [
      <Checkbox checked={false} shape="square" label="Select" />,
      <CellTitle
        title="People v. Marcus Webb"
        sub={
          <>
            <Mono>2026-0119</Mono> · Criminal defense
          </>
        }
      />,
      'Marcus Webb',
      <Pill tone="accent">Pretrial</Pill>,
      <Person initials="JW" name="J. Whitfield" />,
      '$3,000.00',
      '$5,000.00',
      <Pill tone="danger" dot>
        Hearing · today 9:30
      </Pill>,
    ],
  },
  { id: 'g2', kind: 'group', cells: ['Active · 7'] },
  {
    id: 'alvarez',
    cells: [
      <Checkbox checked={false} shape="square" label="Select" />,
      <CellTitle
        title="Alvarez v. Meridian Logistics"
        sub={
          <>
            <Mono>2026-0142</Mono> · Personal injury · contingency
          </>
        }
      />,
      'Sofia Alvarez',
      <Pill tone="accent">Discovery</Pill>,
      <Person initials="DO" name="D. Okafor" />,
      '—',
      '$42,000.00',
      <Pill>Cutoff · Oct 24</Pill>,
    ],
  },
  {
    id: 'kessler',
    strong: [5],
    cells: [
      <Checkbox checked={false} shape="square" label="Select" />,
      <CellTitle
        title="Kessler Holdings — Series B"
        sub={
          <>
            <Mono>2026-0201</Mono> · Corporate · flat fee
          </>
        }
      />,
      'Kessler Holdings LLC',
      <Pill tone="accent">Diligence</Pill>,
      <Person initials="DO" name="D. Okafor" />,
      '$12,500.00',
      '—',
      <span className="cl-muted">—</span>,
    ],
  },
  {
    id: 'delgado',
    cells: [
      <Checkbox checked={false} shape="square" label="Select" />,
      <CellTitle
        title="In re Marriage of Delgado"
        sub={
          <>
            <Mono>2026-0210</Mono> · Family · flat fee
          </>
        }
      />,
      'Elena Delgado',
      <Pill tone="accent">Disclosures</Pill>,
      <Person initials="LT" name="L. Tran" />,
      '—',
      '$3,250.00',
      <Pill>FL-142 · Oct 17</Pill>,
    ],
  },
  {
    id: 'okonkwo',
    cells: [
      <Checkbox checked={false} shape="square" label="Select" />,
      <CellTitle
        title="Okonkwo I-130 petition"
        sub={
          <>
            <Mono>2026-0214</Mono> · Immigration · flat fee
          </>
        }
      />,
      'Chidi Okonkwo',
      <Pill tone="accent">Filed</Pill>,
      <Person initials="JW" name="J. Whitfield" />,
      '—',
      '—',
      <Pill>RFE window · Oct 11</Pill>,
    ],
  },
  {
    id: 'reyes',
    cells: [
      <Checkbox checked={false} shape="square" label="Select" />,
      <CellTitle
        title="Reyes v. Bayview Medical Group"
        sub={
          <>
            <Mono>2026-0176</Mono> · Personal injury · contingency
          </>
        }
      />,
      'Luis Reyes',
      <Pill tone="accent">Treatment</Pill>,
      <Person initials="DO" name="D. Okafor" />,
      '—',
      '—',
      <span className="cl-muted">—</span>,
    ],
  },
  {
    id: 'foot',
    kind: 'foot',
    cells: ['', '9 matters', '', '', '', '$20,325.00', '$68,490.00', ''],
  },
];

function MatterDrawer() {
  return (
    <Drawer>
      <div className="cl-spread">
        <Mono>2026-0187</Mono>
        <div className="cl-inline" style={{ gap: 4 }}>
          <Button variant="ghost" iconOnly icon="arrow-up-right" aria-label="Open" />
          <Button variant="ghost" iconOnly icon="x" aria-label="Close" />
        </div>
      </div>
      <div>
        <Text variant="title-3" as="h2">
          Estate of Harold Bennett
        </Text>
        <Text variant="caption" tone="muted" as="div" style={{ marginTop: 2 }}>
          Margaret Bennett · Probate · L. Tran · opened May 2
        </Text>
        <div className="cl-inline" style={{ marginTop: 8 }}>
          <Pill tone="accent">Open</Pill>
          <Pill tone="outline">Hourly · $325</Pill>
        </div>
      </div>
      <StageTracker
        stages={[
          { label: 'Intake', state: 'done' },
          { label: 'Petition', state: 'done' },
          { label: 'Inventory', state: 'current' },
          { label: 'Creditors' },
          { label: 'Close' },
        ]}
      />
      <Banner tone="warning" icon="alert" compact title="Inventory filing due Fri, Oct 3" />
      <KpiRow columns={2}>
        <KpiTile label="Unbilled" value="$4,825" delta="14.8h · 9 entries" />
        <KpiTile label="Trust" value="$18,240" delta="IOLTA ····4821" />
      </KpiRow>
      <div>
        <SectionHeader title="Open tasks" count={4} />
        <List>
          <ListRow
            lead={<Checkbox checked={false} label="Done" />}
            regular
            title="File estate inventory"
            subtitle="L. Tran"
            meta="Oct 3"
            metaTone="warning"
          />
          <ListRow
            lead={<Checkbox checked={false} label="Done" />}
            regular
            title="Confirm appraiser invoice"
            subtitle="D. Okafor"
            meta="Oct 7"
          />
        </List>
      </div>
      <div>
        <SectionHeader title="People" />
        <List>
          <ListRow
            lead={<Avatar size="sm" initials="MB" />}
            title="Margaret Bennett"
            subtitle="Client · executor"
            chevron
            pressable
          />
          <ListRow
            lead={<Avatar size="sm" tone="accent" initials="AP" />}
            title="Dr. Anand Patel"
            subtitle="Appraiser"
            chevron
            pressable
          />
        </List>
      </div>
      <div style={{ marginTop: 'auto' }}>
        <ButtonRow>
          <Button variant="secondary" icon="play">
            Timer
          </Button>
          <Button variant="secondary" icon="message">
            Message
          </Button>
          <Button variant="primary">Invoice</Button>
        </ButtonRow>
      </div>
    </Drawer>
  );
}

export const MattersWithDrawer = () => (
  <div className="cl-web" style={frame}>
    <AppShell
      sidebar={<AppSidebar active="matters" />}
      topbar={<AppTopBar />}
      drawer={<MatterDrawer />}
    >
      <PageHeader
        title="Matters"
        actions={
          <>
            <Button variant="secondary" icon="download">
              Import from Clio
            </Button>
            <Button variant="primary" icon="plus">
              New matter
            </Button>
          </>
        }
      />
      <Toolbar
        right={
          <SegmentedControl
            value="comfortable"
            items={[
              { value: 'comfortable', label: 'Comfortable' },
              { value: 'compact', label: 'Compact' },
            ]}
          />
        }
      >
        <div style={{ width: 260 }}>
          <Input search icon="search" placeholder="Search matters" readOnly />
        </div>
        <Chip active count={9}>
          Open
        </Chip>
        <Chip count={5}>Mine</Chip>
        <Chip trailing="chevron">Practice area</Chip>
        <Chip trailing="chevron">Stage</Chip>
      </Toolbar>
      <Table columns={COLUMNS} rows={ROWS} />
    </AppShell>
  </div>
);
