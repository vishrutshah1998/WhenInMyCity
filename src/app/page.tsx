import Link from 'next/link'
import { WimcLogo } from '@/components/WimcLogo'

const CITIES = [
  'Indore', 'Jaipur', 'Bhopal', 'Chandigarh', 'Kochi', 'Mysuru',
  'Vadodara', 'Dehradun', 'Ranchi', 'Coimbatore', 'Agra', 'Vijayawada',
  'Surat', 'Nagpur', 'Lucknow', 'Amritsar', 'Jodhpur', 'Udaipur',
]

const MAKER_FEATURES = [
  'Ticketed events with UPI checkout',
  'Link-in-bio page at /{username}',
  'Keep 90% of every rupee earned',
]

const ADDA_FEATURES = [
  'Verified listing in creator search',
  'Booking calendar & venue proposals',
  'Revenue from idle evening slots',
]

const STATS = [
  { value: '90%', label: 'Revenue goes to creators' },
  { value: '₹0', label: 'Listing fee, forever' },
  { value: '18+', label: 'Tier-2 cities at launch' },
  { value: '3', label: 'Sides of one community' },
]

const TIERS = [
  {
    num:   '01',
    id:    'wanderer',
    name:  'Wanderer',
    story: 'I\'m exploring my city.',
    color: '#9896B0',
    bg:    'rgba(152,150,176,0.07)',
    border:'rgba(152,150,176,0.15)',
    icon:  'explore',
    perks: [
      'Weekly digest curated to your taste',
      'Save events & follow creators',
      'Attendance streak & city leaderboard',
    ],
    gate: 'Default on sign-up',
  },
  {
    num:   '02',
    id:    'local',
    name:  'Local',
    story: 'I belong to this scene.',
    color: '#F5A800',
    bg:    'rgba(245,168,0,0.07)',
    border:'rgba(245,168,0,0.2)',
    icon:  'home_pin',
    perks: [
      'Early access before public ticket sales',
      'Local-only pricing at partner Addas',
      'Streak freeze tokens — life happens',
    ],
    gate: '6 events attended in 90 days',
  },
  {
    num:   '03',
    id:    'lantern',
    name:  'Lantern',
    story: 'I bring people together.',
    color: '#5DD9D0',
    bg:    'rgba(93,217,208,0.07)',
    border:'rgba(93,217,208,0.2)',
    icon:  'light_mode',
    perks: [
      'Lantern Studio: full creator toolkit',
      'Platform fee drops from 10% → 8%',
      'Priority placement when events go live',
    ],
    gate: '3 events hosted, ≥4.5★ rating',
  },
  {
    num:   '04',
    id:    'beacon',
    name:  'Beacon',
    story: 'My passion is my livelihood.',
    color: '#a855f7',
    bg:    'rgba(168,85,247,0.07)',
    border:'rgba(168,85,247,0.22)',
    icon:  'workspace_premium',
    perks: [
      'Platform fee as low as 5%',
      'Beacon Fund grants for ambitious events',
      'Permanent Hall of Lights listing',
    ],
    gate: '36 events hosted, ≥4.7★, ≥30% repeat',
  },
]

const MISSION_ROWS = [
  {
    prefix: 'A platform for building',
    word: 'SAFE SPACES.',
    color: '#4ADE80',
    bg: 'rgba(74,222,128,0.10)',
  },
  {
    prefix: 'A platform for building',
    word: 'INCLUSIVE COMMUNITIES.',
    color: '#93B4FF',
    bg: 'rgba(99,149,255,0.10)',
  },
  {
    prefix: 'A platform for building',
    word: 'SECOND HOMES.',
    color: '#F5C842',
    bg: 'rgba(245,200,66,0.12)',
  },
]

const EVENT_TAGS = [
  { label: 'Jazz Nights', color: '#E8705A' },
  { label: 'Stand-up', color: '#F5A800' },
  { label: 'Workshops', color: '#5DD9D0' },
  { label: 'Art Pop-ups', color: '#9B8FFF' },
  { label: 'Open Mics', color: '#E8705A' },
  { label: 'Poetry Slams', color: '#4ADE80' },
  { label: 'Music Gigs', color: '#F5A800' },
]

export default function LandingPage() {
  const marqueeCities = [...CITIES, ...CITIES]

  return (
    <div className="min-h-screen bg-[#07070A] text-[#F0EFF8] overflow-x-hidden">

      {/* ── Noise grain ── */}
      <div
        aria-hidden="true"
        className="fixed inset-0 z-0 pointer-events-none select-none opacity-[0.028]"
        style={{
          backgroundImage: "url(\"data:image/svg+xml,%3Csvg viewBox='0 0 200 200' xmlns='http://www.w3.org/2000/svg'%3E%3Cfilter id='n'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.85' numOctaves='4' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23n)'/%3E%3C/svg%3E\")",
          backgroundSize: '200px 200px',
        }}
      />

      {/* ════════════════════════════════════════
          NAV
      ════════════════════════════════════════ */}
      <nav className="relative z-20 flex items-center justify-between px-6 py-5 md:px-14" style={{ borderBottom: '1px solid rgba(255,255,255,0.06)' }}>
        <Link href="/">
          <WimcLogo color="white" size="sm" />
        </Link>
        <div className="flex items-center gap-1">
          <a href="#mission" className="hidden md:flex items-center justify-center w-24 text-sm text-[#5C5A72] hover:text-[#9896B0] transition-colors">
            Mission
          </a>
          <Link href="/explore" className="hidden md:flex items-center justify-center w-24 text-sm text-[#5C5A72] hover:text-[#9896B0] transition-colors">
            Explore
          </Link>
          <a href="#tiers" className="hidden md:flex items-center justify-center w-24 text-sm text-[#5C5A72] hover:text-[#9896B0] transition-colors">
            Growth
          </a>
          <div className="w-5" />
          <Link
            href="/signin"
            className="px-5 py-2 rounded-full text-sm font-semibold bg-white text-[#07070A] hover:bg-[#E8E7F0] transition-colors"
          >
            Login
          </Link>
        </div>
      </nav>

      {/* ════════════════════════════════════════
          HERO
      ════════════════════════════════════════ */}
      <section className="relative z-10 px-6 pt-16 pb-24 md:px-14" style={{ borderBottom: '1px solid rgba(255,255,255,0.06)' }}>
        <div className="max-w-7xl mx-auto">

          {/* Live indicator */}
          <div className="flex items-center gap-2.5 mb-10">
            <span
              className="w-1.5 h-1.5 rounded-full bg-[#E8705A]"
              style={{ animation: 'wimc-bloom-pulse 2s ease-in-out infinite' }}
            />
            <span className="text-[11px] font-bold uppercase tracking-[0.22em] text-[#5C5A72]">
              When In My City · Tier-2 India
            </span>
          </div>

          {/* Giant display headline */}
          <h1
            className="font-display font-black tracking-[-0.045em] leading-[0.86] mb-16"
            style={{ fontSize: 'clamp(52px, 9.5vw, 114px)' }}
          >
            <span className="block text-white">Culture lives</span>
            <span
              className="block"
              style={{
                backgroundImage: 'linear-gradient(110deg, #E8705A 0%, #F5A800 60%)',
                WebkitBackgroundClip: 'text',
                WebkitTextFillColor: 'transparent',
                backgroundClip: 'text',
              }}
            >
              offline.
            </span>
            <span className="block" style={{ color: '#7878A0' }}>We keep it</span>
            <span className="block text-white">connected.</span>
          </h1>

          {/* Sub-row */}
          <div className="flex flex-col md:flex-row gap-10 md:gap-20 md:items-end">
            <p className="text-base md:text-[17px] leading-relaxed text-[#9896B0] max-w-md">
              WIMC is where India&apos;s Tier-2 cities build their offline culture —
              connecting creators who perform, venues that host, and communities who show up.
            </p>

            {/* Event type tags — mood-board-inspired colorful collage */}
            <div className="flex flex-wrap gap-2 md:pb-1">
              {EVENT_TAGS.map((tag) => (
                <span
                  key={tag.label}
                  className="px-3 py-1.5 rounded-full text-[12px] font-semibold"
                  style={{
                    background: `${tag.color}16`,
                    color: tag.color,
                    border: `1px solid ${tag.color}28`,
                  }}
                >
                  {tag.label}
                </span>
              ))}
            </div>
          </div>

        </div>
      </section>

      {/* ════════════════════════════════════════
          CITIES MARQUEE
      ════════════════════════════════════════ */}
      <div
        className="relative z-10 overflow-hidden py-4"
        style={{ borderBottom: '1px solid rgba(255,255,255,0.06)' }}
      >
        <div className="flex items-center whitespace-nowrap marquee-normal" style={{ width: 'max-content' }}>
          {marqueeCities.map((city, i) => (
            <span key={i} className="flex items-center gap-4 mx-4">
              <span className="text-[11px] font-bold tracking-[0.2em] uppercase text-[#5C5A72]">{city}</span>
              <span className="w-0.5 h-0.5 rounded-full bg-[#3C3A52]" />
            </span>
          ))}
        </div>
      </div>

      {/* ════════════════════════════════════════
          THREE PILLARS — what we do
      ════════════════════════════════════════ */}
      <section
        className="relative z-10 px-6 py-20 md:px-14"
        style={{ borderBottom: '1px solid rgba(255,255,255,0.06)' }}
      >
        <div className="max-w-7xl mx-auto">

          <p className="text-[11px] font-bold uppercase tracking-[0.2em] mb-12" style={{ color: '#5C5A72' }}>
            The platform for
          </p>

          <div className="grid md:grid-cols-3 gap-px rounded-2xl overflow-hidden" style={{ background: 'rgba(255,255,255,0.05)' }}>
            {[
              {
                num: '01',
                label: 'Makers',
                color: '#E8705A',
                bg: 'rgba(232,112,90,0.08)',
                icon: 'mic',
                desc: 'Musicians, comedians, artists, pottery teachers — anyone who creates live experiences and wants an audience for them.',
              },
              {
                num: '02',
                label: 'Addas',
                color: '#5DD9D0',
                bg: 'rgba(93,217,208,0.08)',
                icon: 'storefront',
                desc: 'Café backrooms, rooftops, studios, galleries — spaces with character that want to host culture, not just coffee.',
              },
              {
                num: '03',
                label: 'Community',
                color: '#F5A800',
                bg: 'rgba(245,168,0,0.08)',
                icon: 'groups',
                desc: 'Explorers, regulars, first-timers — the city itself, discovering events and building the audience every creator needs.',
              },
            ].map((p) => (
              <div key={p.num} className="p-8 md:p-10 flex flex-col" style={{ background: '#07070A' }}>
                <div className="flex items-start justify-between mb-10">
                  <span className="text-[11px] font-bold uppercase tracking-[0.2em]" style={{ color: p.color }}>
                    {p.num}
                  </span>
                  <div
                    className="w-8 h-8 rounded-lg flex items-center justify-center"
                    style={{ background: p.bg }}
                  >
                    <span className="material-symbols-outlined" style={{ color: p.color, fontSize: '16px' }}>
                      {p.icon}
                    </span>
                  </div>
                </div>
                <h3
                  className="font-display font-black text-white tracking-tight mb-4"
                  style={{ fontSize: 'clamp(24px, 3vw, 32px)' }}
                >
                  {p.label}
                </h3>
                <p className="text-[13px] leading-relaxed" style={{ color: '#9896B0' }}>
                  {p.desc}
                </p>
              </div>
            ))}
          </div>

          <p className="mt-10 text-[13px] leading-relaxed max-w-2xl" style={{ color: '#9896B0' }}>
            When makers find addas and communities show up — that&apos;s when a city stops being a place you live in and starts being a place you belong to.
          </p>

        </div>
      </section>

      {/* ════════════════════════════════════════
          THE TWO BIG CTA PANELS
      ════════════════════════════════════════ */}
      <section
        className="relative z-10 px-6 py-20 md:px-14"
        style={{ borderBottom: '1px solid rgba(255,255,255,0.06)' }}
      >
        <div className="max-w-7xl mx-auto">

          {/* Section header */}
          <div className="flex flex-col md:flex-row md:items-end justify-between gap-6 mb-12">
            <h2
              className="font-display font-black tracking-[-0.045em] leading-[0.88] text-white"
              style={{ fontSize: 'clamp(38px, 6.5vw, 76px)' }}
            >
              Choose<br />your role.
            </h2>
            <p className="text-sm leading-relaxed max-w-xs" style={{ color: '#9896B0' }}>
              Two paths, one platform. Whether you make the culture or make the space — WIMC has a home for you.
            </p>
          </div>

          {/* ── PANELS ── */}
          <div className="grid md:grid-cols-2 gap-4">

            {/* ── MAKER PANEL ── */}
            <Link
              href="/signin?next=/onboarding/screen-1"
              className="group block overflow-hidden rounded-3xl transition-all duration-300 hover:-translate-y-1.5"
              style={{ outline: '1px solid rgba(232,112,90,0.22)' }}
            >
              {/* TOP COLOR BAND — coral editorial flag */}
              <div
                className="relative overflow-hidden px-8 pt-8 pb-12 md:px-10"
                style={{ background: '#E8705A', minHeight: '230px' }}
              >
                {/* Giant watermark number behind everything */}
                <div
                  aria-hidden="true"
                  className="absolute bottom-[-24px] right-[-8px] font-display font-black leading-none select-none pointer-events-none"
                  style={{
                    fontSize: 'clamp(150px, 20vw, 240px)',
                    color: 'rgba(255,255,255,0.09)',
                    letterSpacing: '-0.06em',
                    lineHeight: 1,
                  }}
                >
                  01
                </div>

                {/* Top row: role label + arrow indicator */}
                <div className="relative flex items-center justify-between mb-7">
                  <span className="text-[11px] font-bold uppercase tracking-[0.24em] text-white/60">
                    For Makers
                  </span>
                  <div
                    className="w-8 h-8 rounded-full border border-white/30 flex items-center justify-center transition-all duration-300 group-hover:bg-white/15"
                  >
                    <span className="material-symbols-outlined text-white" style={{ fontSize: '15px' }}>
                      arrow_forward
                    </span>
                  </div>
                </div>

                {/* Bold headline */}
                <h3
                  className="relative font-display font-black text-white leading-[0.84] tracking-[-0.045em]"
                  style={{ fontSize: 'clamp(44px, 6vw, 76px)' }}
                >
                  Your<br />stage.
                </h3>
              </div>

              {/* BOTTOM DARK CONTENT ZONE */}
              <div className="p-8 md:p-10 flex flex-col gap-7" style={{ background: '#100908' }}>
                <p className="text-[15px] leading-relaxed" style={{ color: '#9896B0' }}>
                  Host ticketed events, build your link-in-bio, sell tickets with UPI —
                  and keep 90% of everything you earn. No hidden fees.
                </p>

                <ul className="space-y-3">
                  {MAKER_FEATURES.map((f) => (
                    <li key={f} className="flex items-center gap-3 text-[13px]" style={{ color: '#9896B0' }}>
                      <span
                        className="w-1.5 h-1.5 rounded-full flex-shrink-0"
                        style={{ background: '#E8705A' }}
                      />
                      {f}
                    </li>
                  ))}
                </ul>

                <div className="flex items-center justify-between pt-1">
                  <div
                    className="inline-flex items-center gap-2.5 px-6 py-3 rounded-full text-sm font-semibold transition-all duration-300 group-hover:gap-4"
                    style={{ background: '#E8705A', color: 'white' }}
                  >
                    Start for free
                    <span className="material-symbols-outlined" style={{ fontSize: '16px' }}>arrow_forward</span>
                  </div>
                  <span className="text-[11px] font-medium" style={{ color: '#9896B0' }}>Free forever</span>
                </div>
              </div>
            </Link>

            {/* ── ADDA PANEL ── */}
            <Link
              href="/signin?next=/adda/onboard"
              className="group block overflow-hidden rounded-3xl transition-all duration-300 hover:-translate-y-1.5"
              style={{ outline: '1px solid rgba(93,217,208,0.18)' }}
            >
              {/* TOP COLOR BAND — teal editorial flag */}
              <div
                className="relative overflow-hidden px-8 pt-8 pb-12 md:px-10"
                style={{ background: '#5DD9D0', minHeight: '230px' }}
              >
                {/* Giant watermark number */}
                <div
                  aria-hidden="true"
                  className="absolute bottom-[-24px] right-[-8px] font-display font-black leading-none select-none pointer-events-none"
                  style={{
                    fontSize: 'clamp(150px, 20vw, 240px)',
                    color: 'rgba(0,0,0,0.07)',
                    letterSpacing: '-0.06em',
                    lineHeight: 1,
                  }}
                >
                  02
                </div>

                {/* Top row: role label + arrow indicator */}
                <div className="relative flex items-center justify-between mb-7">
                  <span className="text-[11px] font-bold uppercase tracking-[0.24em] text-[#07070A]/50">
                    For Addas
                  </span>
                  <div
                    className="w-8 h-8 rounded-full border border-[#07070A]/20 flex items-center justify-center transition-all duration-300 group-hover:bg-[#07070A]/10"
                  >
                    <span className="material-symbols-outlined text-[#07070A]" style={{ fontSize: '15px' }}>
                      arrow_forward
                    </span>
                  </div>
                </div>

                {/* Bold headline */}
                <h3
                  className="relative font-display font-black text-[#07070A] leading-[0.84] tracking-[-0.045em]"
                  style={{ fontSize: 'clamp(44px, 6vw, 76px)' }}
                >
                  Open<br />your doors.
                </h3>
              </div>

              {/* BOTTOM DARK CONTENT ZONE */}
              <div className="p-8 md:p-10 flex flex-col gap-7" style={{ background: '#07100F' }}>
                <p className="text-[15px] leading-relaxed" style={{ color: '#9896B0' }}>
                  List your café, rooftop, studio, or gallery. Let creators come to you with
                  real bookings and fill every night of the week.
                </p>

                <ul className="space-y-3">
                  {ADDA_FEATURES.map((f) => (
                    <li key={f} className="flex items-center gap-3 text-[13px]" style={{ color: '#9896B0' }}>
                      <span
                        className="w-1.5 h-1.5 rounded-full flex-shrink-0"
                        style={{ background: '#5DD9D0' }}
                      />
                      {f}
                    </li>
                  ))}
                </ul>

                <div className="flex items-center justify-between pt-1">
                  <div
                    className="inline-flex items-center gap-2.5 px-6 py-3 rounded-full text-sm font-semibold transition-all duration-300 group-hover:gap-4"
                    style={{ background: '#5DD9D0', color: '#07070A' }}
                  >
                    List your Adda
                    <span className="material-symbols-outlined" style={{ fontSize: '16px' }}>arrow_forward</span>
                  </div>
                  <span className="text-[11px] font-medium" style={{ color: '#9896B0' }}>Free to list</span>
                </div>
              </div>
            </Link>

          </div>
        </div>
      </section>

      {/* ════════════════════════════════════════
          STATS STRIP
      ════════════════════════════════════════ */}
      <div
        className="relative z-10 px-6 py-14 md:px-14"
        style={{ background: '#0A0A0D', borderBottom: '1px solid rgba(255,255,255,0.06)' }}
      >
        <div className="max-w-7xl mx-auto grid grid-cols-2 md:grid-cols-4 gap-8 md:gap-4 md:divide-x md:divide-white/[0.05]">
          {STATS.map((s) => (
            <div key={s.label} className="md:pl-8 first:pl-0">
              <div
                className="font-display font-black text-3xl md:text-4xl tracking-tight mb-2 text-transparent bg-clip-text"
                style={{ backgroundImage: 'linear-gradient(135deg, #E8705A, #F5A800)' }}
              >
                {s.value}
              </div>
              <div className="text-[12px] font-medium" style={{ color: '#9896B0' }}>{s.label}</div>
            </div>
          ))}
        </div>
      </div>

      {/* ════════════════════════════════════════
          MISSION / MANIFESTO
      ════════════════════════════════════════ */}
      <section
        id="mission"
        className="relative z-10 px-6 py-20 md:px-14"
        style={{ background: '#05050A', borderBottom: '1px solid rgba(255,255,255,0.06)' }}
      >
        <div className="max-w-7xl mx-auto">
          <p className="text-[11px] font-bold uppercase tracking-[0.2em] mb-10" style={{ color: '#5C5A72' }}>
            Our mission
          </p>

          <div className="space-y-3">
            {MISSION_ROWS.map((row, i) => (
              <div key={i} className="flex flex-wrap items-stretch gap-x-2 gap-y-2">
                <div
                  className="flex items-center px-4 py-3 md:px-6"
                  style={{ background: 'rgba(255,255,255,0.03)', borderRadius: 4 }}
                >
                  <span
                    className="font-display font-bold text-[#9896B0]"
                    style={{ fontSize: 'clamp(15px, 2.6vw, 26px)', letterSpacing: '-0.02em' }}
                  >
                    {row.prefix}
                  </span>
                </div>
                <div
                  className="flex items-center px-4 py-3 md:px-6"
                  style={{ background: row.bg, borderRadius: 4 }}
                >
                  <span
                    className="font-display font-black"
                    style={{ fontSize: 'clamp(15px, 2.6vw, 26px)', letterSpacing: '-0.02em', color: row.color }}
                  >
                    {row.word}
                  </span>
                </div>
              </div>
            ))}
          </div>

          <p className="mt-10 text-sm leading-relaxed max-w-xl" style={{ color: '#9896B0' }}>
            Every creator, venue, and explorer in{' '}
            <span style={{ color: '#F5C842', fontWeight: 600 }}>OURCITY</span>
            {' '}is on their own unique path to becoming a City Zen™.
          </p>
        </div>
      </section>

      {/* ════════════════════════════════════════
          TIERS — the progression ladder
      ════════════════════════════════════════ */}
      <section
        id="tiers"
        className="relative z-10 px-6 py-20 md:px-14"
        style={{ background: '#06060A', borderBottom: '1px solid rgba(255,255,255,0.06)' }}
      >
        <div className="max-w-7xl mx-auto">

          {/* Section header */}
          <div className="flex flex-col md:flex-row md:items-end justify-between gap-6 mb-14">
            <div>
              <p className="text-[11px] font-bold uppercase tracking-[0.2em] mb-4" style={{ color: '#5C5A72' }}>
                How you grow
              </p>
              <h2
                className="font-display font-black tracking-[-0.045em] leading-[0.88] text-white"
                style={{ fontSize: 'clamp(36px, 5.5vw, 68px)' }}
              >
                Your path<br />through the city.
              </h2>
            </div>
            <p className="text-sm leading-relaxed max-w-xs" style={{ color: '#9896B0' }}>
              Every WIMC member earns their place. The more you show up, the more the city opens up for you.
            </p>
          </div>

          {/* Tier cards — horizontal ladder */}
          <div className="grid md:grid-cols-4 gap-4">
            {TIERS.map((tier, i) => (
              <div
                key={tier.id}
                className="relative flex flex-col rounded-2xl overflow-hidden"
                style={{ border: `1px solid ${tier.border}`, background: '#07070A' }}
              >
                {/* Top accent band */}
                <div
                  className="h-1 w-full"
                  style={{ background: tier.color, opacity: 0.7 }}
                />

                <div className="p-6 flex flex-col gap-5 flex-1">

                  {/* Number + icon row */}
                  <div className="flex items-start justify-between">
                    <span
                      className="text-[11px] font-bold uppercase tracking-[0.22em]"
                      style={{ color: tier.color }}
                    >
                      {tier.num}
                    </span>
                    <div
                      className="w-8 h-8 rounded-lg flex items-center justify-center"
                      style={{ background: tier.bg }}
                    >
                      <span
                        className="material-symbols-outlined"
                        style={{ color: tier.color, fontSize: '16px', fontVariationSettings: "'FILL' 1" }}
                      >
                        {tier.icon}
                      </span>
                    </div>
                  </div>

                  {/* Tier name */}
                  <div>
                    <h3
                      className="font-display font-black text-white tracking-tight leading-none mb-2"
                      style={{ fontSize: 'clamp(22px, 2.5vw, 30px)' }}
                    >
                      {tier.name}
                    </h3>
                    <p className="text-[12px] italic" style={{ color: tier.color, opacity: 0.85 }}>
                      &ldquo;{tier.story}&rdquo;
                    </p>
                  </div>

                  {/* Perks */}
                  <ul className="space-y-2.5 flex-1">
                    {tier.perks.map((perk) => (
                      <li key={perk} className="flex items-start gap-2.5 text-[12.5px]" style={{ color: '#9896B0' }}>
                        <span
                          className="w-1 h-1 rounded-full mt-1.5 flex-shrink-0"
                          style={{ background: tier.color }}
                        />
                        {perk}
                      </li>
                    ))}
                  </ul>

                  {/* Gate */}
                  <div
                    className="mt-auto pt-4 flex items-center gap-2"
                    style={{ borderTop: `1px solid ${tier.border}` }}
                  >
                    <span className="material-symbols-outlined" style={{ fontSize: 13, color: '#5C5A72' }}>
                      {i === 0 ? 'radio_button_checked' : 'lock'}
                    </span>
                    <span className="text-[11px] font-medium" style={{ color: '#5C5A72' }}>
                      {tier.gate}
                    </span>
                  </div>

                </div>
              </div>
            ))}
          </div>

          {/* Arrow connectors — desktop only */}
          <div className="hidden md:flex items-center justify-center gap-0 mt-6">
            {TIERS.map((tier, i) => (
              <div key={tier.id} className="flex items-center">
                <div
                  className="w-3 h-3 rounded-full"
                  style={{ background: tier.color, opacity: 0.5 }}
                />
                {i < TIERS.length - 1 && (
                  <div
                    className="h-px flex-1"
                    style={{
                      width: '200px',
                      background: `linear-gradient(90deg, ${tier.color}44, ${TIERS[i + 1].color}44)`,
                    }}
                  />
                )}
              </div>
            ))}
          </div>
          <p className="hidden md:block text-center text-[11px] mt-3 font-medium" style={{ color: '#5C5A72' }}>
            Every tier earned — never bought.
          </p>

        </div>
      </section>

      {/* ════════════════════════════════════════
          FOOTER
      ════════════════════════════════════════ */}
      <footer className="relative z-10 px-6 py-10 md:px-14">
        <div className="max-w-7xl mx-auto flex flex-col sm:flex-row items-start sm:items-center justify-between gap-6">
          <div>
            <WimcLogo color="white" size="xs" />
            <p className="text-[10px] mt-2 font-bold tracking-widest uppercase" style={{ color: '#5C5A72' }}>
              wheninmycity.com
            </p>
          </div>
          <div className="flex flex-wrap items-center gap-x-6 gap-y-2 text-[12px]" style={{ color: '#5C5A72' }}>
            <Link href="/explore" className="hover:text-[#9896B0] transition-colors">Explore events</Link>
            <Link href="/signin?next=/onboarding/screen-1" className="hover:text-[#9896B0] transition-colors">For Creators</Link>
            <Link href="/signin?next=/adda/onboard" className="hover:text-[#9896B0] transition-colors">For Venues</Link>
            <Link href="/signin" className="hover:text-[#9896B0] transition-colors">Sign in</Link>
            <span>© 2025 When In My City</span>
          </div>
        </div>
      </footer>

    </div>
  )
}
