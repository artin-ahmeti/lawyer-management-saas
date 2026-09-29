import { List, ListRow, Mono, Pill, RowSep } from '@lawfirm/ui-web';

export const InSubtitles = () => (
  <div style={{ maxWidth: 358 }}>
    <List>
      <ListRow
        title="Alvarez v. Meridian Logistics"
        subtitle={
          <>
            Sofia Alvarez <RowSep /> Personal injury <RowSep /> <Mono>2026-0142</Mono>
          </>
        }
        chevron
        pressable
      />
      <ListRow
        title="Kessler Holdings — Series B"
        subtitle={
          <>
            Kessler Holdings LLC <RowSep /> Corporate <RowSep /> Flat fee
          </>
        }
        chevron
        pressable
      />
    </List>
  </div>
);

export const WithIdentifiers = () => (
  <div style={{ maxWidth: 358 }}>
    <List>
      <ListRow
        title="Margaret Bennett"
        subtitle={
          <>
            <Mono>INV-2026-078</Mono> <RowSep /> Estate of Bennett <RowSep /> due Aug 14
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
        regular
        title="Draft inventory schedules"
        subtitle={
          <>
            Estate of Bennett <RowSep /> <Mono>L110</Mono> <RowSep /> D. Okafor
          </>
        }
        value="1.6h"
      />
    </List>
  </div>
);
