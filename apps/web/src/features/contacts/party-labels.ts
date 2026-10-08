import type { MatterPartyRole } from '@lawfirm/core';

export const partyRoles: { value: MatterPartyRole; label: string }[] = [
  { value: 'client', label: 'Client' },
  { value: 'adverse_party', label: 'Adverse party' },
  { value: 'other', label: 'Other party' },
];
/** "Client", "Adverse party", or the label staff gave an other party ("Lender"). */
export const partyRoleLabel = (party: { role: MatterPartyRole; label: string | null }) =>
  party.role === 'other'
    ? (party.label ?? 'Other party')
    : `${partyRoles.find((r) => r.value === party.role)!.label}${party.label ? ` · ${party.label}` : ''}`;
