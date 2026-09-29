import { Mono, StackedBar } from '@lawfirm/ui-web';

export const ArAging = () => (
  <div style={{ maxWidth: 358 }}>
    <StackedBar
      title="Accounts receivable · aging"
      total="$33,125"
      segments={[
        { label: 'Current', value: 20500, display: '$20,500', step: 2 },
        { label: '1–30', value: 4500, display: '$4,500', step: 3 },
        { label: '31–60', value: 8125, display: '$8,125', step: 5 },
      ]}
    />
  </div>
);

export const TrustByMatter = () => (
  <div style={{ maxWidth: 358 }}>
    <StackedBar
      title={
        <>
          Trust · IOLTA <Mono>····4821</Mono>
        </>
      }
      total="$18,240.00"
      segments={[
        { label: 'Estate of Bennett', value: 9800, display: '$9,800.00', step: 2 },
        { label: 'Alvarez v. Meridian', value: 6240, display: '$6,240.00', step: 4 },
        { label: 'People v. Webb', value: 2200, display: '$2,200.00', step: 6 },
      ]}
    />
  </div>
);

export const UnbilledDefaultSteps = () => (
  <div style={{ maxWidth: 358 }}>
    <StackedBar
      title="Unbilled · by matter"
      total="$17,325"
      segments={[
        { label: 'Kessler — Series B', value: 7500 },
        { label: 'Alvarez v. Meridian', value: 5000 },
        { label: 'Estate of Bennett', value: 4825 },
      ]}
    />
  </div>
);
