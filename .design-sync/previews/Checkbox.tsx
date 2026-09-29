import { Checkbox, List, ListRow, OptionRow, RowSep } from '@lawfirm/ui-web';

export const Shapes = () => (
  <div className="cl-inline">
    <Checkbox checked={false} label="Done" />
    <Checkbox checked label="Done" />
    <Checkbox shape="square" checked={false} label="Select row" />
    <Checkbox shape="square" checked label="Select row" />
  </div>
);

export const TaskList = () => (
  <div style={{ maxWidth: 358 }}>
    <List>
      <ListRow
        lead={<Checkbox checked={false} label="Done" />}
        regular
        title="File estate inventory"
        subtitle={
          <>
            Estate of Bennett <RowSep /> L. Tran
          </>
        }
        meta="Overdue · Sep 26"
        metaTone="danger"
      />
      <ListRow
        lead={<Checkbox checked={false} label="Done" />}
        regular
        title="Serve discovery on Meridian"
        subtitle={
          <>
            Alvarez v. Meridian <RowSep /> D. Okafor
          </>
        }
        meta="Fri, Oct 3"
      />
      <ListRow
        lead={<Checkbox checked label="Done" />}
        regular
        done
        title="Send engagement letter"
        subtitle="Kessler — Series B"
        meta="Done · Sep 20"
      />
    </List>
  </div>
);

export const FormOptions = () => (
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
