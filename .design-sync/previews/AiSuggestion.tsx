import { AiSuggestion, Field, Textarea } from '@lawfirm/ui-web';

export const Cleanup = () => (
  <div style={{ maxWidth: 358 }}>
    <AiSuggestion
      label="Suggested cleanup · not applied"
      text="Telephone conference with opposing counsel regarding warranty provisions; reviewed Schedule 3.2; agreed on redline delivery by Friday."
      actions={[{ label: 'Use this' }, { label: 'Edit', quiet: true }, { label: 'Dismiss', quiet: true }]}
    />
  </div>
);

export const DraftFromActivity = () => (
  <div style={{ maxWidth: 358 }}>
    <AiSuggestion
      label="Draft from today’s activity"
      text="We filed the inventory with the court today. Nothing is needed from you this week; the next step is the creditor notice period, which runs to Nov 12."
      actions={[{ label: 'Insert' }, { label: 'Dismiss', quiet: true }]}
    />
  </div>
);

export const UnderNarrative = () => (
  <div style={{ maxWidth: 358 }}>
    <Field label="Narrative">
      <Textarea defaultValue="called opp counsel re warranties, went thru schedule 3.2, agreed to redline by fri" />
      <AiSuggestion
        label="Suggested cleanup · not applied"
        text="Telephone conference with opposing counsel regarding warranty provisions; reviewed Schedule 3.2; agreed on redline delivery by Friday."
        actions={[{ label: 'Use this' }, { label: 'Edit', quiet: true }, { label: 'Dismiss', quiet: true }]}
      />
    </Field>
  </div>
);

export const WithDisclosure = () => (
  <div style={{ maxWidth: 358 }}>
    <AiSuggestion
      label="Suggested cleanup · not applied"
      text={
        <>
          Drafted Inventory and Appraisal Schedules A and B; reconciled asset values with appraiser’s
          report.
          <span className="cl-t-caption cl-muted" style={{ display: 'block', marginTop: 6 }}>
            Drafted by AI from your notes. You review it before it is billed; nothing from this matter
            is used to train models.
          </span>
        </>
      }
      actions={[{ label: 'Use this' }, { label: 'Dismiss', quiet: true }]}
    />
  </div>
);
