import { z } from 'zod';
import { emailSchema } from '@lawfirm/core';

export const signInSchema = z.object({
  email: emailSchema,
  password: z.string().min(8, 'At least 8 characters'),
});
export type SignInInput = z.infer<typeof signInSchema>;
