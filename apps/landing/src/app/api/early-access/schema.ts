import { z } from 'zod';
import { FIRM_SIZES } from '@/lib/early-access';

/** Server-side validation for early-access enquiries. */
export const earlyAccessSchema = z.object({
  name: z.string().trim().min(1, 'Enter your name.').max(120),
  email: z.string().trim().email('Enter a valid work email.').max(200),
  firm: z.string().trim().max(160).optional().default(''),
  firmSize: z.enum(FIRM_SIZES, { message: 'Choose your firm size.' }),
  message: z.string().trim().max(1000).optional().default(''),
  /** Honeypot: humans leave it empty. */
  website: z.string().max(0).optional().default(''),
});
