'use server'

import { createClient } from '@/lib/supabase/server'
import { requireAuth } from '@/lib/auth/requireAuth'
import type { Json } from '@/types/database'
import type { PricingRule } from '@/components/venue/editor/types'

export async function savePricingSettings(
  addaId: string,
  pricingModel: string,
  pricingRules: PricingRule[],
): Promise<{ success: true } | { success: false; error: string }> {
  const { user } = await requireAuth()
  const supabase = await createClient()

  const { data: adda } = await supabase
    .from('adda_profiles')
    .select('pricing_config')
    .eq('id', addaId)
    .eq('auth_user_id', user.id)
    .single()

  if (!adda) return { success: false, error: 'Venue not found or access denied' }

  const existing = (adda.pricing_config ?? {}) as Record<string, unknown>
  const updatedConfig = { ...existing, pricing_rules: pricingRules }

  const { error } = await supabase
    .from('adda_profiles')
    .update({
      pricing_model: pricingModel as never,
      pricing_config: updatedConfig as unknown as Json,
      updated_at: new Date().toISOString(),
    })
    .eq('id', addaId)
    .eq('auth_user_id', user.id)

  if (error) return { success: false, error: error.message }
  return { success: true }
}
