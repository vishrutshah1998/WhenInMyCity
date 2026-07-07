'use server'

import { createClient } from '@/lib/supabase/server'
import { requireAuth } from '@/lib/auth/requireAuth'

export type AvailabilityRuleType = 'recurring_closed' | 'holiday_block' | 'booking_window'

export interface AvailabilityRule {
  id: string
  adda_id: string
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

async function resolveAddaId(supabase: Awaited<ReturnType<typeof createClient>>, userId: string): Promise<string | null> {
  const { data } = await supabase
    .from('adda_profiles')
    .select('id')
    .eq('auth_user_id', userId)
    .maybeSingle()
  return data?.id ?? null
}

export async function getAvailabilityRules(
  addaId: string,
): Promise<{ rules: AvailabilityRule[]; error: string | null }> {
  const supabase = await createClient()

  const { data, error } = await supabase
    .from('adda_availability_rules')
    .select('*')
    .eq('adda_id', addaId)
    .eq('is_active', true)
    .order('created_at', { ascending: true })

  if (error) return { rules: [], error: error.message }
  return { rules: (data as AvailabilityRule[]) ?? [], error: null }
}

export async function createAvailabilityRule(
  addaId: string,
  rule: Omit<NewAvailabilityRule, 'adda_id' | 'is_active'>,
): Promise<{ rule: AvailabilityRule | null; error: string | null }> {
  const { user } = await requireAuth()
  const supabase = await createClient()

  const ownedId = await resolveAddaId(supabase, user.id)
  if (ownedId !== addaId) return { rule: null, error: 'Access denied' }

  const { data, error } = await supabase
    .from('adda_availability_rules')
    .insert({ ...rule, adda_id: addaId, is_active: true })
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

  // RLS policy ensures the caller can only delete their own adda's rules
  const { error } = await supabase
    .from('adda_availability_rules')
    .delete()
    .eq('id', ruleId)

  if (error) return { success: false, error: error.message }
  return { success: true, error: null }
}

export async function updateBookingWindow(
  addaId: string,
  minDays: number,
  maxDays: number,
): Promise<{ success: boolean; error: string | null }> {
  const { user } = await requireAuth()
  const supabase = await createClient()

  const ownedId = await resolveAddaId(supabase, user.id)
  if (ownedId !== addaId) return { success: false, error: 'Access denied' }

  // Remove existing booking_window rule then upsert
  await supabase
    .from('adda_availability_rules')
    .delete()
    .eq('adda_id', addaId)
    .eq('rule_type', 'booking_window')

  const { error } = await supabase
    .from('adda_availability_rules')
    .insert({
      adda_id: addaId,
      rule_type: 'booking_window',
      min_advance_days: minDays,
      max_advance_days: maxDays,
      is_active: true,
    })

  if (error) return { success: false, error: error.message }
  return { success: true, error: null }
}
