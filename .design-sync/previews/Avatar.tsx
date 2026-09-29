import { Avatar, List, ListRow, Mono, RowSep } from '@lawfirm/ui-web';

export const Sizes = () => (
  <div className="cl-inline" style={{ gap: 14 }}>
    <Avatar name="Dana Okafor" size="xs" />
    <Avatar name="Dana Okafor" size="sm" />
    <Avatar name="Dana Okafor" />
    <Avatar name="Dana Okafor" size="lg" />
    <Avatar name="Dana Okafor" size="xl" />
  </div>
);

export const Organisations = () => (
  <div className="cl-inline" style={{ gap: 14 }}>
    <Avatar kind="org" icon="building" size="sm" />
    <Avatar kind="org" initials="KH" />
    <Avatar kind="org" initials="ML" size="lg" />
    <Avatar kind="org" icon="building" size="xl" />
  </div>
);

export const Tones = () => (
  <div className="cl-inline" style={{ gap: 14 }}>
    <Avatar name="Lisa Tran" />
    <Avatar name="J. Whitfield" />
    <Avatar name="Dana Okafor" tone="accent" />
    <Avatar initials="+3" tone="ink" />
  </div>
);

export const InRows = () => (
  <div style={{ maxWidth: 358 }}>
    <List>
      <ListRow
        lead={<Avatar name="Margaret Bennett" />}
        title="Margaret Bennett"
        subtitle={
          <>
            Client <RowSep /> Estate of Harold Bennett
          </>
        }
        chevron
        pressable
      />
      <ListRow
        lead={<Avatar kind="org" initials="KH" />}
        title="Kessler Holdings LLC"
        subtitle={
          <>
            Client <RowSep /> <Mono>2026-0201</Mono>
          </>
        }
        chevron
        pressable
      />
      <ListRow
        lead={<Avatar name="Dana Okafor" tone="accent" />}
        title="Dana Okafor"
        subtitle={
          <>
            Partner <RowSep /> you
          </>
        }
        chevron
        pressable
      />
    </List>
  </div>
);
