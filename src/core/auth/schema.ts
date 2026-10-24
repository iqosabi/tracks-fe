import { z } from 'zod';

export const roleSchema = z.enum(['SUPER_ADMIN', 'OPERATOR_ADMIN', 'OPERATOR_VIEWER']);
export const userSchema = z.object({
  id: z.string().min(1),
  username: z.string().min(1),
  role: roleSchema,
  operatorId: z.string().nullable(),
});
export const tokenSchema = z.object({
  accessToken: z.string().min(1),
  tokenType: z.literal('Bearer'),
  expiresIn: z.number().finite().positive(),
  refreshExpiresAt: z.iso.datetime({ offset: true }),
  user: userSchema,
});
export const sessionSchema = tokenSchema.extend({ validUntil: z.number().finite() });
export type Role = z.infer<typeof roleSchema>;
export type User = z.infer<typeof userSchema>;
export type Session = z.infer<typeof sessionSchema>;
