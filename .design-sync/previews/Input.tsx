import { ClepsoRoot, Field, Input } from '@lawfirm/ui-web';

export const States = () => (
  <div style={{ maxWidth: 358 }} className="cl-form">
    <Field label="Email">
      <Input type="email" placeholder="you@firm.com" />
    </Field>
    <Field label="Client name" help="Conflict check runs as you type.">
      <Input focused defaultValue="Margaret Bennett" />
    </Field>
    <Field label="Matter number" error="Already used by Estate of Harold Bennett.">
      <Input defaultValue="2026-0187" />
    </Field>
    <Field label="Responsible attorney" optional>
      <Input disabled defaultValue="L. Tran" />
    </Field>
  </div>
);

export const Search = () => (
  <div style={{ maxWidth: 358 }}>
    <Input search icon="search" placeholder="Search matters, contacts, invoices" />
  </div>
);

export const WithIcon = () => (
  <div style={{ maxWidth: 358 }} className="cl-form">
    <Field label="Phone">
      <Input icon="phone" defaultValue="(415) 555-0177" />
    </Field>
    <Field label="Date">
      <Input icon="calendar" defaultValue="Mon, Sep 29" />
    </Field>
  </div>
);

export const Amount = () => (
  <div style={{ maxWidth: 358 }} className="cl-form">
    <Field label="Hourly rate">
      <Input amount prefix="$" suffix="/ hr" defaultValue="325.00" />
    </Field>
    <Field label="Amount" help="1.6h × $325.00">
      <Input amount prefix="$" defaultValue="520.00" />
    </Field>
  </div>
);

export const Dark = () => (
  <ClepsoRoot theme="dark" style={{ padding: 14, borderRadius: 12, maxWidth: 358 }}>
    <div className="cl-form">
      <Field label="Email">
        <Input type="email" placeholder="you@firm.com" />
      </Field>
      <Input search icon="search" placeholder="Search" />
    </div>
  </ClepsoRoot>
);
