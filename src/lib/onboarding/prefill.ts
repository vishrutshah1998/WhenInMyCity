import { ExistingProfileData } from '@/hooks/useExistingProfileData'
import { SK } from '@/lib/onboarding/session-keys'

export function prefillCreatorKeys(data: ExistingProfileData) {
  if (data.name)       sessionStorage.setItem(SK.c_name,   data.name)
  if (data.city)       sessionStorage.setItem(SK.c_city,   data.city)
  if (data.bio)        sessionStorage.setItem(SK.c_bio,    data.bio)
  if (data.instagram)  sessionStorage.setItem(SK.c_platforms, JSON.stringify({ instagram: data.instagram }))
}

export function prefillExplorerKeys(data: ExistingProfileData) {
  if (data.name)       sessionStorage.setItem(SK.e_name,  data.name)
  if (data.city)       sessionStorage.setItem(SK.e_city,  data.city)
}

export function prefillVenueKeys(data: ExistingProfileData) {
  if (data.city)       sessionStorage.setItem(SK.b_city,  data.city)
}

export function prefillBrandKeys(data: ExistingProfileData) {
  if (data.city)       sessionStorage.setItem(SK.b_city,  data.city)
}
