import { IconButton, NavBar, Pill, RowSep, Text } from '@lawfirm/ui-web';

export const MatterDetail = () => (
  <div style={{ maxWidth: 358, padding: '0 8px' }}>
    <NavBar
      back="Matters"
      title="2026-0187"
      mono
      actions={
        <>
          <IconButton plain icon="play" label="Start timer" />
          <IconButton plain icon="more" label="More" />
        </>
      }
    />
  </div>
);

export const PlainTitle = () => (
  <div style={{ maxWidth: 358, padding: '0 8px' }}>
    <NavBar
      back="Billing"
      title="Invoices"
      actions={<IconButton plain icon="sliders" label="Filter" />}
    />
  </div>
);

export const WithTitleBlock = () => (
  <div style={{ maxWidth: 358, padding: '0 8px' }}>
    <NavBar
      back="Matters"
      title="2026-0187"
      mono
      actions={
        <>
          <IconButton plain icon="play" label="Start timer" />
          <IconButton plain icon="more" label="More" />
        </>
      }
    />
    <div className="cl-stack cl-stack--xs" style={{ marginTop: 6 }}>
      <Text variant="title-2" as="h1">
        Estate of Harold Bennett
      </Text>
      <Text variant="label" tone="muted" as="div">
        Margaret Bennett <RowSep /> Probate <RowSep /> L. Tran
      </Text>
      <div className="cl-inline" style={{ marginTop: 6 }}>
        <Pill tone="accent">Open</Pill>
        <Pill tone="outline">Hourly · $325</Pill>
        <Pill tone="outline" icon="lock">
          Trust $18,240.00
        </Pill>
      </div>
    </div>
  </div>
);
