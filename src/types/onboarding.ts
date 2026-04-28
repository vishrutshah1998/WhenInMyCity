// =============================================================================
// WIMC — Onboarding Types & Zod Schemas (v2 — 3-screen flow)
// =============================================================================

import { z } from 'zod'
import type { CreatorType, SocialPlatform } from './database'

// ---------------------------------------------------------------------------
// Shared validators
// ---------------------------------------------------------------------------

export const UsernameSchema = z
  .string()
  .min(3, 'Username must be at least 3 characters')
  .max(30, 'Username must be at most 30 characters')
  .regex(
    /^[a-z0-9_]+$/,
    'Username may only contain lowercase letters, numbers, and underscores',
  )
  .refine((v) => !v.startsWith('_') && !v.endsWith('_'), {
    message: 'Username cannot start or end with an underscore',
  })

export const V2_CREATOR_TYPES = [
  'music',
  'comedy_theatre',
  'art_design',
  'video_content',
  'teaching_coaching',
  'lifestyle_wellness',
  'business_brand',
  'professional_portfolio',
  'community_impact',
  'exploring',
] as const satisfies CreatorType[]

export const CreatorTypeV2Schema = z.enum(V2_CREATOR_TYPES)

// ---------------------------------------------------------------------------
// Screen 1 — name, handle, category
// ---------------------------------------------------------------------------

export const Screen1Schema = z.object({
  displayName: z
    .string()
    .min(1, 'Name is required')
    .max(80, 'Name must be at most 80 characters'),
  username: UsernameSchema,
  creatorType: CreatorTypeV2Schema,
})

export type Screen1Data = z.infer<typeof Screen1Schema>

// ---------------------------------------------------------------------------
// Screen 2 — sub-types, city, interests
// ---------------------------------------------------------------------------

export const Screen2Schema = z.object({
  subTypes: z.array(z.string().min(1)).default([]),
  city: z.string().min(1, 'Please select a city'),
  interestTags: z.array(z.string()).min(3, 'Pick at least 3 interests').max(5, 'Pick at most 5 interests'),
})

export type Screen2Data = z.infer<typeof Screen2Schema>

// ---------------------------------------------------------------------------
// Screen 3 — socials, bio, theme variant
// ---------------------------------------------------------------------------

export interface SocialLinkEntry {
  platform: SocialPlatform
  url: string
}

export const SocialLinkEntrySchema = z.object({
  platform: z.string(),
  url: z.string().url('Please enter a valid URL').or(z.string().startsWith('+91', 'Enter a valid WhatsApp number')),
})

export const Screen3Schema = z.object({
  bio: z.string().max(160, 'Bio must be at most 160 characters').optional(),
  socialLinks: z.array(SocialLinkEntrySchema).default([]),
  themeVariant: z.enum(['soft', 'bold', 'dark']).default('soft'),
})

export type Screen3Data = z.infer<typeof Screen3Schema>

// ---------------------------------------------------------------------------
// Final payload — merged across all 3 screens
// ---------------------------------------------------------------------------

export const CompleteOnboardingSchema = z.object({
  // Screen 1
  displayName: z.string().min(1).max(80),
  username: UsernameSchema,
  creatorType: CreatorTypeV2Schema,
  // Screen 2
  subTypes: z.array(z.string().min(1)).default([]),
  city: z.string().min(1),
  interestTags: z.array(z.string()).min(3).max(5),
  // Screen 3
  bio: z.string().max(160).optional(),
  socialLinks: z.array(SocialLinkEntrySchema).default([]),
  themeVariant: z.enum(['soft', 'bold', 'dark']).default('soft'),
})

export type CompleteOnboardingData = z.infer<typeof CompleteOnboardingSchema> & {
  avatarFile?: File
}

// ---------------------------------------------------------------------------
// Metadata stored in auth.users.raw_user_meta_data for resume support
// ---------------------------------------------------------------------------

export interface OnboardingMetadata {
  onboarding_s1?: Screen1Data
  onboarding_s2?: Screen2Data
}
