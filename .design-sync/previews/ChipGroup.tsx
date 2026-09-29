import { Chip, ChipGroup } from '@lawfirm/ui-web';

export const MatterFilters = () => (
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

export const AppliedFilters = () => (
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

export const Overflow = () => (
  <div style={{ maxWidth: 358 }}>
    <ChipGroup>
      <Chip active count={48}>
        All
      </Chip>
      <Chip count={14}>Probate</Chip>
      <Chip count={11}>Corporate</Chip>
      <Chip count={9}>Personal injury</Chip>
      <Chip count={6}>Criminal defense</Chip>
      <Chip count={5}>Family</Chip>
      <Chip count={3}>Estate planning</Chip>
    </ChipGroup>
  </div>
);
