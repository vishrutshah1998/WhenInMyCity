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
  emoji?: string
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
    emoji: '🎸',
    primaryColor: '#FF6B6B',
    secondaryColor: '#FFE3E3',
    subTypes: [
      { id: 'live_concerts',    label: 'Live concerts & shows',           emoji: '🎸' },
      { id: 'acoustic_sets',    label: 'Acoustic / unplugged sets',       emoji: '🎵' },
      { id: 'dj_nights',        label: 'DJ nights & sets',                emoji: '🎧' },
      { id: 'open_mic_jams',    label: 'Open mics & jam sessions',        emoji: '🎤' },
      { id: 'music_workshops',  label: 'Music workshops & classes',       emoji: '🎹' },
      { id: 'sufi_classical',   label: 'Sufi, Ghazal & classical nights', emoji: '🪘' },
      { id: 'album_launches',   label: 'Album / EP launch events',        emoji: '💿' },
      { id: 'not_yet',          label: 'Not hosting events yet',          emoji: '🌱' },
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
      { id: 'open_mics',            label: 'Open mics & jam sessions' },
      { id: 'dj_nights',            label: 'DJ nights & sets' },
      { id: 'workshops_masterclass',label: 'Music workshops & masterclasses' },
      { id: 'sufi_classical',       label: 'Sufi, Ghazal & classical nights' },
      { id: 'album_launch',         label: 'Album / EP launches' },
      { id: 'college_corporate',    label: 'College & corporate shows' },
      NOT_NOW,
    ],
    bioSuggestion: 'Singer-songwriter from [city], sharing originals and live gig updates.',
    nextLabel: 'Next: set up your music page',
  },
  {
    id: 'comedy_theatre',
    label: 'Comedy & Theatre',
    emoji: '🎭',
    primaryColor: '#FF9F1C',
    secondaryColor: '#FFE8CC',
    subTypes: [
      { id: 'standup_shows',       label: 'Stand-up shows',               emoji: '🎤' },
      { id: 'open_mics',           label: 'Open mics',                    emoji: '🎭' },
      { id: 'theatre_productions', label: 'Theatre productions',          emoji: '🎪' },
      { id: 'improv_sketch',       label: 'Improv & sketch nights',       emoji: '😂' },
      { id: 'storytelling_poetry', label: 'Storytelling & poetry nights', emoji: '📖' },
      { id: 'comedy_workshops',    label: 'Comedy & acting workshops',    emoji: '🎓' },
      { id: 'not_yet',             label: 'Not hosting events yet',       emoji: '🌱' },
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
      { id: 'improv_nights',        label: 'Improv & sketch nights' },
      { id: 'storytelling',         label: 'Storytelling & poetry nights' },
      { id: 'comedy_workshops',     label: 'Comedy & acting workshops' },
      { id: 'festival_shows',       label: 'Festival & college shows' },
      NOT_NOW,
    ],
    bioSuggestion: 'Stand-up comic doing shows across [city]. Open mics every week.',
    nextLabel: 'Next: set up your comedy page',
  },
  {
    id: 'dance',
    label: 'Dance',
    emoji: '💃',
    primaryColor: '#FF6B9D',
    secondaryColor: '#FFD6E7',
    subTypes: [
      { id: 'classical_dance',   label: 'Classical dance shows',           emoji: '🪷' },
      { id: 'bollywood',         label: 'Bollywood & filmi shows',         emoji: '💃' },
      { id: 'folk_dance',        label: 'Folk & regional dance',           emoji: '🥁' },
      { id: 'contemporary',      label: 'Contemporary & fusion',           emoji: '🌀' },
      { id: 'dance_workshops',   label: 'Dance workshops & classes',       emoji: '🎓' },
      { id: 'battle_competitions',label: 'Dance battles & competitions',   emoji: '🏆' },
      { id: 'choreo_showcases',  label: 'Choreography showcases',          emoji: '🎬' },
      { id: 'not_yet',           label: 'Not hosting events yet',          emoji: '🌱' },
    ],
    suggestedPlatforms: [
      { id: 'instagram', label: 'Instagram', placeholder: '@yourhandle' },
      { id: 'youtube', label: 'YouTube', placeholder: 'youtube.com/c/yourname' },
      { id: 'tiktok', label: 'TikTok / Reels', placeholder: '@yourhandle' },
    ],
    offlineActivities: [
      { id: 'recitals_shows',       label: 'Recitals & dance shows' },
      { id: 'dance_workshops',      label: 'Dance workshops & classes' },
      { id: 'flash_mobs',           label: 'Flash mobs & street performances' },
      { id: 'battle_competitions',  label: 'Dance battles & competitions' },
      { id: 'bollywood_nights',     label: 'Bollywood & themed dance nights' },
      { id: 'classical_arangetram', label: 'Arangetrams & classical recitals' },
      { id: 'group_choreographies', label: 'Group choreography showcases' },
      NOT_NOW,
    ],
    bioSuggestion: 'Dancer & choreographer from [city]. Classical roots, contemporary moves.',
    nextLabel: 'Next: set up your dance page',
  },
  {
    id: 'art_design',
    label: 'Art & Photography',
    emoji: '🎨',
    primaryColor: '#5DD9D0',
    secondaryColor: '#C9F7F5',
    subTypes: [
      { id: 'exhibitions',      label: 'Art exhibitions & shows',          emoji: '🖼️' },
      { id: 'live_painting',    label: 'Live painting & sketching',        emoji: '🎨' },
      { id: 'photo_walks',      label: 'Photography walks & tours',        emoji: '📸' },
      { id: 'art_workshops',    label: 'Workshops & art classes',          emoji: '✏️' },
      { id: 'popup_stalls',     label: 'Pop-up stalls & art markets',      emoji: '🏪' },
      { id: 'studio_open_days', label: 'Studio open days',                 emoji: '🏛️' },
      { id: 'not_yet',          label: 'Not hosting events yet',           emoji: '🌱' },
    ],
    suggestedPlatforms: [
      { id: 'instagram', label: 'Instagram', placeholder: '@yourhandle' },
      { id: 'behance', label: 'Behance', placeholder: 'behance.net/yourname' },
      { id: 'dribbble', label: 'Dribbble', placeholder: 'dribbble.com/yourname' },
      { id: 'youtube', label: 'YouTube', placeholder: 'youtube.com/c/yourname' },
    ],
    offlineActivities: [
      { id: 'exhibitions',          label: 'Art exhibitions & gallery shows' },
      { id: 'photo_walks',          label: 'Photography walks & tours' },
      { id: 'live_painting',        label: 'Live painting sessions' },
      { id: 'art_workshops',        label: 'Workshops & art classes' },
      { id: 'studio_open_days',     label: 'Studio open days' },
      { id: 'pop_up_stalls',        label: 'Pop-up stalls & art markets' },
      { id: 'collab_projects',      label: 'Collaborative art projects' },
      NOT_NOW,
    ],
    bioSuggestion: 'Illustrator & visual storyteller. Available for commissions and collabs.',
    nextLabel: 'Next: set up your art page',
  },
  {
    id: 'fitness_wellness',
    label: 'Fitness & Wellness',
    emoji: '🧘',
    primaryColor: '#06D6A0',
    secondaryColor: '#C9F7E9',
    subTypes: [
      { id: 'yoga_sessions',     label: 'Yoga classes & sessions',         emoji: '🧘' },
      { id: 'fitness_classes',   label: 'Fitness & HIIT classes',          emoji: '🏋️' },
      { id: 'running_cycling',   label: 'Group runs & cycling rides',      emoji: '🏃' },
      { id: 'nutrition_talks',   label: 'Nutrition & wellness talks',      emoji: '🥗' },
      { id: 'group_treks',       label: 'Group treks & hikes',             emoji: '🏔️' },
      { id: 'sports_tournaments',label: 'Sports events & tournaments',     emoji: '⚽' },
      { id: 'wellness_retreats', label: 'Wellness retreats & camps',       emoji: '🌿' },
      { id: 'not_yet',           label: 'Not hosting events yet',          emoji: '🌱' },
    ],
    suggestedPlatforms: [
      { id: 'instagram', label: 'Instagram', placeholder: '@yourhandle' },
      { id: 'youtube', label: 'YouTube', placeholder: 'youtube.com/c/yourname' },
      { id: 'website', label: 'Website / Booking', placeholder: 'yourwebsite.com' },
    ],
    offlineActivities: [
      { id: 'yoga_classes',         label: 'Yoga & meditation classes' },
      { id: 'fitness_classes',      label: 'Fitness & HIIT classes' },
      { id: 'group_runs',           label: 'Group runs & cycling rides' },
      { id: 'sports_tournaments',   label: 'Sports events & tournaments' },
      { id: 'group_treks',          label: 'Group treks & hikes' },
      { id: 'wellness_retreats',    label: 'Wellness retreats & camps' },
      { id: 'nutrition_workshops',  label: 'Nutrition & health workshops' },
      NOT_NOW,
    ],
    bioSuggestion: 'Certified [yoga / fitness] trainer from [city]. Classes every morning.',
    nextLabel: 'Next: set up your fitness page',
  },
  {
    id: 'food_culinary',
    label: 'Food & Culinary',
    emoji: '🍳',
    primaryColor: '#FF9F1C',
    secondaryColor: '#FFE8CC',
    subTypes: [
      { id: 'cooking_workshops', label: 'Cooking workshops & classes',     emoji: '🍳' },
      { id: 'food_walks',        label: 'Food walks & culinary tours',     emoji: '🚶' },
      { id: 'tasting_events',    label: 'Tasting menus & dining events',   emoji: '🍽️' },
      { id: 'popup_kitchens',    label: 'Pop-up kitchens & supper clubs',  emoji: '🏡' },
      { id: 'baking_workshops',  label: 'Baking & pastry workshops',       emoji: '🥐' },
      { id: 'fermentation_foraging', label: 'Fermentation & foraging',     emoji: '🫙' },
      { id: 'food_styling',      label: 'Food photography & styling',      emoji: '📸' },
      { id: 'not_yet',           label: 'Not hosting events yet',          emoji: '🌱' },
    ],
    suggestedPlatforms: [
      { id: 'instagram', label: 'Instagram', placeholder: '@yourhandle' },
      { id: 'youtube', label: 'YouTube', placeholder: 'youtube.com/c/yourname' },
      { id: 'zomato', label: 'Zomato / Swiggy', placeholder: 'Link to your profile' },
      { id: 'website', label: 'Website', placeholder: 'yourwebsite.com' },
    ],
    offlineActivities: [
      { id: 'cooking_classes',      label: 'Cooking workshops & classes' },
      { id: 'food_walks',           label: 'Food walks & culinary tours' },
      { id: 'tasting_events',       label: 'Tasting menus & dining events' },
      { id: 'popup_kitchens',       label: 'Pop-up kitchens & supper clubs' },
      { id: 'baking_workshops',     label: 'Baking & pastry workshops' },
      { id: 'chef_tables',          label: "Chef's table & exclusive dinners" },
      { id: 'food_festivals',       label: 'Food festivals & markets' },
      NOT_NOW,
    ],
    bioSuggestion: 'Chef & food storyteller from [city]. Sharing recipes and hosting culinary experiences.',
    nextLabel: 'Next: set up your food page',
  },
  {
    id: 'teaching_coaching',
    label: 'Learning & Workshops',
    emoji: '📚',
    primaryColor: '#845EF7',
    secondaryColor: '#E5D9FF',
    subTypes: [
      { id: 'workshops_masterclass', label: 'Workshops & masterclasses',      emoji: '📚' },
      { id: 'group_coaching',        label: 'Group coaching sessions',        emoji: '👥' },
      { id: 'bootcamps',             label: 'Bootcamps & intensives',         emoji: '⚡' },
      { id: 'seminars_talks',        label: 'Seminars & open talks',          emoji: '🎙️' },
      { id: 'hackathons',            label: 'Hackathons & competitions',      emoji: '💻' },
      { id: 'skill_shares',          label: 'Skill-share circles',            emoji: '🔄' },
      { id: 'not_yet',               label: 'Not hosting events yet',         emoji: '🌱' },
    ],
    suggestedPlatforms: [
      { id: 'instagram', label: 'Instagram', placeholder: '@yourhandle' },
      { id: 'youtube', label: 'YouTube', placeholder: 'youtube.com/c/yourname' },
      { id: 'linkedin', label: 'LinkedIn', placeholder: 'linkedin.com/in/yourname' },
      { id: 'website', label: 'Website', placeholder: 'yourwebsite.com' },
    ],
    offlineActivities: [
      { id: 'group_workshops',      label: 'Group workshops & classes' },
      { id: 'bootcamps',            label: 'Bootcamps & intensives' },
      { id: 'open_seminars',        label: 'Open seminars & talks' },
      { id: 'hackathons',           label: 'Hackathons & competitions' },
      { id: 'skill_shares',         label: 'Skill-share sessions' },
      { id: 'one_on_one',           label: 'One-on-one coaching' },
      { id: 'demo_days',            label: 'Demo days & showcases' },
      NOT_NOW,
    ],
    bioSuggestion: 'Coach helping [audience] achieve [goal]. Book a session below.',
    nextLabel: 'Next: set up your learning page',
  },
  {
    id: 'spirituality',
    label: 'Spirituality',
    emoji: '🙏',
    primaryColor: '#B39DDB',
    secondaryColor: '#EDE7F6',
    subTypes: [
      { id: 'meditation_circles',  label: 'Meditation circles & satsangs',  emoji: '🧘' },
      { id: 'yoga_retreats',       label: 'Yoga & wellness retreats',        emoji: '🌅' },
      { id: 'spiritual_talks',     label: 'Spiritual talks & discourses',    emoji: '🙏' },
      { id: 'healing_sessions',    label: 'Healing & energy sessions',       emoji: '✨' },
      { id: 'bhajan_kirtan',       label: 'Bhajan, Kirtan & devotional music', emoji: '🪘' },
      { id: 'astrology_workshops', label: 'Astrology & Vedic workshops',     emoji: '⭐' },
      { id: 'mindfulness_camps',   label: 'Mindfulness & silent camps',      emoji: '🌿' },
      { id: 'not_yet',             label: 'Not hosting events yet',          emoji: '🌱' },
    ],
    suggestedPlatforms: [
      { id: 'instagram', label: 'Instagram', placeholder: '@yourhandle' },
      { id: 'youtube', label: 'YouTube', placeholder: 'youtube.com/c/yourname' },
      { id: 'whatsapp', label: 'WhatsApp Community', placeholder: 'Invite link' },
      { id: 'website', label: 'Website', placeholder: 'yourwebsite.com' },
    ],
    offlineActivities: [
      { id: 'meditation_circles',   label: 'Meditation circles & satsangs' },
      { id: 'yoga_retreats',        label: 'Yoga & wellness retreats' },
      { id: 'spiritual_talks',      label: 'Spiritual talks & discourses' },
      { id: 'healing_sessions',     label: 'Healing & energy sessions' },
      { id: 'bhajan_kirtan',        label: 'Bhajan & Kirtan evenings' },
      { id: 'mindfulness_camps',    label: 'Mindfulness & silent camps' },
      { id: 'astrology_workshops',  label: 'Astrology & Vedic workshops' },
      NOT_NOW,
    ],
    bioSuggestion: 'Guiding seekers toward peace and purpose through [practice] in [city].',
    nextLabel: 'Next: set up your page',
  },
  {
    id: 'community_impact',
    label: 'Community & Causes',
    emoji: '🌍',
    primaryColor: '#2F9E44',
    secondaryColor: '#D8F3DC',
    subTypes: [
      { id: 'community_meetups',   label: 'Community meetups & gatherings',    emoji: '🤝' },
      { id: 'volunteering',        label: 'Volunteering drives',               emoji: '💚' },
      { id: 'fundraising',         label: 'Fundraising events',                emoji: '💰' },
      { id: 'awareness_campaigns', label: 'Awareness campaigns & rallies',     emoji: '📢' },
      { id: 'skill_workshops',     label: 'Workshops & skill-shares',          emoji: '🛠️' },
      { id: 'clean_up_drives',     label: 'Clean-up & green drives',           emoji: '♻️' },
      { id: 'town_halls',          label: 'Town halls & open sessions',        emoji: '🏛️' },
      { id: 'not_yet',             label: 'Not hosting events yet',            emoji: '🌱' },
    ],
    suggestedPlatforms: [
      { id: 'instagram', label: 'Instagram', placeholder: '@yourhandle' },
      { id: 'whatsapp', label: 'WhatsApp Group', placeholder: 'Invite link' },
      { id: 'telegram', label: 'Telegram', placeholder: 't.me/yourgroup' },
      { id: 'website', label: 'Website', placeholder: 'yourorg.org' },
    ],
    offlineActivities: [
      { id: 'community_meetups',    label: 'Community meetups & gatherings' },
      { id: 'volunteering',         label: 'Volunteering drives' },
      { id: 'fundraising',          label: 'Fundraising events' },
      { id: 'awareness_campaigns',  label: 'Awareness campaigns & rallies' },
      { id: 'clean_up_drives',      label: 'Clean-up & green drives' },
      { id: 'skill_workshops',      label: 'Workshops & skill-shares' },
      { id: 'open_doors',           label: 'Town halls & open sessions' },
      NOT_NOW,
    ],
    bioSuggestion: 'Building [mission] with [community] in [city]. Join us.',
    nextLabel: 'Next: set up your community page',
  },
  {
    id: 'travel_adventure',
    label: 'Travel & Adventure',
    emoji: '🏕️',
    primaryColor: '#00B4D8',
    secondaryColor: '#CAF0F8',
    subTypes: [
      { id: 'group_treks',       label: 'Group treks & hikes',             emoji: '🏔️' },
      { id: 'road_trips',        label: 'Road trips & road-trips',         emoji: '🚗' },
      { id: 'city_walks',        label: 'City walks & heritage tours',     emoji: '🏛️' },
      { id: 'camping',           label: 'Camping & stargazing nights',     emoji: '⭐' },
      { id: 'cycling_rides',     label: 'Cycling rides & trails',          emoji: '🚴' },
      { id: 'backpacking_meets', label: 'Backpacker meetups',              emoji: '🎒' },
      { id: 'travel_workshops',  label: 'Travel photography & planning workshops', emoji: '📸' },
      { id: 'not_yet',           label: 'Not hosting events yet',          emoji: '🌱' },
    ],
    suggestedPlatforms: [
      { id: 'instagram', label: 'Instagram', placeholder: '@yourhandle' },
      { id: 'youtube', label: 'YouTube', placeholder: 'youtube.com/c/yourname' },
      { id: 'whatsapp', label: 'WhatsApp Community', placeholder: 'Invite link' },
      { id: 'website', label: 'Website', placeholder: 'yourwebsite.com' },
    ],
    offlineActivities: [
      { id: 'group_treks',          label: 'Group treks & hikes' },
      { id: 'city_heritage_walks',  label: 'City walks & heritage tours' },
      { id: 'camping',              label: 'Camping & stargazing nights' },
      { id: 'cycling_rides',        label: 'Cycling rides & trails' },
      { id: 'road_trips',           label: 'Road trips & day excursions' },
      { id: 'backpacker_meetups',   label: 'Backpacker meetups' },
      { id: 'travel_workshops',     label: 'Travel planning & photography workshops' },
      NOT_NOW,
    ],
    bioSuggestion: 'Explorer & travel host from [city]. Organising treks, walks, and adventures.',
    nextLabel: 'Next: set up your adventure page',
  },
  {
    id: 'literature_poetry',
    label: 'Literature & Poetry',
    emoji: '📖',
    primaryColor: '#C2185B',
    secondaryColor: '#FCE4EC',
    subTypes: [
      { id: 'poetry_slams',      label: 'Poetry slams & open mics',        emoji: '✍️' },
      { id: 'book_clubs',        label: 'Book clubs & reading circles',     emoji: '📚' },
      { id: 'author_talks',      label: 'Author talks & book launches',     emoji: '🎙️' },
      { id: 'storytelling',      label: 'Storytelling evenings',            emoji: '🌙' },
      { id: 'writing_workshops', label: 'Creative writing workshops',       emoji: '📝' },
      { id: 'spoken_word',       label: 'Spoken word & performance poetry', emoji: '🎭' },
      { id: 'zine_making',       label: 'Zine making & literary collabs',   emoji: '📰' },
      { id: 'not_yet',           label: 'Not hosting events yet',           emoji: '🌱' },
    ],
    suggestedPlatforms: [
      { id: 'instagram', label: 'Instagram', placeholder: '@yourhandle' },
      { id: 'substack', label: 'Substack', placeholder: 'yourname.substack.com' },
      { id: 'youtube', label: 'YouTube', placeholder: 'youtube.com/c/yourname' },
      { id: 'website', label: 'Website / Blog', placeholder: 'yourwebsite.com' },
    ],
    offlineActivities: [
      { id: 'poetry_slams',         label: 'Poetry slams & open mics' },
      { id: 'book_clubs',           label: 'Book clubs & reading circles' },
      { id: 'author_talks',         label: 'Author talks & book launches' },
      { id: 'storytelling_nights',  label: 'Storytelling evenings' },
      { id: 'writing_workshops',    label: 'Creative writing workshops' },
      { id: 'spoken_word',          label: 'Spoken word & performance poetry' },
      { id: 'literary_festivals',   label: 'Literary festivals & fairs' },
      NOT_NOW,
    ],
    bioSuggestion: 'Poet & storyteller from [city]. Words on stage, on page, and everywhere in between.',
    nextLabel: 'Next: set up your literary page',
  },
  {
    id: 'crafts_making',
    label: 'Crafts & Making',
    emoji: '🪡',
    primaryColor: '#FF7043',
    secondaryColor: '#FBE9E7',
    subTypes: [
      { id: 'pottery_ceramics',  label: 'Pottery & ceramics',              emoji: '🏺' },
      { id: 'textile_weaving',   label: 'Weaving, knitting & textiles',    emoji: '🧶' },
      { id: 'block_printing',    label: 'Block printing & natural dyeing',  emoji: '🖨️' },
      { id: 'jewellery_making',  label: 'Jewellery & accessories making',  emoji: '💍' },
      { id: 'candle_soap',       label: 'Candle & soap making',            emoji: '🕯️' },
      { id: 'upcycling_diy',     label: 'Upcycling & DIY workshops',       emoji: '♻️' },
      { id: 'art_markets',       label: 'Craft fairs & maker markets',     emoji: '🏪' },
      { id: 'not_yet',           label: 'Not hosting events yet',          emoji: '🌱' },
    ],
    suggestedPlatforms: [
      { id: 'instagram', label: 'Instagram', placeholder: '@yourhandle' },
      { id: 'youtube', label: 'YouTube', placeholder: 'youtube.com/c/yourname' },
      { id: 'website', label: 'Website / Shop', placeholder: 'yourwebsite.com' },
    ],
    offlineActivities: [
      { id: 'pottery_workshops',    label: 'Pottery & ceramics workshops' },
      { id: 'block_printing',       label: 'Block printing & dyeing workshops' },
      { id: 'jewellery_workshops',  label: 'Jewellery making workshops' },
      { id: 'textile_workshops',    label: 'Weaving & textile workshops' },
      { id: 'candle_soap_making',   label: 'Candle & soap making sessions' },
      { id: 'craft_fairs',          label: 'Craft fairs & maker markets' },
      { id: 'upcycling_diy',        label: 'Upcycling & DIY workshops' },
      NOT_NOW,
    ],
    bioSuggestion: 'Maker & craft educator from [city]. Teaching slow crafts and mindful making.',
    nextLabel: 'Next: set up your maker page',
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
