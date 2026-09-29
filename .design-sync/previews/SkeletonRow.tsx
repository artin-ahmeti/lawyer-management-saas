import { List, ListRow, Mono, Pill, RowSep, SkeletonRow } from '@lawfirm/ui-web';

export const Rows = () => (
  <div style={{ maxWidth: 358 }}>
    <List>
      <SkeletonRow />
      <SkeletonRow />
      <SkeletonRow />
    </List>
  </div>
);

export const LoadingMore = () => (
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
        chevron
        pressable
      />
      <SkeletonRow />
      <SkeletonRow />
    </List>
  </div>
);
