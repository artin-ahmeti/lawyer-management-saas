import { List, ListRow, Mono, Pill, RowSep, TimeBlock } from '@lawfirm/ui-web';

export const Agenda = () => (
  <div style={{ maxWidth: 358 }}>
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
        lead={<TimeBlock main="11:00" sub="AM" />}
        title="Appraisal review · M. Bennett"
        subtitle={
          <>
            Estate of Bennett <RowSep /> Phone
          </>
        }
        pill={<Pill>Call</Pill>}
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
    </List>
  </div>
);

export const TimeEntries = () => (
  <div style={{ maxWidth: 358 }}>
    <List>
      <ListRow
        lead={<TimeBlock main="1:36" sub="Sep 29" />}
        regular
        title="Draft inventory schedules"
        subtitle={
          <>
            Estate of Bennett <RowSep /> <Mono>L110</Mono>
          </>
        }
        value="$520.00"
        pill={<Pill tone="success">Billable</Pill>}
      />
      <ListRow
        lead={<TimeBlock main="0:24" sub="Sep 29" />}
        regular
        title="Call · Sofia Alvarez"
        subtitle={
          <>
            Alvarez v. Meridian <RowSep /> <Mono>L330</Mono>
          </>
        }
        value="$130.00"
        pill={<Pill tone="success">Billable</Pill>}
      />
      <ListRow
        lead={<TimeBlock main="0:30" sub="Sep 26" />}
        regular
        title="Conflict check · Kessler"
        subtitle={
          <>
            Kessler — Series B <RowSep /> <Mono>A101</Mono>
          </>
        }
        value="—"
        pill={<Pill tone="outline">Flat fee</Pill>}
      />
    </List>
  </div>
);
