import { createClient } from '@/lib/supabase/client'

type Persona = 'creator' | 'explorer' | 'venue' | 'brand'

export async function updatePersonas(newPersona: Persona): Promise<void> {
  const supabase = createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return

  const { data: profile } = await supabase
    .from('user_profiles')
    .select('personas')
    .eq('id', user.id)
    .single()

  const current: string[] = profile?.personas ?? []
  if (current.includes(newPersona)) return

  await supabase
    .from('user_profiles')
    .update({ personas: [...current, newPersona] })
    .eq('id', user.id)
}
