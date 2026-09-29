import { Checkbox, Mono, OptionRow, Radio, Switch } from '@lawfirm/ui-web';

export const Switches = () => (
  <div style={{ maxWidth: 358 }}>
    <OptionRow label="Billable" control={<Switch checked />} />
    <div className="cl-divider" />
    <OptionRow
      label="Courthouse mode"
      hint="Silent, dark, quick notes"
      control={<Switch checked={false} />}
    />
    <div className="cl-divider" />
    <OptionRow label="Stay signed in with Face ID" control={<Switch checked />} />
  </div>
);

export const RadiosAtStart = () => (
  <div style={{ maxWidth: 358 }}>
    <OptionRow
      controlPosition="start"
      label="Operating account"
      hint="Earned fees and costs"
      control={<Radio checked />}
    />
    <OptionRow
      controlPosition="start"
      label={
        <>
          Trust · IOLTA <Mono>····4821</Mono>
        </>
      }
      hint="Retainers and unearned funds · $18,240.00"
      control={<Radio checked={false} />}
    />
  </div>
);

export const CheckboxesAtStart = () => (
  <div style={{ maxWidth: 358 }}>
    <OptionRow
      controlPosition="start"
      label="Email invoice to Margaret Bennett"
      control={<Checkbox shape="square" checked label="Email invoice" />}
    />
    <OptionRow
      controlPosition="start"
      label="Text pay link to (415) 555-0132"
      control={<Checkbox shape="square" checked label="Text pay link" />}
    />
    <OptionRow
      controlPosition="start"
      label="Attach time detail"
      hint="Itemized entries with narratives"
      control={<Checkbox shape="square" checked={false} label="Attach time detail" />}
    />
  </div>
);
