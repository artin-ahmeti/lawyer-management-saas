import {
  AppShell,
  Avatar,
  BrowserFrame,
  Button,
  Card,
  Columns,
  IconButton,
  IconWell,
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
  Sidebar,
  SidebarGroup,
  TimeBlock,
  TopBar,
} from '@lawfirm/ui-web';

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

export const Dashboard = () => (
  <BrowserFrame url="app.clepso.com/today">
    <AppShell
      sidebar={
        <Sidebar
          firm="Tran & Okafor LLP"
          footer={
            <>
              <NavItem icon="settings" label="Settings" />
              <NavItem lead={<Avatar initials="DO" tone="accent" size="xs" />} label="Dana Okafor" />
            </>
          }
        >
          <NavItem icon="home" label="Today" active />
          <NavItem icon="inbox" label="Inbox" count={3} badge />
          <SidebarGroup label="Work" />
          <NavItem icon="briefcase" label="Matters" count={24} />
          <NavItem icon="calendar" label="Calendar" />
          <NavItem icon="check" label="Tasks" count={7} />
          <NavItem icon="users" label="Contacts" />
          <NavItem icon="file" label="Documents" />
          <SidebarGroup label="Money" />
          <NavItem icon="clock" label="Time" />
          <NavItem icon="receipt" label="Billing" count={5} />
          <NavItem icon="shield" label="Trust" />
          <NavItem icon="chart" label="Reports" />
        </Sidebar>
      }
      topbar={
        <TopBar
          timer={{ title: 'Estate of Bennett', time: '00:42:17' }}
          right={
            <>
              <Button variant="primary" size="sm" icon="plus">
                New
              </Button>
              <IconButton icon="bell" label="Alerts" badge={3} plain size="sm" />
              <Avatar initials="DO" tone="accent" size="sm" />
            </>
          }
        />
      }
    >
      <PageHeader
        eyebrow="Monday, September 29"
        title="Good morning, Dana."
        greeting
        actions={
          <Button variant="secondary" icon="play">
            Start timer
          </Button>
        }
      />
      <KpiRow columns={4}>
        <KpiTile tint label="Billed today" value="3.4" unit="of 6h" progress={57} />
        <KpiTile
          label="Unbilled"
          value="$17,325"
          delta={<span style={{ color: 'var(--accent)', fontWeight: 600 }}>{'Review & bill →'}</span>}
        />
        <KpiTile
          label="Outstanding AR"
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
      <Columns layout="main">
        <div>
          <SectionHeader title="Review your day" count={3} action="Bill all" />
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
          </List>
          <SectionHeader title="Today" action="Calendar" style={{ marginTop: 24 }} />
          <List>
            <ListRow
              lead={<TimeBlock main="9:30" sub="AM" />}
              title="Pretrial conference"
              subtitle={
                <>
                  People v. Webb <RowSep /> Dept. 22, SF Superior
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
              subtitle={
                <>
                  Kessler — Series B <RowSep /> Zoom
                </>
              }
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
        </div>
        <div>
          <Card title="Hours billed · this week" headerAction={<Pill tone="accent">21.4h</Pill>}>
            <MiniBars
              goal={6}
              goalLabel="goal 6h"
              max={9}
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
            title="Who to nudge"
            headerAction={
              <Button variant="tertiary" size="sm">
                All AR
              </Button>
            }
            flush
            style={{ marginTop: 24 }}
          >
            <List flat>
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
              <ListRow
                inset
                lead={<Avatar name="Elena Delgado" />}
                title="Elena Delgado"
                subtitle={
                  <>
                    <Mono>INV-2026-094</Mono> <RowSep /> plan 2 of 4
                  </>
                }
                value="$1,625.00"
                meta="Due Oct 3"
                metaTone="warning"
              />
            </List>
          </Card>
        </div>
      </Columns>
    </AppShell>
  </BrowserFrame>
);
