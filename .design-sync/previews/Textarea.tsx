import { AiSuggestion, Field, Textarea } from '@lawfirm/ui-web';

export const Narrative = () => (
  <div style={{ maxWidth: 358 }}>
    <Field label="Narrative">
      <Textarea defaultValue="Drafted Inventory and Appraisal Schedules A and B; reconciled asset values with appraiser’s report." />
    </Field>
  </div>
);

export const Placeholder = () => (
  <div style={{ maxWidth: 358 }}>
    <Field label="Message to client" help="Clients see this in their app. Keep it to what happens next.">
      <Textarea placeholder="Write a plain-language update…" />
    </Field>
  </div>
);

export const WithAiCleanup = () => (
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

export const Tall = () => (
  <div style={{ maxWidth: 358 }}>
    <Field label="Internal note" optional>
      <Textarea
        style={{ minHeight: 132 }}
        defaultValue={
          'Appraiser (Cole & Reyes) confirmed real property at $1,240,000.00.\nWaiting on the Schwab brokerage statement before Schedule B is final.'
        }
      />
    </Field>
  </div>
);
