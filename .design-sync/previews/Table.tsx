import {
  Avatar,
  Button,
  CellTitle,
  Checkbox,
  Chip,
  Input,
  Mono,
  Pill,
  SegmentedControl,
  Table,
  Toolbar,
} from '@lawfirm/ui-web';

const matterColumns = [
  { key: 'sel', header: <Checkbox shape="square" checked={false} label="Select all" />, width: 36 },
  { key: 'matter', header: 'Matter' },
  { key: 'stage', header: 'Stage' },
  { key: 'resp', header: 'Responsible' },
  { key: 'unbilled', header: 'Unbilled', align: 'right' as const },
  { key: 'next', header: 'Next deadline' },
];

const person = (initials: string, name: string) => (
  <span className="cl-inline cl-inline--nowrap">
    <Avatar size="xs" initials={initials} />
    {name}
  </span>
);

const matterRows = [
  { id: 'g1', kind: 'group' as const, cells: ['Needs attention · 2'] },
  {
    id: 'bennett',
    selected: true,
    strong: [4],
    cells: [
      <Checkbox shape="square" checked label="Select" />,
      <CellTitle
        title="Estate of Harold Bennett"
        sub={
          <>
            <Mono>2026-0187</Mono> · Probate · Margaret Bennett
          </>
        }
      />,
      <Pill tone="accent">Inventory</Pill>,
      person('LT', 'L. Tran'),
      '$4,825.00',
      <Pill tone="warning" dot>
        Filing · Oct 3
      </Pill>,
    ],
  },
  {
    id: 'webb',
    strong: [4],
    cells: [
      <Checkbox shape="square" checked={false} label="Select" />,
      <CellTitle
        title="People v. Marcus Webb"
        sub={
          <>
            <Mono>2026-0119</Mono> · Criminal defense
          </>
        }
      />,
      <Pill tone="accent">Pretrial</Pill>,
      person('JW', 'J. Whitfield'),
      '$3,000.00',
      <Pill tone="danger" dot>
        Hearing · today 9:30
      </Pill>,
    ],
  },
  { id: 'g2', kind: 'group' as const, cells: ['Active · 7'] },
  {
    id: 'alvarez',
    cells: [
      <Checkbox shape="square" checked={false} label="Select" />,
      <CellTitle
        title="Alvarez v. Meridian Logistics"
        sub={
          <>
            <Mono>2026-0142</Mono> · Personal injury · Sofia Alvarez
          </>
        }
      />,
      <Pill tone="accent">Discovery</Pill>,
      person('DO', 'D. Okafor'),
      '—',
      <Pill>Cutoff · Oct 24</Pill>,
    ],
  },
  {
    id: 'kessler',
    strong: [4],
    cells: [
      <Checkbox shape="square" checked={false} label="Select" />,
      <CellTitle
        title="Kessler Holdings — Series B"
        sub={
          <>
            <Mono>2026-0201</Mono> · Corporate · flat fee
          </>
        }
      />,
      <Pill tone="accent">Diligence</Pill>,
      person('DO', 'D. Okafor'),
      '$12,500.00',
      <span className="cl-muted">—</span>,
    ],
  },
  {
    id: 'foot',
    kind: 'foot' as const,
    cells: ['', '9 matters', '', '', '$20,325.00', ''],
  },
];

export const Matters = () => (
  <div className="cl-web">
    <Table columns={matterColumns} rows={matterRows} />
  </div>
);

export const CompactInvoices = () => (
  <div className="cl-web">
    <Table
      compact
      columns={[
        { key: 'inv', header: 'Invoice' },
        { key: 'client', header: 'Client' },
        { key: 'status', header: 'Status' },
        { key: 'issued', header: 'Issued' },
        { key: 'due', header: 'Due' },
        { key: 'amount', header: 'Amount', align: 'right' },
      ]}
      rows={[
        { id: 'g1', kind: 'group', cells: ['Overdue · 1'] },
        {
          id: 'inv078',
          selected: true,
          strong: [5],
          cells: [
            <CellTitle title={<Mono ink>INV-2026-078</Mono>} sub="Estate of Harold Bennett" />,
            'Margaret Bennett',
            <Pill tone="danger" dot>
              Overdue 46d
            </Pill>,
            'Jul 30',
            'Aug 14',
            '$8,125.00',
          ],
        },
        { id: 'g2', kind: 'group', cells: ['Sent · 1'] },
        {
          id: 'inv092',
          strong: [5],
          cells: [
            <CellTitle title={<Mono ink>INV-2026-092</Mono>} sub="Kessler Holdings — Series B" />,
            'Kessler Holdings LLC',
            <Pill tone="info">Sent</Pill>,
            'Sep 24',
            'Oct 9',
            '$25,000.00',
          ],
        },
        { id: 'g3', kind: 'group', cells: ['Paid · 1'] },
        {
          id: 'inv061',
          cells: [
            <CellTitle title={<Mono ink>INV-2026-061</Mono>} sub="Nguyen v. Cascade" />,
            'Thanh Nguyen',
            <Pill tone="success" dot>
              Paid Jul 18
            </Pill>,
            'Jun 30',
            'Jul 15',
            '$4,450.00',
          ],
        },
        { id: 'foot', kind: 'foot', cells: ['3 invoices', '', '', '', 'Outstanding', '$33,125.00'] },
      ]}
    />
  </div>
);

export const WithToolbar = () => (
  <div className="cl-web cl-stack">
    <Toolbar
      right={
        <>
          <SegmentedControl
            value="comfortable"
            items={[
              { value: 'comfortable', label: 'Comfortable' },
              { value: 'compact', label: 'Compact' },
            ]}
          />
          <Button variant="primary" icon="plus">
            New matter
          </Button>
        </>
      }
    >
      <Input search icon="search" placeholder="Search matters" style={{ width: 200 }} />
      <Chip active count={9}>
        Open
      </Chip>
      <Chip>Mine</Chip>
      <Chip trailing="chevron">Practice area</Chip>
    </Toolbar>
    <Table columns={matterColumns} rows={matterRows} />
  </div>
);
