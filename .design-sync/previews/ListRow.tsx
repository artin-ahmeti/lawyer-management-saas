import { Avatar, Checkbox, IconWell, List, ListRow, Mono, Pill, RowSep, TimeBlock } from '@lawfirm/ui-web';

export const Matters = () => (
  <div style={{ maxWidth: 358 }}>
    <List>
      <ListRow
        title="Estate of Harold Bennett"
        subtitle={
          <>
            Margaret Bennett <RowSep /> Probate <RowSep /> <Mono>2026-0187</Mono>
          </>
        }
        pill={
          <Pill tone="warning" dot>
            Filing in 4d
          </Pill>
        }
        meta="$4,825.00 unbilled"
        chevron
        pressable
      />
      <ListRow
        title="Alvarez v. Meridian Logistics"
        subtitle={
          <>
            Sofia Alvarez <RowSep /> Personal injury <RowSep /> <Mono>2026-0142</Mono>
          </>
        }
        pill={<Pill tone="accent">Discovery</Pill>}
        meta="Cutoff Oct 24"
        chevron
        pressable
      />
    </List>
  </div>
);

export const TasksAndTime = () => (
  <div style={{ maxWidth: 358 }}>
    <List>
      <ListRow
        lead={<Checkbox checked={false} label="Done" />}
        regular
        title="File estate inventory with probate court"
        subtitle={
          <>
            Estate of Bennett <RowSep /> L. Tran
          </>
        }
        meta="Overdue · Sep 26"
        metaTone="danger"
      />
      <ListRow
        lead={<Checkbox checked label="Done" />}
        regular
        done
        title="Send engagement letter to Kessler"
        subtitle="Kessler — Series B"
        meta="Done · Sep 20"
      />
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
    </List>
  </div>
);

export const InvoicesAndContacts = () => (
  <div style={{ maxWidth: 358 }} className="cl-stack">
    <List>
      <ListRow
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
        pressable
      />
      <ListRow
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
        pressable
      />
    </List>
    <List>
      <ListRow
        lead={<Avatar name="Sofia Alvarez" />}
        title="Sofia Alvarez"
        subtitle={
          <>
            Client <RowSep /> (415) 555-0132
          </>
        }
        chevron
        pressable
      />
      <ListRow
        lead={<Avatar kind="org" icon="building" />}
        title="Meridian Logistics Inc."
        subtitle={
          <>
            Opposing party <RowSep /> counsel@meridianlog.com
          </>
        }
        chevron
        pressable
      />
    </List>
  </div>
);

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
        lead={<IconWell name="phone" />}
        regular
        title="Call · Sofia Alvarez · 12 min"
        subtitle="Alvarez v. Meridian · 10:12 AM"
        trail={
          <>
            <button type="button" className="cl-btn cl-btn--primary cl-btn--sm">
              Bill 0.2h
            </button>
            <button type="button" className="cl-btn cl-btn--ghost cl-btn--sm">
              Skip
            </button>
          </>
        }
      />
    </List>
  </div>
);
