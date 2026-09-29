import { StageTracker } from '@lawfirm/ui-web';

export const Probate = () => (
  <div style={{ maxWidth: 358 }}>
    <StageTracker
      stages={[
        { label: 'Intake', state: 'done' },
        { label: 'Petition', state: 'done' },
        { label: 'Inventory', state: 'current' },
        { label: 'Creditors' },
        { label: 'Distribution' },
        { label: 'Close' },
      ]}
    />
  </div>
);

export const PersonalInjury = () => (
  <div style={{ maxWidth: 358 }}>
    <StageTracker
      stages={[
        { label: 'Intake', state: 'done' },
        { label: 'Treatment', state: 'done' },
        { label: 'Demand', state: 'done' },
        { label: 'Discovery', state: 'current' },
        { label: 'Mediation' },
        { label: 'Trial' },
      ]}
    />
  </div>
);

export const Client = () => (
  <div style={{ maxWidth: 358 }}>
    <StageTracker
      variant="client"
      stages={[
        { label: 'We opened your case and filed the petition', state: 'done' },
        {
          label: 'Inventory',
          state: 'current',
          next: (
            <>
              Next: we file the estate inventory with the court by <b>Oct 3</b>. Nothing is needed
              from you.
            </>
          ),
        },
        { label: 'Creditor notice period (about 4 months)' },
        { label: 'Distribution and closing' },
      ]}
    />
  </div>
);
