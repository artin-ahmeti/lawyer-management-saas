import { Chip, ChipGroup, ClepsoRoot } from '@lawfirm/ui-web';

export const Counts = () => (
  <div style={{ maxWidth: 358 }}>
    <ChipGroup>
      <Chip active count={12}>
        All
      </Chip>
      <Chip count={9}>Open</Chip>
      <Chip count={5}>Mine</Chip>
      <Chip>Closed</Chip>
    </ChipGroup>
  </div>
);

export const IconsAndTrailing = () => (
  <div style={{ maxWidth: 358 }}>
    <ChipGroup>
      <Chip icon="sliders">Filters</Chip>
      <Chip trailing="chevron">Practice area</Chip>
      <Chip active trailing="close">
        Probate
      </Chip>
    </ChipGroup>
  </div>
);

export const States = () => (
  <div className="cl-inline">
    <Chip>Open</Chip>
    <Chip active>Open</Chip>
    <Chip count={9}>Open</Chip>
    <Chip active count={9}>
      Open
    </Chip>
  </div>
);

export const Dark = () => (
  <ClepsoRoot theme="dark" style={{ padding: 12, borderRadius: 12 }}>
    <ChipGroup>
      <Chip active count={12}>
        All
      </Chip>
      <Chip count={9}>Open</Chip>
      <Chip count={5}>Mine</Chip>
      <Chip trailing="chevron">Stage</Chip>
    </ChipGroup>
  </ClepsoRoot>
);
