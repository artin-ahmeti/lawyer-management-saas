import { Breadcrumbs, Mono } from '@lawfirm/ui-web';

export const Matter = () => (
  <div className="cl-web">
    <Breadcrumbs items={['Matters', 'Probate', <Mono ink>2026-0187</Mono>]} />
  </div>
);

export const Invoice = () => (
  <div className="cl-web">
    <Breadcrumbs items={['Billing', 'Invoices', <Mono ink>INV-2026-078</Mono>]} />
  </div>
);

export const Contact = () => (
  <div className="cl-web">
    <Breadcrumbs items={['Contacts', 'Sofia Alvarez']} />
  </div>
);
