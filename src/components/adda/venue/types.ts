export interface PhotoItem {
  id: string
  url: string
  alt_text: string
  is_cover: boolean
  is_local?: boolean // staged for upload, not yet persisted
}

export interface PricingRule {
  id: string
  name: string
  rate_per_hour_paise: number
  min_hours: number
  days: string[] // 'mon' | 'tue' | 'wed' | 'thu' | 'fri' | 'sat' | 'sun'
  time_from: string // '09:00' 24h
  time_to: string   // '17:00' 24h
  active: boolean
}

export interface IncludedItem {
  id: string
  name: string
  included: boolean
}

export interface VenueFormState {
  photos: PhotoItem[]
  name: string
  adda_type: string[]
  description: string
  capacity_min: number | null
  capacity_max: number | null
  parking_details: string
  accessibility_notes: string
  amenities: string[]
  pricing_model: string
  pricing_rules: PricingRule[]
  house_rules: string
  included_items: IncludedItem[]
  cancellation_policy: 'flexible' | 'moderate' | 'strict'
}
