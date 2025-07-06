
import { z } from 'zod';

// Enhanced form validation schemas
export const emailSchema = z
  .string()
  .min(1, 'Email is required')
  .email('Please enter a valid email address')
  .max(255, 'Email is too long');

export const passwordSchema = z
  .string()
  .min(6, 'Password must be at least 6 characters')
  .max(128, 'Password is too long')
  .regex(/^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)/, 
    'Password must contain at least one uppercase letter, one lowercase letter, and one number');

export const nameSchema = z
  .string()
  .min(1, 'Name is required')
  .max(100, 'Name is too long')
  .regex(/^[a-zA-Z\s]+$/, 'Name can only contain letters and spaces');

// Auth forms
export const signInFormSchema = z.object({
  email: emailSchema,
  password: z.string().min(1, 'Password is required')
});

export const signUpFormSchema = z.object({
  email: emailSchema,
  password: passwordSchema,
  confirmPassword: z.string()
}).refine((data) => data.password === data.confirmPassword, {
  message: "Passwords don't match",
  path: ["confirmPassword"]
});

export const resetPasswordSchema = z.object({
  email: emailSchema
});

// Campaign optimization form
export const campaignOptimizationSchema = z.object({
  campaignIds: z.array(z.string()).min(1, 'Select at least one campaign'),
  optimizationType: z.enum(['keywords', 'bids', 'budgets', 'full'], {
    errorMap: () => ({ message: 'Please select an optimization type' })
  }),
  aggressiveness: z.enum(['conservative', 'moderate', 'aggressive'], {
    errorMap: () => ({ message: 'Please select optimization aggressiveness' })
  }),
  targetAcos: z.number().min(0).max(100).optional(),
  budgetAdjustment: z.number().min(-50).max(200).optional()
});

// Feedback form
export const feedbackFormSchema = z.object({
  subject: z.string().min(1, 'Subject is required').max(200, 'Subject is too long'),
  message: z.string().min(10, 'Message must be at least 10 characters').max(2000, 'Message is too long'),
  feedbackType: z.enum(['bug', 'feature', 'improvement', 'question'], {
    errorMap: () => ({ message: 'Please select a feedback type' })
  }),
  priority: z.enum(['low', 'medium', 'high'], {
    errorMap: () => ({ message: 'Please select priority level' })
  })
});

// Profile settings form
export const profileSettingsSchema = z.object({
  email: emailSchema,
  name: nameSchema.optional(),
  timezone: z.string().optional(),
  notifications: z.object({
    email: z.boolean().default(true),
    campaigns: z.boolean().default(true),
    optimization: z.boolean().default(true),
    billing: z.boolean().default(true)
  }).optional()
});

// Type exports
export type SignInFormData = z.infer<typeof signInFormSchema>;
export type SignUpFormData = z.infer<typeof signUpFormSchema>;
export type ResetPasswordData = z.infer<typeof resetPasswordSchema>;
export type CampaignOptimizationData = z.infer<typeof campaignOptimizationSchema>;
export type FeedbackFormData = z.infer<typeof feedbackFormSchema>;
export type ProfileSettingsData = z.infer<typeof profileSettingsSchema>;
