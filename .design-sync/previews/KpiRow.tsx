import { KpiRow, KpiTile } from '@lawfirm/ui-web';

export const TwoColumns = () => (
  <div style={{ maxWidth: 358 }}>
    <KpiRow>
      <KpiTile
        label="Outstanding"
        value="$33,125"
        delta="$8,125 overdue"
        deltaTone="down"
        deltaIcon="alert"
      />
      <KpiTile
        label="Collected · 30d"
        value="$12,450"
        delta="18% vs prior 30d"
        deltaTone="up"
        deltaIcon="arrow-up-right"
      />
    </KpiRow>
  </div>
);

export const ThreeColumns = () => (
  <div className="cl-web" style={{ maxWidth: 720 }}>
    <KpiRow columns={3}>
      <KpiTile tint label="Billed today" value="3.4" unit="of 6h" progress={57} />
      <KpiTile label="Unbilled" value="$17,325" delta="12 entries · 3 matters" />
      <KpiTile
        label="Outstanding"
        value="$33,125"
        delta="$8,125 overdue"
        deltaTone="down"
        deltaIcon="alert"
      />
    </KpiRow>
  </div>
);

export const FourColumns = () => (
  <div className="cl-web" style={{ maxWidth: 900 }}>
    <KpiRow columns={4}>
      <KpiTile
        label="Billed this week"
        value="21.4"
        unit="h"
        delta="3.1h vs last week"
        deltaTone="up"
        deltaIcon="arrow-up-right"
      />
      <KpiTile label="Realization" value="91" unit="%" delta="Legal Trends median 84%" />
      <KpiTile
        label="Days to paid"
        value="6.2"
        delta="from 14 before pay links"
        deltaTone="up"
        deltaIcon="arrow-down-right"
      />
      <KpiTile
        label="Trust · unreconciled"
        value="0"
        delta="3-way match Sep 1"
        deltaTone="up"
        deltaIcon="check"
      />
    </KpiRow>
  </div>
);
