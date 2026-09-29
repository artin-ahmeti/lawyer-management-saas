import { Grid, KpiTile } from '@lawfirm/ui-web';

export const KpiPair = () => (
  <div style={{ maxWidth: 358 }}>
    <Grid columns={2}>
      <KpiTile
        label="Unbilled"
        value="$4,825.00"
        delta="+$520.00 today"
        deltaTone="up"
        deltaIcon="arrow-up-right"
      />
      <KpiTile label="Hours today" value="3.4" unit="of 6h" progress={57} />
    </Grid>
  </div>
);

export const WebKpis = () => (
  <div className="cl-web">
    <Grid columns={4}>
      <KpiTile
        label="Unbilled"
        value="$17,325.00"
        delta="+$1,105.00 this week"
        deltaTone="up"
        deltaIcon="arrow-up-right"
        tint
      />
      <KpiTile
        label="Overdue AR"
        value="$8,125.00"
        delta="1 invoice · 46 days"
        deltaTone="down"
        deltaIcon="arrow-down-right"
      />
      <KpiTile label="Trust · IOLTA ····4821" value="$18,240.00" delta="Reconciled Sep 26" />
      <KpiTile label="Hours this week" value="31.2" unit="of 40h" progress={78} />
    </Grid>
  </div>
);
