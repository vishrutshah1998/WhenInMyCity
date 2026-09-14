// =============================================================================
// WIMC — Razorpay Route Linked Account input schemas
//
// Split out of route-linked-accounts.ts (a 'use server' file). Next.js's
// Server Actions compiler requires every export from a 'use server' file to
// be an async function — these Zod schema consts are runtime objects, not
// functions, so they can't live there. No other 'use server' action file in
// this codebase exports a schema like this (see e.g. guest-otp.ts's
// module-private PhoneSchema) — these two are exported because
// route-linked-accounts.ts's own actions need to reference them, so they're
// pulled into this plain (non-'use server') module instead.
// =============================================================================

import { z } from 'zod'
import { ROUTE_BUSINESS_TYPES } from '@/lib/razorpay'

const PAN_REGEX = /^[A-Z]{5}[0-9]{4}[A-Z]$/
const GST_REGEX = /^\d{2}[A-Z]{5}\d{4}[A-Z]\d[A-Z\d]Z[A-Z\d]$/
const POSTAL_CODE_REGEX = /^\d{6}$/
const IFSC_REGEX = /^[A-Z]{4}0[A-Z0-9]{6}$/
const ACCOUNT_NUMBER_REGEX = /^[0-9]{5,20}$/

// Structurally compatible with RazorpayAddress (checked at the
// createLinkedAccount/createStakeholder call sites in route-linked-accounts.ts)
// — no `satisfies` clause here since z.object()'s inferred *input* type
// (pre-.default()) doesn't match ZodType<RazorpayAddress>'s Input parameter.
const AddressSchema = z.object({
  street1: z.string().trim().min(1, 'Street address is required').max(100),
  street2: z.string().trim().max(100).optional(),
  city: z.string().trim().min(1, 'City is required').max(50),
  state: z.string().trim().min(1, 'State is required').max(50),
  postal_code: z.string().trim().regex(POSTAL_CODE_REGEX, 'Must be a 6-digit postal code'),
  country: z.string().trim().length(2).default('IN'),
})

const PanSchema = z.string().trim().toUpperCase().regex(PAN_REGEX, 'Invalid PAN format (expected AAAAA9999A)')

export const CreateLinkedAccountInputSchema = z.object({
  // Account (business-level)
  email: z.string().trim().email(),
  phone: z.string().trim().regex(/^\+?[0-9]{10,15}$/, 'Invalid phone number'),
  legalBusinessName: z.string().trim().min(1, 'Legal business name is required').max(200),
  businessType: z.enum(ROUTE_BUSINESS_TYPES),
  contactName: z.string().trim().min(1, 'Contact name is required').max(200),
  registeredAddress: AddressSchema,
  businessPan: PanSchema,
  gst: z.string().trim().toUpperCase().regex(GST_REGEX, 'Invalid GSTIN format').optional(),

  // Stakeholder (individual-level) — kept distinct from the account's own
  // business_pan; never write this into linked_accounts.business_pan.
  stakeholderName: z.string().trim().min(1, 'Stakeholder name is required').max(200),
  stakeholderEmail: z.string().trim().email(),
  stakeholderPan: PanSchema,
  residentialAddress: AddressSchema,
})

export type CreateLinkedAccountInput = z.infer<typeof CreateLinkedAccountInputSchema>

export const UpdateProductConfigurationInputSchema = z.object({
  accountNumber: z.string().trim().regex(ACCOUNT_NUMBER_REGEX, 'Invalid bank account number'),
  beneficiaryName: z.string().trim().min(1, 'Beneficiary name is required').max(200),
  ifscCode: z.string().trim().toUpperCase().regex(IFSC_REGEX, 'Invalid IFSC code'),
})

export type UpdateProductConfigurationInput = z.infer<typeof UpdateProductConfigurationInputSchema>
