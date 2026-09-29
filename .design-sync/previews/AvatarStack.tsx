import { Avatar, AvatarStack, List, ListRow, Mono, RowSep, Text } from '@lawfirm/ui-web';

export const Team = () => (
  <AvatarStack>
    <Avatar size="sm" name="Dana Okafor" tone="accent" />
    <Avatar size="sm" name="Lisa Tran" />
    <Avatar size="sm" name="J. Whitfield" />
    <Avatar size="sm" tone="ink" initials="+3" />
  </AvatarStack>
);

export const Sizes = () => (
  <div className="cl-inline" style={{ gap: 20 }}>
    <AvatarStack>
      <Avatar size="sm" name="Dana Okafor" tone="accent" />
      <Avatar size="sm" name="Lisa Tran" />
      <Avatar size="sm" tone="ink" initials="+2" />
    </AvatarStack>
    <AvatarStack>
      <Avatar name="Dana Okafor" tone="accent" />
      <Avatar name="Lisa Tran" />
      <Avatar tone="ink" initials="+2" />
    </AvatarStack>
    <AvatarStack>
      <Avatar size="lg" name="Dana Okafor" tone="accent" />
      <Avatar size="lg" name="Lisa Tran" />
      <Avatar size="lg" tone="ink" initials="+2" />
    </AvatarStack>
  </div>
);

export const MatterTeam = () => (
  <div style={{ maxWidth: 358 }} className="cl-stack">
    <div className="cl-spread">
      <div className="cl-stack cl-stack--xs">
        <Text variant="body-strong">Working on this matter</Text>
        <Text variant="caption" tone="muted">
          D. Okafor (lead) · L. Tran · J. Whitfield · 3 staff
        </Text>
      </div>
      <AvatarStack>
        <Avatar size="sm" name="Dana Okafor" tone="accent" />
        <Avatar size="sm" name="Lisa Tran" />
        <Avatar size="sm" name="J. Whitfield" />
        <Avatar size="sm" tone="ink" initials="+3" />
      </AvatarStack>
    </div>
    <List>
      <ListRow
        title="Estate of Harold Bennett"
        subtitle={
          <>
            Probate <RowSep /> <Mono>2026-0187</Mono>
          </>
        }
        trail={
          <AvatarStack>
            <Avatar size="sm" name="Dana Okafor" tone="accent" />
            <Avatar size="sm" name="Lisa Tran" />
          </AvatarStack>
        }
        pressable
      />
      <ListRow
        title="Alvarez v. Meridian Logistics"
        subtitle={
          <>
            Personal injury <RowSep /> <Mono>2026-0142</Mono>
          </>
        }
        trail={
          <AvatarStack>
            <Avatar size="sm" name="J. Whitfield" />
            <Avatar size="sm" name="Lisa Tran" />
            <Avatar size="sm" tone="ink" initials="+2" />
          </AvatarStack>
        }
        pressable
      />
    </List>
  </div>
);
