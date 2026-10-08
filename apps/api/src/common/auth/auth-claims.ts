import type { FirmRole } from '@lawfirm/core';

/** Claims minted by Supabase Auth + our custom_access_token_hook. */
export interface AuthClaims {
  sub: string;
  email?: string;
  role: 'authenticated';
  firm_id?: string;
  user_role?: FirmRole;
  session_id?: string;
  staff_context_revision?: number;
}
