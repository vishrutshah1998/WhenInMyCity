'use server'

import { randomUUID } from 'crypto'
import { createClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { isLocalPlus } from '@/lib/tier'
import type { UserTier } from '@/types/database'

// ---------------------------------------------------------------------------
// getMediaKitToken — returns the creator's existing token, generating one on
// first request. Uses the session-scoped client: user_profiles UPDATE RLS
// already restricts writes to `id = auth.uid()`, so no admin client needed.
// ---------------------------------------------------------------------------

export async function getMediaKitToken(): Promise<{ token: string | null; error: string | null }> {
  const supabase = await createClient()
  const { data: { user }, error: authError } = await supabase.auth.getUser()
  if (authError || !user) return { token: null, error: 'Not authenticated.' }

  const { data: profile, error: fetchError } = await supabase
    .from('user_profiles')
    .select('user_tier, media_kit_token')
    .eq('id', user.id)
    .single()

  if (fetchError || !profile) return { token: null, error: 'Profile not found.' }
  if (!isLocalPlus(profile.user_tier as UserTier)) return { token: null, error: 'Media kit requires Local tier or above.' }

  if (profile.media_kit_token) return { token: profile.media_kit_token, error: null }

  const token = randomUUID()
  const { error: updateError } = await supabase
    .from('user_profiles')
    .update({ media_kit_token: token })
    .eq('id', user.id)

  if (updateError) {
    console.error('[getMediaKitToken]', updateError.message)
    return { token: null, error: 'Failed to generate media kit link.' }
  }

  return { token, error: null }
}

// ---------------------------------------------------------------------------
// regenerateMediaKitToken — overwrites the existing token, invalidating any
// previously shared link.
// ---------------------------------------------------------------------------

export async function regenerateMediaKitToken(): Promise<{ token: string | null; error: string | null }> {
  const supabase = await createClient()
  const { data: { user }, error: authError } = await supabase.auth.getUser()
  if (authError || !user) return { token: null, error: 'Not authenticated.' }

  const { data: profile, error: fetchError } = await supabase
    .from('user_profiles')
    .select('user_tier')
    .eq('id', user.id)
    .single()

  if (fetchError || !profile) return { token: null, error: 'Profile not found.' }
  if (!isLocalPlus(profile.user_tier as UserTier)) return { token: null, error: 'Media kit requires Local tier or above.' }

  const token = randomUUID()
  const { error: updateError } = await supabase
    .from('user_profiles')
    .update({ media_kit_token: token })
    .eq('id', user.id)

  if (updateError) {
    console.error('[regenerateMediaKitToken]', updateError.message)
    return { token: null, error: 'Failed to regenerate media kit link.' }
  }

  return { token, error: null }
}

// ---------------------------------------------------------------------------
// getMediaKitData — public lookup for /media-kit/[token]. Uses the admin
// client since this is an unauthenticated route with no session to scope
// RLS to; the token match in the WHERE clause is the only gate.
// ---------------------------------------------------------------------------

export interface MediaKitBadge {
  label:    string
  icon_url?: string
  year?:    number
}

export interface MediaKitPressFeature {
  outlet:    string
  url?:      string
  logo_url?: string
}

export interface MediaKitData {
  displayName: string
  username:    string
  avatarUrl:   string | null
  bio:         string | null
  city:        string
  creatorType: string
  tier:        UserTier
  metrics: {
    revenueGeneratedPaise: number
    eventsHosted: number
    distinctVenues: number
    repeatAttendeeRate: number | null   // null = not enough data (no identified repeat-eligible attendees yet)
    bookingInquiries: {
      received: number
      accepted: number
      conversionRate: number | null     // null = no inquiries received yet
    }
  }
  awards: MediaKitBadge[]
  press:  MediaKitPressFeature[]
}

export type MediaKitResult =
  | { status: 'not_found' }
  | { status: 'locked'; displayName: string; username: string }
  | { status: 'ok'; data: MediaKitData }

export async function getMediaKitData(token: string): Promise<MediaKitResult> {
  const admin = createAdminClient()

  const { data: profile, error: profileError } = await admin
    .from('user_profiles')
    .select('id, username, display_name, avatar_url, bio, city, creator_type, user_tier')
    .eq('media_kit_token', token)
    .maybeSingle()

  if (profileError || !profile) return { status: 'not_found' }

  if (!isLocalPlus(profile.user_tier as UserTier)) {
    return { status: 'locked', displayName: profile.display_name, username: profile.username }
  }

  const { data: events } = await admin
    .from('events')
    .select('id, venue_name')
    .eq('creator_id', profile.id)
    .neq('status', 'draft')

  const eventRows = events ?? []
  const eventIds = eventRows.map((e) => e.id)
  const distinctVenues = new Set(
    eventRows.map((e) => e.venue_name.trim().toLowerCase()).filter((v) => v.length > 0)
  ).size

  const { data: rsvps } = eventIds.length > 0
    ? await admin
        .from('rsvps')
        .select('attendee_user_id, amount_paid, event_id')
        .in('event_id', eventIds)
        .eq('payment_status', 'captured')
    : { data: [] as { attendee_user_id: string | null; amount_paid: number | null; event_id: string }[] }

  const rsvpRows = rsvps ?? []
  const revenueGeneratedPaise = rsvpRows.reduce((sum, r) => sum + (r.amount_paid ?? 0), 0)

  const eventsByAttendee = new Map<string, Set<string>>()
  for (const r of rsvpRows) {
    if (!r.attendee_user_id) continue // guest checkout — no stable identity across events
    const set = eventsByAttendee.get(r.attendee_user_id) ?? new Set<string>()
    set.add(r.event_id)
    eventsByAttendee.set(r.attendee_user_id, set)
  }
  const distinctAttendees = eventsByAttendee.size
  const repeatAttendees = [...eventsByAttendee.values()].filter((s) => s.size > 1).length
  const repeatAttendeeRate = distinctAttendees > 0 ? repeatAttendees / distinctAttendees : null

  const { data: inquiries } = await admin
    .from('booking_inquiries')
    .select('accepted_at')
    .eq('creator_id', profile.id)

  const inquiryRows = inquiries ?? []
  const received = inquiryRows.length
  const accepted = inquiryRows.filter((i) => i.accepted_at !== null).length
  const conversionRate = received > 0 ? accepted / received : null

  const { data: blocks } = await admin
    .from('page_blocks')
    .select('block_type, config')
    .eq('profile_id', profile.id)
    .in('block_type', ['awards_badges', 'press_feature'])

  const blockRows = blocks ?? []
  const awards: MediaKitBadge[] = blockRows
    .filter((b) => b.block_type === 'awards_badges')
    .flatMap((b) => ((b.config as { badges?: MediaKitBadge[] } | null)?.badges ?? []))
  const press: MediaKitPressFeature[] = blockRows
    .filter((b) => b.block_type === 'press_feature')
    .flatMap((b) => ((b.config as { features?: MediaKitPressFeature[] } | null)?.features ?? []))

  return {
    status: 'ok',
    data: {
      displayName: profile.display_name,
      username:    profile.username,
      avatarUrl:   profile.avatar_url,
      bio:         profile.bio,
      city:        profile.city,
      creatorType: profile.creator_type,
      tier:        profile.user_tier as UserTier,
      metrics: {
        revenueGeneratedPaise,
        eventsHosted: eventRows.length,
        distinctVenues,
        repeatAttendeeRate,
        bookingInquiries: { received, accepted, conversionRate },
      },
      awards,
      press,
    },
  }
}
