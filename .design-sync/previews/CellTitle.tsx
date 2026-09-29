import { CellTitle, Mono, Pill, Table } from '@lawfirm/ui-web';

export const MatterCells = () => (
  <div className="cl-web">
    <Table
      columns={[
        { key: 'matter', header: 'Matter' },
        { key: 'client', header: 'Client' },
        { key: 'stage', header: 'Stage' },
        { key: 'unbilled', header: 'Unbilled', align: 'right' },
      ]}
      rows={[
        {
          id: 'bennett',
          strong: [3],
          cells: [
            <CellTitle
              title="Estate of Harold Bennett"
              sub={
                <>
                  <Mono>2026-0187</Mono> · Probate
                </>
              }
            />,
            'Margaret Bennett',
            <Pill tone="accent">Inventory</Pill>,
            '$4,825.00',
          ],
        },
        {
          id: 'webb',
          strong: [3],
          cells: [
            <CellTitle
              title="People v. Marcus Webb"
              sub={
                <>
                  <Mono>2026-0119</Mono> · Criminal defense
                </>
              }
            />,
            'Marcus Webb',
            <Pill tone="accent">Pretrial</Pill>,
            '$3,000.00',
          ],
        },
        {
          id: 'alvarez',
          cells: [
            <CellTitle
              title="Alvarez v. Meridian Logistics"
              sub={
                <>
                  <Mono>2026-0142</Mono> · Personal injury
                </>
              }
            />,
            'Sofia Alvarez',
            <Pill tone="accent">Discovery</Pill>,
            '—',
          ],
        },
      ]}
    />
  </div>
);

export const TitleOnlyAndWithSub = () => (
  <div className="cl-web">
    <Table
      compact
      columns={[
        { key: 'who', header: 'Client' },
        { key: 'inv', header: 'Invoice' },
        { key: 'status', header: 'Status' },
        { key: 'amount', header: 'Amount', align: 'right' },
      ]}
      rows={[
        {
          id: 'bennett',
          strong: [3],
          cells: [
            <CellTitle title="Margaret Bennett" />,
            <CellTitle title={<Mono ink>INV-2026-078</Mono>} sub="Estate of Harold Bennett" />,
            <Pill tone="danger" dot>
              Overdue 46d
            </Pill>,
            '$8,125.00',
          ],
        },
        {
          id: 'kessler',
          strong: [3],
          cells: [
            <CellTitle title="Kessler Holdings LLC" sub="Flat fee · Series B" />,
            <CellTitle title={<Mono ink>INV-2026-092</Mono>} sub="Kessler Holdings — Series B" />,
            <Pill tone="info">Sent · due Oct 9</Pill>,
            '$25,000.00',
          ],
        },
        {
          id: 'nguyen',
          cells: [
            <CellTitle title="Thanh Nguyen" />,
            <CellTitle title={<Mono ink>INV-2026-061</Mono>} sub="Nguyen v. Cascade" />,
            <Pill tone="success" dot>
              Paid Jul 18
            </Pill>,
            '$4,450.00',
          ],
        },
      ]}
    />
  </div>
);
