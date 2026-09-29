import { Mono, OptionRow, Radio } from '@lawfirm/ui-web';

export const States = () => (
  <div className="cl-inline">
    <Radio checked={false} />
    <Radio checked />
  </div>
);

export const AccountChoice = () => (
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

export const BillingModel = () => (
  <div style={{ maxWidth: 358 }}>
    <OptionRow
      controlPosition="start"
      label="Hourly"
      hint="$325.00 / hr · Dana Okafor"
      control={<Radio checked />}
    />
    <OptionRow
      controlPosition="start"
      label="Flat fee"
      hint="One amount for the whole matter"
      control={<Radio checked={false} />}
    />
    <OptionRow
      controlPosition="start"
      label="Contingency"
      hint="Percentage of recovery"
      control={<Radio checked={false} />}
    />
  </div>
);
