'use client';

import {
  Avatar,
  Banner,
  Button,
  Card,
  KpiTile,
  Pill,
  SegmentedControl,
  Table,
} from '@lawfirm/ui-web';
import { useState } from 'react';
import { Page, QueryGate } from '@/components/PageState';
import { useReports } from '@/lib/data';
import { csv, downloadFile } from '@/lib/download';

export function ReportsPage() {
  const reports = useReports();
  const [tab, setTab] = useState('Utilization');
  const report = reports.data?.find((r) => r.key === tab);
  return (
    <QueryGate routeKey="reports" queries={[reports]}>
      <Page>
        <div className="cl-pagehead">
          <div>
            <h1>Reports</h1>
            <div className="cl-t-caption cl-muted" style={{ marginTop: 4 }}>
              September 2026 · firm · benchmarks from 1,240 small firms
            </div>
          </div>
          <div className="cl-pagehead__actions">
            <SegmentedControl
              value={tab}
              onChange={setTab}
              items={['Utilization', 'Realization', 'Collection'].map((t) => ({
                value: t,
                label: t,
              }))}
            />
            <Button
              icon="download"
              onClick={() =>
                report &&
                downloadFile(
                  `clepso-${tab.toLowerCase()}.csv`,
                  csv([
                    ['Timekeeper', ...report.columns, 'vs benchmark'],
                    ...report.rows.map((r) => [r.name, r.c1, r.c2, r.c3, r.bench]),
                  ]),
                )
              }
            >
              Export
            </Button>
          </div>
        </div>
        {report ? (
          <>
            <div className="cl-grid-4">
              {report.kpis.map((k) => (
                <KpiTile
                  key={k.label}
                  label={k.label}
                  value={k.value}
                  delta={k.delta}
                  deltaTone={k.trend === 'flat' ? 'neutral' : k.trend}
                  tint={k.tint}
                />
              ))}
            </div>
            <div className="cl-cols cl-cols--2">
              <Card>
                <div
                  className="cl-chart"
                  role="img"
                  aria-label={`${report.chartTitle}: ${report.bars.map((b) => `${b.x} ${b.label}`).join(', ')}`}
                >
                  <div className="cl-chart__title">
                    <span>{report.chartTitle}</span>
                    <span className="cl-num">{report.chartValue}</span>
                  </div>
                  <div className="cl-bars" style={{ height: 160 }}>
                    <div className="cl-bars__goal" style={{ bottom: `${report.goalPct}%` }}>
                      <span>{report.goalLabel}</span>
                    </div>
                    {report.bars.map((b, i) => (
                      <div
                        className={`cl-bars__bar ${i === report.bars.length - 1 ? 'is-today' : ''}`}
                        key={b.x}
                        style={{
                          height: `${b.pct}%`,
                          transition: 'height 600ms var(--ease-standard)',
                        }}
                      >
                        <span>{b.label}</span>
                      </div>
                    ))}
                  </div>
                  <div className="cl-bars__labels">
                    {report.bars.map((b) => (
                      <span key={b.x}>{b.x}</span>
                    ))}
                  </div>
                </div>
              </Card>
              <div>
                <div className="cl-section">
                  <span className="cl-section__title">By timekeeper</span>
                </div>
                <Table
                  compact
                  columns={[
                    { key: 'name', header: 'Timekeeper' },
                    ...report.columns.map((c, i) => ({
                      key: String(i),
                      header: c,
                      align: 'right' as const,
                    })),
                    { key: 'benchmark', header: 'vs benchmark' },
                  ]}
                  rows={report.rows.map((r) => ({
                    id: r.name,
                    strong: [3],
                    cells: [
                      <span key="name" className="cl-inline cl-inline--nowrap">
                        <Avatar size="xs" initials={r.initials} />
                        {r.name}
                      </span>,
                      r.c1,
                      r.c2,
                      r.c3,
                      <Pill key="benchmark" tone={r.tone}>
                        {r.bench}
                      </Pill>,
                    ],
                  }))}
                />
                <Banner
                  compact
                  tone="outline"
                  icon="chart"
                  title={report.insight}
                  style={{ marginTop: 12 }}
                />
              </div>
            </div>
          </>
        ) : null}
      </Page>
    </QueryGate>
  );
}
