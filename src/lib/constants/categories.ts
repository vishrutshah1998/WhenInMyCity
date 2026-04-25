// =============================================================================
// WIMC — Creator category config for v2 onboarding
// =============================================================================

import type { CreatorType, SocialPlatform } from '@/types/database'

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export interface SubType {
  id: string
  label: string
}

export interface SocialPlatformConfig {
  id: SocialPlatform
  label: string
  placeholder: string
}

export interface OfflineActivity {
  id: string
  label: string
}

export interface CategoryConfig {
  id: CreatorType
  label: string
  emoji: string
  primaryColor: string
  secondaryColor: string
  subTypes: SubType[]
  suggestedPlatforms: SocialPlatformConfig[]
  offlineActivities: OfflineActivity[] | null  // null = don't show offline block
  bioSuggestion: string
  nextLabel: string
}

// ---------------------------------------------------------------------------
// Shared offline activity atoms
// ---------------------------------------------------------------------------

const NOT_NOW: OfflineActivity = { id: 'not_right_now', label: 'Not right now' }

// ---------------------------------------------------------------------------
// Category definitions
// ---------------------------------------------------------------------------

export const CREATOR_CATEGORIES: CategoryConfig[] = [
  {
    id: 'music',
    label: 'Music',
    emoji: '🎵',
    primaryColor: '#FF6B6B',
    secondaryColor: '#FFE3E3',
    subTypes: [
      { id: 'originals', label: 'Originals' },
      { id: 'covers', label: 'Covers' },
      { id: 'live_gigs', label: 'Live gigs' },
      { id: 'dj_sets', label: 'DJ sets' },
      { id: 'music_production', label: 'Music production / mixing' },
    ],
    suggestedPlatforms: [
      { id: 'instagram', label: 'Instagram', placeholder: '@yourhandle' },
      { id: 'youtube', label: 'YouTube', placeholder: 'youtube.com/c/yourname' },
      { id: 'spotify', label: 'Spotify', placeholder: 'open.spotify.com/artist/...' },
      { id: 'jiosaavn', label: 'JioSaavn', placeholder: 'jiosaavn.com/artist/...' },
      { id: 'soundcloud', label: 'SoundCloud', placeholder: 'soundcloud.com/yourname' },
    ],
    offlineActivities: [
      { id: 'gigs_performances',    label: 'Gigs & live performances' },
      { id: 'private_shows',        label: 'Private shows & events' },
      { id: 'open_mics',            label: 'Open mics' },
      { id: 'workshops_masterclass',label: 'Workshops & masterclasses' },
      { id: 'album_launch',         label: 'Album / EP launches' },
      { id: 'studio_sessions',      label: 'Open studio sessions' },
      { id: 'festivals',            label: 'Festivals & fests' },
      NOT_NOW,
    ],
    bioSuggestion: 'Singer-songwriter from [city], sharing originals and live gig updates.',
    nextLabel: 'Next: set up your music page',
  },
  {
    id: 'comedy_theatre',
    label: 'Comedy & Theatre',
    emoji: '🎤',
    primaryColor: '#FF9F1C',
    secondaryColor: '#FFE8CC',
    subTypes: [
      { id: 'stand_up', label: 'Stand-up comedy' },
      { id: 'open_mics', label: 'Open mics' },
      { id: 'theatre_drama', label: 'Theatre / drama' },
      { id: 'poetry_spoken_word', label: 'Poetry / spoken word' },
    ],
    suggestedPlatforms: [
      { id: 'instagram', label: 'Instagram', placeholder: '@yourhandle' },
      { id: 'youtube', label: 'YouTube', placeholder: 'youtube.com/c/yourname' },
      { id: 'x', label: 'X (Twitter)', placeholder: '@yourhandle' },
      { id: 'podcast', label: 'Podcast', placeholder: 'Link to your show' },
    ],
    offlineActivities: [
      { id: 'standup_shows',        label: 'Stand-up shows' },
      { id: 'open_mics',            label: 'Open mics' },
      { id: 'theatre_performances', label: 'Theatre performances' },
      { id: 'improv_nights',        label: 'Improv nights' },
      { id: 'comedy_workshops',     label: 'Comedy workshops' },
      { id: 'festival_shows',       label: 'Festival & event shows' },
      { id: 'script_readings',      label: 'Script readings & rehearsals' },
      NOT_NOW,
    ],
    bioSuggestion: 'Stand-up comic doing shows across [city]. Open mics every week.',
    nextLabel: 'Next: set up your comedy page',
  },
  {
    id: 'art_design',
    label: 'Art & Design',
    emoji: '🎨',
    primaryColor: '#F4D35E',
    secondaryColor: '#FFF4C2',
    subTypes: [
      { id: 'illustration', label: 'Illustration' },
      { id: 'graphic_design', label: 'Graphic design' },
      { id: 'photography', label: 'Photography' },
      { id: 'video_editing', label: 'Video / editing' },
      { id: 'animation', label: 'Animation / motion' },
    ],
    suggestedPlatforms: [
      { id: 'instagram', label: 'Instagram', placeholder: '@yourhandle' },
      { id: 'behance', label: 'Behance', placeholder: 'behance.net/yourname' },
      { id: 'dribbble', label: 'Dribbble', placeholder: 'dribbble.com/yourname' },
      { id: 'youtube', label: 'YouTube', placeholder: 'youtube.com/c/yourname' },
    ],
    offlineActivities: [
      { id: 'exhibitions',          label: 'Art exhibitions & shows' },
      { id: 'live_painting',        label: 'Live painting sessions' },
      { id: 'art_workshops',        label: 'Workshops & classes' },
      { id: 'portfolio_reviews',    label: 'Portfolio reviews & critiques' },
      { id: 'studio_open_days',     label: 'Studio open days' },
      { id: 'collab_projects',      label: 'Collaborative art projects' },
      { id: 'pop_up_stalls',        label: 'Pop-up stalls & markets' },
      NOT_NOW,
    ],
    bioSuggestion: 'Illustrator & visual storyteller. Available for commissions and collabs.',
    nextLabel: 'Next: set up your art page',
  },
  {
    id: 'video_content',
    label: 'Video & Content',
    emoji: '📱',
    primaryColor: '#845EF7',
    secondaryColor: '#E5D9FF',
    subTypes: [
      { id: 'short_form', label: 'Short-form video (Reels/Shorts)' },
      { id: 'long_form', label: 'Long-form video (YouTube)' },
      { id: 'livestreams', label: 'Livestreams' },
      { id: 'podcasts', label: 'Podcasts' },
    ],
    suggestedPlatforms: [
      { id: 'instagram', label: 'Instagram', placeholder: '@yourhandle' },
      { id: 'youtube', label: 'YouTube', placeholder: 'youtube.com/c/yourname' },
      { id: 'tiktok', label: 'TikTok', placeholder: '@yourhandle' },
      { id: 'twitch', label: 'Twitch', placeholder: 'twitch.tv/yourname' },
      { id: 'x', label: 'X (Twitter)', placeholder: '@yourhandle' },
    ],
    offlineActivities: [
      { id: 'fan_meetups',          label: 'Fan & community meetups' },
      { id: 'creator_collabs',      label: 'In-person creator collabs' },
      { id: 'live_qa',              label: 'Live Q&A sessions' },
      { id: 'podcast_sessions',     label: 'In-person podcast sessions' },
      { id: 'brand_events',         label: 'Brand events & activations' },
      { id: 'content_workshops',    label: 'Content & skill workshops' },
      NOT_NOW,
    ],
    bioSuggestion: 'Content creator sharing [niche] videos. New uploads every week.',
    nextLabel: 'Next: set up your creator page',
  },
  {
    id: 'teaching_coaching',
    label: 'Teaching & Coaching',
    emoji: '📚',
    primaryColor: '#06D6A0',
    secondaryColor: '#C9F7E9',
    subTypes: [
      { id: 'classes_tuitions', label: 'Classes / tuitions' },
      { id: 'workshops', label: 'Workshops' },
      { id: 'coaching_mentoring', label: 'Coaching / mentoring' },
      { id: 'online_courses', label: 'Online courses' },
    ],
    suggestedPlatforms: [
      { id: 'instagram', label: 'Instagram', placeholder: '@yourhandle' },
      { id: 'youtube', label: 'YouTube', placeholder: 'youtube.com/c/yourname' },
      { id: 'linkedin', label: 'LinkedIn', placeholder: 'linkedin.com/in/yourname' },
      { id: 'website', label: 'Website', placeholder: 'yourwebsite.com' },
    ],
    offlineActivities: [
      { id: 'one_on_one',           label: 'One-on-one coaching sessions' },
      { id: 'group_workshops',      label: 'Group workshops & classes' },
      { id: 'bootcamps',            label: 'Bootcamps & intensives' },
      { id: 'corporate_training',   label: 'Corporate & team training' },
      { id: 'open_seminars',        label: 'Open seminars & talks' },
      { id: 'competitions',         label: 'Competitions & challenges' },
      { id: 'demo_days',            label: 'Demo days & showcases' },
      NOT_NOW,
    ],
    bioSuggestion: 'Coach helping [audience] achieve [goal]. Book a session below.',
    nextLabel: 'Next: set up your teaching page',
  },
  {
    id: 'lifestyle_wellness',
    label: 'Lifestyle & Wellness',
    emoji: '✨',
    primaryColor: '#FF9AA2',
    secondaryColor: '#FFE5EA',
    subTypes: [
      { id: 'food_recipes', label: 'Food / recipes' },
      { id: 'travel', label: 'Travel' },
      { id: 'fashion_styling', label: 'Fashion / styling' },
      { id: 'fitness_yoga', label: 'Fitness / yoga' },
      { id: 'mental_wellness', label: 'Mental wellness' },
    ],
    suggestedPlatforms: [
      { id: 'instagram', label: 'Instagram', placeholder: '@yourhandle' },
      { id: 'youtube', label: 'YouTube', placeholder: 'youtube.com/c/yourname' },
      { id: 'substack', label: 'Substack', placeholder: 'yourname.substack.com' },
      { id: 'website', label: 'Website', placeholder: 'yourwebsite.com' },
    ],
    offlineActivities: [
      { id: 'fitness_classes',      label: 'Fitness classes & yoga' },
      { id: 'cooking_workshops',    label: 'Cooking & food workshops' },
      { id: 'tasting_popups',       label: 'Tasting events & pop-ups' },
      { id: 'styling_sessions',     label: 'Fashion & styling sessions' },
      { id: 'wellness_circles',     label: 'Wellness & meditation circles' },
      { id: 'group_travel',         label: 'Group travel experiences' },
      { id: 'lifestyle_meetups',    label: 'Community lifestyle meetups' },
      NOT_NOW,
    ],
    bioSuggestion: 'Sharing [niche] tips, recipes, and real-life moments from [city].',
    nextLabel: 'Next: set up your page',
  },
  {
    id: 'business_brand',
    label: 'Business & Brand',
    emoji: '🏢',
    primaryColor: '#073B4C',
    secondaryColor: '#8ECAE6',
    subTypes: [
      { id: 'products_ecommerce', label: 'Products / e-commerce' },
      { id: 'services_agency', label: 'Services / agency' },
      { id: 'restaurant_cafe_salon', label: 'Restaurant / café / salon' },
      { id: 'local_shop', label: 'Local shop' },
    ],
    suggestedPlatforms: [
      { id: 'website', label: 'Website', placeholder: 'yourwebsite.com' },
      { id: 'instagram', label: 'Instagram', placeholder: '@yourbrand' },
      { id: 'whatsapp', label: 'WhatsApp', placeholder: '+91 98765 43210' },
      { id: 'googlemaps', label: 'Google Maps', placeholder: 'maps.google.com/...' },
      { id: 'zomato', label: 'Zomato / Swiggy', placeholder: 'Link to your outlet' },
      { id: 'shopify', label: 'Shopify store', placeholder: 'yourstore.myshopify.com' },
    ],
    offlineActivities: [
      { id: 'store_studio_clinic_visits', label: 'Store / outlet visits' },
      { id: 'customer_appointments',      label: 'Customer demos & appointments' },
      { id: 'popup_shops',                label: 'Pop-up shops & exhibitions' },
      { id: 'launch_events',              label: 'Product & service launches' },
      { id: 'networking_events',          label: 'Networking events' },
      { id: 'trade_shows',                label: 'Trade shows & expos' },
      { id: 'events_meetups',             label: 'Community events & meetups' },
      NOT_NOW,
    ],
    bioSuggestion: 'We make [product/service] for [audience]. Visit us in [city].',
    nextLabel: 'Next: set up your brand page',
  },
  {
    id: 'professional_portfolio',
    label: 'Professional & Portfolio',
    emoji: '💼',
    primaryColor: '#6C757D',
    secondaryColor: '#E9ECEF',
    subTypes: [
      { id: 'design_creative', label: 'Design / creative services' },
      { id: 'tech_development', label: 'Tech / development' },
      { id: 'business_consulting', label: 'Business / consulting' },
      { id: 'student_fresher', label: 'Student / fresher' },
    ],
    suggestedPlatforms: [
      { id: 'linkedin', label: 'LinkedIn', placeholder: 'linkedin.com/in/yourname' },
      { id: 'github', label: 'GitHub', placeholder: 'github.com/yourname' },
      { id: 'behance', label: 'Behance', placeholder: 'behance.net/yourname' },
      { id: 'dribbble', label: 'Dribbble', placeholder: 'dribbble.com/yourname' },
      { id: 'website', label: 'Portfolio site', placeholder: 'yourname.com' },
    ],
    offlineActivities: [
      { id: 'client_meetings',      label: 'Client meetings & consultations' },
      { id: 'portfolio_reviews_p',  label: 'Portfolio reviews' },
      { id: 'speaking_engagements', label: 'Speaking engagements & talks' },
      { id: 'conferences_talks',    label: 'Conferences & panels' },
      { id: 'networking_events',    label: 'Networking events' },
      { id: 'skill_workshops',      label: 'Skill-share workshops' },
      { id: 'events_meetups',       label: 'Community meetups' },
      NOT_NOW,
    ],
    bioSuggestion: 'Product designer building clean, conversion-focused experiences for SaaS and D2C.',
    nextLabel: 'Next: set up your portfolio',
  },
  {
    id: 'community_impact',
    label: 'Community & Impact',
    emoji: '🤝',
    primaryColor: '#2F9E44',
    secondaryColor: '#D8F3DC',
    subTypes: [
      { id: 'ngo_nonprofit', label: 'NGO / non-profit' },
      { id: 'community_group', label: 'Community group' },
      { id: 'college_club_society', label: 'College club / society' },
      { id: 'events_campaigns', label: 'Events / campaigns' },
    ],
    suggestedPlatforms: [
      { id: 'instagram', label: 'Instagram', placeholder: '@yourhandle' },
      { id: 'whatsapp', label: 'WhatsApp Group', placeholder: 'Invite link' },
      { id: 'telegram', label: 'Telegram', placeholder: 't.me/yourgroup' },
      { id: 'website', label: 'Website', placeholder: 'yourorg.org' },
      { id: 'meetup', label: 'Meetup', placeholder: 'meetup.com/yourgroup' },
    ],
    offlineActivities: [
      { id: 'community_meetups',    label: 'Community meetups' },
      { id: 'volunteering',         label: 'Volunteering drives' },
      { id: 'fundraising',          label: 'Fundraising events' },
      { id: 'awareness_campaigns',  label: 'Awareness campaigns' },
      { id: 'skill_workshops',      label: 'Workshops & skill-shares' },
      { id: 'street_events',        label: 'Street events & activations' },
      { id: 'open_doors',           label: 'Open door sessions' },
      NOT_NOW,
    ],
    bioSuggestion: 'Building [mission] with [community] in [city]. Join us.',
    nextLabel: 'Next: set up your community page',
  },
]

export const EXPLORING_OPTION = {
  id: 'exploring' as CreatorType,
  label: 'Just exploring',
  emoji: '🔭',
  primaryColor: '#495057',
  secondaryColor: '#F8F9FA',
}

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

export function getCategoryConfig(id: CreatorType): CategoryConfig | undefined {
  return CREATOR_CATEGORIES.find((c) => c.id === id)
}

export function getCategoryColors(id: CreatorType | null): { primary: string; secondary: string } {
  if (!id) return { primary: '#6750A4', secondary: '#EADDFF' }
  if (id === 'exploring') return { primary: EXPLORING_OPTION.primaryColor, secondary: EXPLORING_OPTION.secondaryColor }
  const config = getCategoryConfig(id)
  return config
    ? { primary: config.primaryColor, secondary: config.secondaryColor }
    : { primary: '#6750A4', secondary: '#EADDFF' }
}
