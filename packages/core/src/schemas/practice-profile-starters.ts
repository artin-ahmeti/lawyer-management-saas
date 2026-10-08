import type { PracticeFieldDefinition, PracticeStarterKey } from './practice-profile.js';

/**
 * Generic operational starter profiles for the pp34–35 practice families (D022). A firm
 * copies one into its own profile and edits it; the copy records `basedOn` provenance.
 * Starters are not reviewed for any jurisdiction, never require a field, carry no money
 * fields, and keep court/docket fields out of transactional, advisory and agency work.
 */
export type PracticeStarter = {
  version: number;
  name: string;
  description: string;
  fields: PracticeFieldDefinition[];
};
const text = (key: string, label: string, help?: string): PracticeFieldDefinition => ({
  key,
  label,
  type: 'text',
  required: false,
  ...(help ? { help } : {}),
});
const longText = (key: string, label: string): PracticeFieldDefinition => ({
  key,
  label,
  type: 'long_text',
  required: false,
});
const date = (key: string, label: string): PracticeFieldDefinition => ({
  key,
  label,
  type: 'date',
  required: false,
});
const yesNo = (key: string, label: string): PracticeFieldDefinition => ({
  key,
  label,
  type: 'yes_no',
  required: false,
});
const choice = (key: string, label: string, options: string[]): PracticeFieldDefinition => ({
  key,
  label,
  type: 'choice',
  required: false,
  options,
});
const note = 'Generic operational starter, not reviewed for any jurisdiction.';

export const practiceStarters: Record<PracticeStarterKey, PracticeStarter> = {
  civil_litigation: {
    version: 1,
    name: 'Civil litigation',
    description: `Commercial and civil disputes. ${note}`,
    fields: [
      text('forum', 'Court or forum'),
      text('case_number', 'Case number'),
      choice('posture', 'Our side', ['Plaintiff', 'Defendant', 'Third party', 'Other']),
      choice('claim_type', 'Claim type', ['Contract', 'Tort', 'Property', 'Business', 'Other']),
      date('filed_on', 'Filed on'),
      longText('claims_summary', 'Claims summary'),
    ],
  },
  injury_insurance: {
    version: 1,
    name: 'Injury and insurance',
    description: `Personal injury, malpractice and insurance defense. ${note}`,
    fields: [
      date('incident_on', 'Incident date'),
      text('incident_location', 'Incident location'),
      text('insurer', 'Insurer'),
      text('claim_number', 'Claim number'),
      yesNo('treatment_ongoing', 'Treatment ongoing'),
      longText('injury_summary', 'Injury summary'),
    ],
  },
  family: {
    version: 1,
    name: 'Family',
    description: `Family and juvenile matters. ${note}`,
    fields: [
      choice('matter_kind', 'Matter kind', [
        'Divorce or separation',
        'Custody or parenting',
        'Support',
        'Adoption',
        'Protective order',
        'Other',
      ]),
      text('forum', 'Court or forum'),
      text('case_number', 'Case number'),
      yesNo('children_involved', 'Children involved'),
      longText('goals', 'Client goals'),
    ],
  },
  criminal_defense: {
    version: 1,
    name: 'Criminal defense',
    description: `Criminal defense representation. ${note}`,
    fields: [
      text('forum', 'Court or forum'),
      text('case_number', 'Case number'),
      longText('charges', 'Charges'),
      choice('custody_status', 'Custody status', ['Released', 'In custody', 'Not arrested']),
      yesNo('appointed', 'Court-appointed'),
    ],
  },
  estates_probate: {
    version: 1,
    name: 'Estates and probate',
    description: `Estate planning, probate, trusts and elder law. ${note}`,
    fields: [
      choice('engagement', 'Engagement', [
        'Estate planning',
        'Probate administration',
        'Trust administration',
        'Elder law',
        'Other',
      ]),
      text('decedent_or_principal', 'Decedent or principal'),
      date('date_of_death', 'Date of death'),
      text('forum', 'Court or forum', 'Only when a proceeding is open.'),
      longText('assets_summary', 'Assets summary'),
    ],
  },
  immigration: {
    version: 1,
    name: 'Immigration',
    description: `Immigration and benefits work before agencies. ${note}`,
    fields: [
      text('agency', 'Agency'),
      text('benefit_sought', 'Benefit or application'),
      text('receipt_number', 'Agency receipt number'),
      date('priority_date', 'Priority date'),
      date('status_expires', 'Current status expires'),
    ],
  },
  bankruptcy: {
    version: 1,
    name: 'Bankruptcy',
    description: `Bankruptcy and debtor-creditor work. ${note}`,
    fields: [
      choice('chapter', 'Chapter', ['7', '11', '12', '13', 'Other']),
      choice('side', 'Representing', ['Debtor', 'Creditor', 'Trustee', 'Other']),
      text('case_number', 'Case number'),
      date('petition_on', 'Petition date'),
      longText('financial_summary', 'Financial summary'),
    ],
  },
  corporate_transactional: {
    version: 1,
    name: 'Corporate and transactional',
    description: `Corporate, commercial, contracts and tax advisory. ${note}`,
    fields: [
      choice('engagement', 'Engagement', [
        'Transaction',
        'Advisory',
        'Contract',
        'Governance',
        'Tax',
        'Other',
      ]),
      text('entity_name', 'Entity'),
      text('counterparty', 'Counterparty'),
      date('target_close', 'Target completion'),
      longText('scope', 'Scope'),
    ],
  },
  real_estate: {
    version: 1,
    name: 'Real estate',
    description: `Real estate, landlord-tenant and construction. ${note}`,
    fields: [
      text('property_address', 'Property address'),
      choice('engagement', 'Engagement', [
        'Purchase',
        'Sale',
        'Lease',
        'Construction',
        'Landlord-tenant',
        'Other',
      ]),
      text('parcel_id', 'Parcel identifier'),
      date('closing_on', 'Closing or key date'),
      longText('scope', 'Scope'),
    ],
  },
  employment: {
    version: 1,
    name: 'Employment',
    description: `Employment and workers compensation. ${note}`,
    fields: [
      text('employer', 'Employer'),
      choice('matter_kind', 'Matter kind', [
        'Advice',
        'Agency claim',
        'Workers compensation',
        'Dispute',
        'Other',
      ]),
      text('agency_or_forum', 'Agency or forum'),
      text('claim_number', 'Claim or charge number'),
      date('separation_on', 'Separation date'),
    ],
  },
  intellectual_property: {
    version: 1,
    name: 'Intellectual property',
    description: `Patents, trademarks, copyrights and licensing. ${note}`,
    fields: [
      choice('asset_type', 'Asset type', [
        'Patent',
        'Trademark',
        'Copyright',
        'Trade secret',
        'Other',
      ]),
      text('office', 'Registry or office'),
      text('application_number', 'Application or registration number'),
      date('next_renewal', 'Next renewal or maintenance'),
      longText('portfolio_notes', 'Portfolio notes'),
    ],
  },
  regulatory_appellate: {
    version: 1,
    name: 'Regulatory and appellate',
    description: `Regulatory, administrative and appellate work. ${note}`,
    fields: [
      text('forum', 'Agency, court or forum'),
      text('proceeding_number', 'Proceeding number'),
      choice('stage', 'Stage', ['Compliance advice', 'Submission', 'Hearing', 'Appeal', 'Other']),
      date('next_submission', 'Next submission'),
      longText('issues', 'Issues'),
    ],
  },
};
