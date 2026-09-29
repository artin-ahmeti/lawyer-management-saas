import { Button, Chip, Input, SegmentedControl, Toolbar } from '@lawfirm/ui-web';

export const Matters = () => (
  <div className="cl-web">
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
  </div>
);

export const Invoices = () => (
  <div className="cl-web">
    <Toolbar
      right={
        <>
          <Button variant="secondary" icon="download">
            Export
          </Button>
          <Button variant="primary" icon="plus">
            New invoice
          </Button>
        </>
      }
    >
      <Input search icon="search" placeholder="Search invoices" style={{ width: 200 }} />
      <Chip active count={12}>
        All
      </Chip>
      <Chip count={1}>Overdue</Chip>
      <Chip count={4}>Sent</Chip>
      <Chip trailing="close">Sep 2026</Chip>
    </Toolbar>
  </div>
);

export const SearchOnly = () => (
  <div className="cl-web">
    <Toolbar
      right={
        <Button variant="secondary" icon="sliders">
          Filters
        </Button>
      }
    >
      <Input search icon="search" placeholder="Search contacts" style={{ width: 320 }} />
    </Toolbar>
  </div>
);
