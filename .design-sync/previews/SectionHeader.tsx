import { List, ListRow, Pill, RowSep, SectionHeader, TimeBlock } from '@lawfirm/ui-web';

export const Basic = () => (
  <div style={{ maxWidth: 358 }}>
    <SectionHeader title="Review your day" count={3} action="See all" />
  </div>
);

export const Variants = () => (
  <div style={{ maxWidth: 358 }}>
    <SectionHeader title="Today" />
    <SectionHeader title="Open matters" count={12} />
    <SectionHeader title="Recent activity" action="See all" />
    <SectionHeader title="Overdue invoices" count={2} action="All AR" />
  </div>
);

export const AboveList = () => (
  <div style={{ maxWidth: 358 }}>
    <SectionHeader title="Upcoming deadlines" count={2} action="Calendar" />
    <List>
      <ListRow
        lead={<TimeBlock main="Oct 3" sub="Fri" />}
        title="File estate inventory"
        subtitle={
          <>
            Estate of Bennett <RowSep /> Probate
          </>
        }
        pill={
          <Pill tone="warning" dot>
            In 4 days
          </Pill>
        }
        pressable
      />
      <ListRow
        lead={<TimeBlock main="Oct 24" sub="Fri" />}
        title="Discovery cutoff"
        subtitle="Alvarez v. Meridian"
        pill={<Pill>In 3 weeks</Pill>}
        pressable
      />
    </List>
  </div>
);
