import type { UserTier } from '@/types/database'

/** True for local, lantern, and beacon — the tiers above the default wanderer floor. */
export function isLocalPlus(tier: UserTier | null | undefined): boolean {
  return tier === 'local' || tier === 'lantern' || tier === 'beacon'
}
