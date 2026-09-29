import { ClepsoRoot, Toast } from '@lawfirm/ui-web';

export const Stacked = () => (
  <div className="cl-stack" style={{ alignItems: 'flex-start' }}>
    <Toast message="Time entry saved · 1.6h to Estate of Bennett" action="Undo" />
    <Toast message="Pay link texted to Margaret Bennett" />
    <Toast tone="danger" message="Couldn’t send · no signal. Queued to retry." />
  </div>
);

export const WithAction = () => (
  <div className="cl-stack" style={{ alignItems: 'flex-start' }}>
    <Toast message="Timer started · People v. Webb" action="Switch matter" />
    <Toast message="Invoice INV-2026-078 sent · $8,125.00" action="View" />
  </div>
);

export const DarkTheme = () => (
  <ClepsoRoot theme="dark" style={{ padding: 16, borderRadius: 12 }}>
    <div className="cl-stack" style={{ alignItems: 'flex-start' }}>
      <Toast message="Timer started · People v. Webb" action="Switch matter" />
      <Toast tone="danger" message="Couldn’t send · no signal. Queued to retry." />
    </div>
  </ClepsoRoot>
);
