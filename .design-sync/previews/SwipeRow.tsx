import { Checkbox, IconWell, List, ListRow, Mono, Pill, RowSep, SwipeRow, TimeBlock } from '@lawfirm/ui-web';

export const TaskActions = () => (
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
        meta="Fri, Oct 3"
        metaTone="warning"
      />
      <SwipeRow
        actions={[
          { label: 'Timer', icon: 'play', tone: 'accent' },
          { label: 'Done', icon: 'check', tone: 'success' },
        ]}
      >
        <ListRow
          style={{ minWidth: 0 }}
          lead={<Checkbox checked={false} label="Done" />}
          regular
          title="Prep witness outline"
          subtitle={
            <>
              People v. Webb <RowSep /> D. Okafor
            </>
          }
        />
      </SwipeRow>
      <ListRow
        lead={<Checkbox checked={false} label="Done" />}
        regular
        title="Send engagement letter to Kessler"
        subtitle="Kessler — Series B"
        meta="Oct 6"
      />
    </List>
  </div>
);

export const TimeEntryDelete = () => (
  <div style={{ maxWidth: 358 }}>
    <List>
      <SwipeRow actions={[{ label: 'Delete', icon: 'x', tone: 'danger' }]}>
        <ListRow
          style={{ minWidth: 0 }}
          lead={<TimeBlock main="1:36" sub="Sep 29" />}
          regular
          title="Draft inventory schedules"
          subtitle={
            <>
              Estate of Bennett <RowSep /> <Mono>L110</Mono>
            </>
          }
        />
      </SwipeRow>
      <ListRow
        lead={<TimeBlock main="0:24" sub="Sep 29" />}
        regular
        title="Call · Sofia Alvarez re: deposition"
        subtitle={
          <>
            Alvarez v. Meridian <RowSep /> <Mono>L330</Mono>
          </>
        }
        value="$130.00"
      />
    </List>
  </div>
);

export const MissedCall = () => (
  <div style={{ maxWidth: 358 }}>
    <List>
      <SwipeRow actions={[{ label: 'Call back', icon: 'phone', tone: 'accent' }]}>
        <ListRow
          style={{ minWidth: 0 }}
          lead={<IconWell name="phone" />}
          regular
          title="Missed · (628) 555-0147"
          subtitle="Text-back sent · 2 min ago"
        />
      </SwipeRow>
      <ListRow
        lead={<IconWell name="phone" />}
        regular
        title="Call · Sofia Alvarez · 12 min"
        subtitle="Alvarez v. Meridian · 10:12 AM"
        pill={<Pill tone="success">Billed 0.2h</Pill>}
      />
    </List>
  </div>
);
