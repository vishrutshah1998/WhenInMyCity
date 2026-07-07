'use server'

import { createClient } from '@/lib/supabase/server'
import { requireAuth } from '@/lib/auth/requireAuth'

export type AvailabilityRuleType = 'recurring_closed' | 'holiday_block' | 'booking_window'

export interface AvailabilityRule {
  id: string
  venue_id: string
  rule_type: AvailabilityRuleType
  day_of_week: number[] | null
  time_start: string | null
  time_end: string | null
  date_start: string | null
  date_end: string | null
  label: string | null
  min_advance_days: number | null
  max_advance_days: number | null
  is_active: boolean
  created_at: string
}

export type NewAvailabilityRule = Omit<AvailabilityRule, 'id' | 'created_at'>

async function resolveVenueId(supabase: Awaited<ReturnType<typeof createClient>>, userId: string): Promise<string | null> {
  const { data } = await supabase
    .from('venue_profiles')
    .select('id')
    .eq('auth_user_id', userId)
    .maybeSingle()
  return data?.id ?? null
}

export async function getAvailabilityRules(
  venueId: string,
): Promise<{ rules: AvailabilityRule[]; error: string | null }> {
  const supabase = await createClient()

  const { data, error } = await supabase
    .from('venue_availability_rules')
    .select('*')
    .eq('venue_id', venueId)
    .eq('is_active', true)
    .order('created_at', { ascending: true })

  if (error) return { rules: [], error: error.message }
  return { rules: (data as AvailabilityRule[]) ?? [], error: null }
}

export async function createAvailabilityRule(
  venueId: string,
  rule: Omit<NewAvailabilityRule, 'venue_id' | 'is_active'>,
): Promise<{ rule: AvailabilityRule | null; error: string | null }> {
  const { user } = await requireAuth()
  const supabase = await createClient()

  const ownedId = await resolveVenueId(supabase, user.id)
  if (ownedId !== venueId) return { rule: null, error: 'Access denied' }

  const { data, error } = await supabase
    .from('venue_availability_rules')
    .insert({ ...rule, venue_id: venueId, is_active: true })
    .select()
    .single()

  if (error) return { rule: null, error: error.message }
  return { rule: data as AvailabilityRule, error: null }
}

export async function deleteAvailabilityRule(
  ruleId: string,
): Promise<{ success: boolean; error: string | null }> {
  await requireAuth()
  const supabase = await createClient()

  // RLS policy ensures the caller can only delete their own venue's rules
  const { error } = await supabase
    .from('venue_availability_rules')
    .delete()
    .eq('id', ruleId)

  if (error) return { success: false, error: error.message }
  return { success: true, error: null }
}

export async function updateBookingWindow(
  venueId: string,
  minDays: number,
  maxDays: number,
): Promise<{ success: boolean; error: string | null }> {
  const { user } = await requireAuth()
  const supabase = await createClient()

  const ownedId = await resolveVenueId(supabase, user.id)
  if (ownedId !== venueId) return { success: false, error: 'Access denied' }

  // Remove existing booking_window rule then upsert
  await supabase
    .from('venue_availability_rules')
    .delete()
    .eq('venue_id', venueId)
    .eq('rule_type', 'booking_window')

  const { error } = await supabase
    .from('venue_availability_rules')
    .insert({
      venue_id: venueId,
      rule_type: 'booking_window',
      min_advance_days: minDays,
      max_advance_days: maxDays,
      is_active: true,
    })

  if (error) return { success: false, error: error.message }
  return { success: true, error: null }
}
