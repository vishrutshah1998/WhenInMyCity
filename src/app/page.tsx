import Link from 'next/link'
import { WimcLogo } from '@/components/WimcLogo'

const CITIES = [
  'Indore', 'Jaipur', 'Bhopal', 'Chandigarh', 'Kochi', 'Mysuru',
  'Vadodara', 'Dehradun', 'Ranchi', 'Coimbatore', 'Agra', 'Vijayawada',
  'Surat', 'Nagpur', 'Lucknow', 'Amritsar', 'Jodhpur', 'Udaipur',
]

const CREATOR_FEATURES = [
  {
    icon: 'link',
    title: 'Your link-in-bio page',
    desc: 'A beautiful /{username} page with your events, social embeds, and story. Share it anywhere.',
  },
  {
    icon: 'confirmation_number',
    title: 'Sell tickets seamlessly',
    desc: 'UPI checkout, automated QR codes, attendee management — all built in. You keep 90%.',
  },
  {
    icon: 'bar_chart',
    title: 'Insights that matter',
    desc: 'Track revenue, see who showed up, and grow your audience city by city.',
  },
]

const ADDA_FEATURES = [
  {
    icon: 'manage_search',
    title: 'Get discovered by creators',
    desc: 'List your space and let musicians, comedians, and artists come to you — not the other way around.',
  },
  {
    icon: 'calendar_month',
    title: 'Manage bookings easily',
    desc: 'Calendar view, proposals, confirmed slots, and revenue — one clean dashboard.',
  },
  {
    icon: 'payments',
    title: 'Earn from idle hours',
    desc: 'Turn quiet weekday evenings into consistent revenue. Your space works harder for you.',
  },
]

const MISSION_ROWS = [
  {
    prefix: 'A platform for building',
    word1: 'SAFE',
    word1Style: { background: 'rgba(255,255,255,0.08)', color: '#E8E7F0' },
    word2: 'SPACES.',
    word2Style: { background: 'rgba(74,222,128,0.18)', color: '#4ADE80' },
  },
  {
    prefix: 'A platform for building',
    word1: 'INCLUSIVE',
    word1Style: { background: 'rgba(255,255,255,0.06)', color: '#E8E7F0' },
    word2: 'COMMUNITIES.',
    word2Style: { background: 'rgba(99,149,255,0.18)', color: '#93B4FF' },
  },
  {
    prefix: 'A platform for building',
    word1: 'SECOND',
    word1Style: { background: 'rgba(255,255,255,0.05)', color: '#E8E7F0', textDecoration: 'underline', textUnderlineOffset: 4 },
    word2: 'HOMES.',
    word2Style: { background: 'rgba(245,168,0,0.2)', color: '#F5C842' },
  },
]

export default function LandingPage() {
  const marqueeCities = [...CITIES, ...CITIES]

  return (
    <div className="min-h-screen bg-[#080809] text-[#F0EFF8] overflow-x-hidden">

      {/* ── Aurora background blobs ── */}
      <div aria-hidden="true" className="fixed inset-0 z-0 overflow-hidden pointer-events-none select-none">
        <div
          className="absolute top-[-25%] left-[0%] w-[900px] h-[900px] rounded-full bg-[#E8705A] opacity-[0.055] blur-[160px]"
          style={{ animation: 'wimc-luma-a 22s ease-in-out infinite' }}
        />
        <div
          className="absolute top-[15%] right-[-20%] w-[750px] h-[750px] rounded-full bg-[#5DD9D0] opacity-[0.045] blur-[140px]"
          style={{ animation: 'wimc-luma-b 28s ease-in-out infinite' }}
        />
        <div
          className="absolute bottom-[-15%] left-[25%] w-[650px] h-[650px] rounded-full bg-[#F5A800] opacity-[0.035] blur-[120px]"
          style={{ animation: 'wimc-luma-c 20s ease-in-out infinite' }}
        />
      </div>

      {/* ════════════════════════════════════════════════════════════
          NAV
      ════════════════════════════════════════════════════════════ */}
      <nav className="relative z-20 flex items-center justify-between px-6 py-5 md:px-14 lg:px-24">
        <Link href="/">
          <WimcLogo color="white" size="sm" />
        </Link>
        <div className="flex items-center gap-3">
          <Link
            href="/explore"
            className="hidden md:block text-sm text-[#5C5A72] hover:text-[#9896B0] transition-colors"
          >
            Explore events
          </Link>
          <Link
            href="/signin"
            className="px-5 py-2 rounded-full text-sm font-semibold bg-white text-[#080809] hover:bg-[#E8E7F0] transition-colors"
          >
            Sign in
          </Link>
        </div>
      </nav>

      {/* ════════════════════════════════════════════════════════════
          HERO
      ════════════════════════════════════════════════════════════ */}
      <section className="relative z-10 px-6 pt-10 pb-24 md:px-14 lg:px-24">
        <div className="max-w-7xl mx-auto">

          {/* Pill badge */}
          <div
            className="inline-flex items-center gap-2.5 px-4 py-1.5 rounded-full mb-10"
            style={{ background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.08)' }}
          >
            <span
              className="w-1.5 h-1.5 rounded-full bg-[#E8705A]"
              style={{ animation: 'wimc-bloom-pulse 2s ease-in-out infinite' }}
            />
            <span className="text-[11px] font-medium tracking-wide text-[#9896B0]">
              Now live · Tier-2 India
            </span>
          </div>

          {/* Large logo lockup above headline */}
          <div className="mb-6">
            <WimcLogo color="white" size="lg" />
          </div>

          {/* Gradient tagline */}
          <p
            className="font-display font-black leading-[0.88] tracking-[-0.04em] mb-8"
            style={{
              fontSize: 'clamp(38px, 7vw, 80px)',
              backgroundImage: 'linear-gradient(130deg, #E8705A 0%, #F5A800 45%, #5DD9D0 100%)',
              WebkitBackgroundClip: 'text',
              WebkitTextFillColor: 'transparent',
              backgroundClip: 'text',
            }}
          >
            Creator-led experiences.<br />Every city. Every night.
          </p>

          {/* Subtext + CTAs */}
          <div className="flex flex-col lg:flex-row lg:items-end gap-12 lg:gap-24">
            <p className="text-[#9896B0] text-lg md:text-xl max-w-md leading-relaxed lg:pb-2">
              Concerts, workshops, comedy nights, pop-ups — in every Tier-2 city worth being in. Host them. Discover them. Live them.
            </p>

            {/* Dual CTA cards */}
            <div className="flex flex-col sm:flex-row gap-4 flex-shrink-0">

              {/* Creator CTA */}
              <Link
                href="/signin?next=/onboarding/screen-1"
                className="group relative overflow-hidden rounded-2xl p-7 w-full sm:w-64"
                style={{
                  background: 'linear-gradient(145deg, #1C1015 0%, #131318 100%)',
                  border: '1px solid rgba(232,112,90,0.22)',
                }}
              >
                <div
                  className="absolute inset-0 opacity-0 group-hover:opacity-100 transition-opacity duration-500"
                  style={{ background: 'radial-gradient(circle at 25% 35%, rgba(232,112,90,0.18) 0%, transparent 65%)' }}
                />
                <div className="relative space-y-5">
                  <div className="w-11 h-11 rounded-xl flex items-center justify-center" style={{ background: 'rgba(232,112,90,0.12)' }}>
                    <span className="material-symbols-outlined" style={{ color: '#E8705A', fontSize: '20px' }}>mic</span>
                  </div>
                  <div>
                    <div className="text-[10px] font-bold uppercase tracking-[0.14em] mb-1.5" style={{ color: '#E8705A' }}>For Makers</div>
                    <h3 className="font-display font-bold text-[18px] text-white mb-2 leading-tight">
                      Host events &amp;<br />sell tickets
                    </h3>
                    <p className="text-[13px] leading-relaxed" style={{ color: '#5C5A72' }}>
                      Link-in-bio + ticketing. All in one place.
                    </p>
                  </div>
                  <div
                    className="flex items-center gap-1 text-[13px] font-semibold group-hover:gap-2.5 transition-all duration-200"
                    style={{ color: '#E8705A' }}
                  >
                    Start for free
                    <span className="material-symbols-outlined" style={{ fontSize: '16px' }}>arrow_forward</span>
                  </div>
                </div>
              </Link>

              {/* Venue CTA */}
              <Link
                href="/signin?next=/adda/onboard"
                className="group relative overflow-hidden rounded-2xl p-7 w-full sm:w-64"
                style={{
                  background: 'linear-gradient(145deg, #101A1A 0%, #131318 100%)',
                  border: '1px solid rgba(93,217,208,0.22)',
                }}
              >
                <div
                  className="absolute inset-0 opacity-0 group-hover:opacity-100 transition-opacity duration-500"
                  style={{ background: 'radial-gradient(circle at 25% 35%, rgba(93,217,208,0.15) 0%, transparent 65%)' }}
                />
                <div className="relative space-y-5">
                  <div className="w-11 h-11 rounded-xl flex items-center justify-center" style={{ background: 'rgba(93,217,208,0.10)' }}>
                    <span className="material-symbols-outlined" style={{ color: '#5DD9D0', fontSize: '20px' }}>storefront</span>
                  </div>
                  <div>
                    <div className="text-[10px] font-bold uppercase tracking-[0.14em] mb-1.5" style={{ color: '#5DD9D0' }}>For Addas</div>
                    <h3 className="font-display font-bold text-[18px] text-white mb-2 leading-tight">
                      List your space,<br />fill every night
                    </h3>
                    <p className="text-[13px] leading-relaxed" style={{ color: '#5C5A72' }}>
                      Let creators find you. Earn from idle hours.
                    </p>
                  </div>
                  <div
                    className="flex items-center gap-1 text-[13px] font-semibold group-hover:gap-2.5 transition-all duration-200"
                    style={{ color: '#5DD9D0' }}
                  >
                    List your Adda
                    <span className="material-symbols-outlined" style={{ fontSize: '16px' }}>arrow_forward</span>
                  </div>
                </div>
              </Link>

            </div>
          </div>
        </div>
      </section>

      {/* ════════════════════════════════════════════════════════════
          BRAND MISSION
      ════════════════════════════════════════════════════════════ */}
      <section
        className="relative z-10 px-6 py-20 md:px-14 lg:px-24"
        style={{ background: '#05050A', borderTop: '1px solid rgba(255,255,255,0.04)' }}
      >
        <div className="max-w-7xl mx-auto">
          <p className="text-[11px] font-bold uppercase tracking-[0.2em] mb-10" style={{ color: '#3C3A52' }}>
            Brand Mission
          </p>

          {/* Stacked mission rows */}
          <div className="space-y-3">
            {MISSION_ROWS.map((row, i) => (
              <div key={i} className="flex flex-wrap items-stretch gap-x-2 gap-y-2">

                {/* Prefix */}
                <div
                  className="flex items-center px-4 py-3 md:px-6"
                  style={{
                    background: 'rgba(255,255,255,0.04)',
                    borderRadius: 4,
                  }}
                >
                  <span
                    className="font-display font-bold text-[#9896B0]"
                    style={{ fontSize: 'clamp(16px, 3vw, 28px)', letterSpacing: '-0.02em' }}
                  >
                    {row.prefix}
                  </span>
                </div>

                {/* Word 1 */}
                <div
                  className="flex items-center px-4 py-3 md:px-6"
                  style={{ ...row.word1Style, borderRadius: 4 }}
                >
                  <span
                    className="font-display font-bold"
                    style={{ fontSize: 'clamp(16px, 3vw, 28px)', letterSpacing: '-0.02em' }}
                  >
                    {row.word1}
                  </span>
                </div>

                {/* Word 2 */}
                <div
                  className="flex items-center px-4 py-3 md:px-6"
                  style={{ ...row.word2Style, borderRadius: 4 }}
                >
                  <span
                    className="font-display font-bold"
                    style={{ fontSize: 'clamp(16px, 3vw, 28px)', letterSpacing: '-0.02em' }}
                  >
                    {row.word2}
                  </span>
                </div>

              </div>
            ))}
          </div>

          {/* Footnote */}
          <p className="mt-10 text-sm leading-relaxed max-w-xl" style={{ color: '#3C3A52' }}>
            *Every creator, venue, and explorer in{' '}
            <span style={{ color: '#F5C842', fontWeight: 600 }}>OURCITY</span>
            {' '}is on their own unique path to becoming a City Zen™.
          </p>
        </div>
      </section>

      {/* ════════════════════════════════════════════════════════════
          CITIES MARQUEE
      ════════════════════════════════════════════════════════════ */}
      <div
        className="relative z-10 overflow-hidden py-5"
        style={{ borderTop: '1px solid rgba(255,255,255,0.05)', borderBottom: '1px solid rgba(255,255,255,0.05)' }}
      >
        <div className="flex items-center whitespace-nowrap marquee-normal" style={{ width: 'max-content' }}>
          {marqueeCities.map((city, i) => (
            <span key={i} className="flex items-center gap-5 mx-5">
              <span className="text-[13px] font-medium text-[#3C3A52]">{city}</span>
              <span className="w-1 h-1 rounded-full bg-[#1E1E28]" />
            </span>
          ))}
        </div>
      </div>

      {/* ════════════════════════════════════════════════════════════
          FOR MAKERS
      ════════════════════════════════════════════════════════════ */}
      <section className="relative z-10 px-6 py-24 md:px-14 lg:px-24">
        <div className="max-w-7xl mx-auto">
          <div className="flex items-center gap-2 mb-8">
            <div className="w-7 h-7 rounded-lg flex items-center justify-center" style={{ background: 'rgba(232,112,90,0.12)' }}>
              <span className="material-symbols-outlined" style={{ color: '#E8705A', fontSize: '15px' }}>mic</span>
            </div>
            <span className="text-[11px] font-bold uppercase tracking-[0.14em]" style={{ color: '#E8705A' }}>For Makers</span>
          </div>

          <div className="flex flex-col lg:flex-row gap-16 lg:gap-24 lg:items-start">
            <div className="lg:w-[380px] flex-shrink-0">
              <h2
                className="font-display font-black tracking-[-0.04em] leading-[0.9] mb-5 text-white"
                style={{ fontSize: 'clamp(38px, 6vw, 60px)' }}
              >
                Your city.<br />Your audience.<br />Your stage.
              </h2>
              <p className="text-base leading-relaxed mb-8" style={{ color: '#9896B0' }}>
                Whether you&apos;re a jazz musician, stand-up comedian, pottery teacher, or spoken word artist — WIMC gives you everything to put on a show.
              </p>
              <Link
                href="/signin?next=/onboarding/screen-1"
                className="inline-flex items-center gap-2 px-6 py-3 rounded-full text-sm font-semibold transition-opacity hover:opacity-90"
                style={{ background: '#E8705A', color: 'white' }}
              >
                Start hosting
                <span className="material-symbols-outlined" style={{ fontSize: '16px' }}>arrow_forward</span>
              </Link>
            </div>

            <div className="grid sm:grid-cols-3 gap-4 flex-1">
              {CREATOR_FEATURES.map((f) => (
                <div key={f.icon} className="rounded-2xl p-6" style={{ background: '#0F0F14', border: '1px solid rgba(255,255,255,0.06)' }}>
                  <div className="w-10 h-10 rounded-xl mb-5 flex items-center justify-center" style={{ background: 'rgba(232,112,90,0.10)' }}>
                    <span className="material-symbols-outlined" style={{ color: '#E8705A', fontSize: '18px' }}>{f.icon}</span>
                  </div>
                  <h4 className="font-semibold text-[15px] text-white mb-2">{f.title}</h4>
                  <p className="text-[13px] leading-relaxed" style={{ color: '#5C5A72' }}>{f.desc}</p>
                </div>
              ))}
            </div>
          </div>
        </div>
      </section>

      {/* ════════════════════════════════════════════════════════════
          STATS STRIP
      ════════════════════════════════════════════════════════════ */}
      <div
        className="relative z-10 px-6 py-12 md:px-14 lg:px-24"
        style={{ background: '#0C0C10', borderTop: '1px solid rgba(255,255,255,0.05)', borderBottom: '1px solid rgba(255,255,255,0.05)' }}
      >
        <div className="max-w-7xl mx-auto grid grid-cols-2 md:grid-cols-4 gap-8">
          {[
            { value: '90%', label: 'Revenue to creators' },
            { value: '₹0', label: 'Platform listing fee' },
            { value: 'Tier-2', label: 'First & only focus' },
            { value: '∞', label: 'Events, no limit' },
          ].map((s) => (
            <div key={s.label} className="text-center md:text-left">
              <div
                className="font-display font-black text-3xl md:text-4xl tracking-tight mb-1 text-transparent bg-clip-text"
                style={{ backgroundImage: 'linear-gradient(135deg, #E8705A, #F5A800)' }}
              >
                {s.value}
              </div>
              <div className="text-[12px] font-medium" style={{ color: '#5C5A72' }}>{s.label}</div>
            </div>
          ))}
        </div>
      </div>

      {/* ════════════════════════════════════════════════════════════
          FOR ADDAS
      ════════════════════════════════════════════════════════════ */}
      <section className="relative z-10 px-6 py-24 md:px-14 lg:px-24">
        <div className="max-w-7xl mx-auto">
          <div className="flex items-center gap-2 mb-8">
            <div className="w-7 h-7 rounded-lg flex items-center justify-center" style={{ background: 'rgba(93,217,208,0.10)' }}>
              <span className="material-symbols-outlined" style={{ color: '#5DD9D0', fontSize: '15px' }}>storefront</span>
            </div>
            <span className="text-[11px] font-bold uppercase tracking-[0.14em]" style={{ color: '#5DD9D0' }}>For Addas</span>
          </div>

          <div className="flex flex-col lg:flex-row-reverse gap-16 lg:gap-24 lg:items-start">
            <div className="lg:w-[380px] flex-shrink-0">
              <h2
                className="font-display font-black tracking-[-0.04em] leading-[0.9] mb-5 text-white"
                style={{ fontSize: 'clamp(38px, 6vw, 60px)' }}
              >
                Your space.<br />Every night.<br />Fully booked.
              </h2>
              <p className="text-base leading-relaxed mb-8" style={{ color: '#9896B0' }}>
                An Adda is any space — a café backroom, rooftop, studio, or gallery. List it on WIMC and let creators come to you with real bookings.
              </p>
              <Link
                href="/signin?next=/adda/onboard"
                className="inline-flex items-center gap-2 px-6 py-3 rounded-full text-sm font-semibold transition-opacity hover:opacity-90"
                style={{ background: '#5DD9D0', color: '#080809' }}
              >
                List your Adda
                <span className="material-symbols-outlined" style={{ fontSize: '16px' }}>arrow_forward</span>
              </Link>
            </div>

            <div className="grid sm:grid-cols-3 gap-4 flex-1">
              {ADDA_FEATURES.map((f) => (
                <div key={f.icon} className="rounded-2xl p-6" style={{ background: '#0F0F14', border: '1px solid rgba(255,255,255,0.06)' }}>
                  <div className="w-10 h-10 rounded-xl mb-5 flex items-center justify-center" style={{ background: 'rgba(93,217,208,0.08)' }}>
                    <span className="material-symbols-outlined" style={{ color: '#5DD9D0', fontSize: '18px' }}>{f.icon}</span>
                  </div>
                  <h4 className="font-semibold text-[15px] text-white mb-2">{f.title}</h4>
                  <p className="text-[13px] leading-relaxed" style={{ color: '#5C5A72' }}>{f.desc}</p>
                </div>
              ))}
            </div>
          </div>
        </div>
      </section>

      {/* ════════════════════════════════════════════════════════════
          BOTTOM CTA
      ════════════════════════════════════════════════════════════ */}
      <section
        className="relative z-10 overflow-hidden px-6 py-24 md:px-14 lg:px-24 text-center"
        style={{ background: '#0A0A0D' }}
      >
        <div
          className="absolute inset-0 pointer-events-none"
          style={{ background: 'radial-gradient(ellipse 80% 60% at 50% 100%, rgba(232,112,90,0.08) 0%, transparent 70%)' }}
        />
        <div className="relative max-w-2xl mx-auto">
          <h2
            className="font-display font-black tracking-[-0.05em] leading-[0.88] mb-5 text-white"
            style={{ fontSize: 'clamp(40px, 8vw, 76px)' }}
          >
            Your city<br />is waiting.
          </h2>
          <p className="text-base md:text-lg mb-10 leading-relaxed" style={{ color: '#9896B0' }}>
            Join the movement of creators and venues building a new kind of offline culture across India&apos;s cities.
          </p>
          <div className="flex flex-col sm:flex-row items-center justify-center gap-3">
            <Link
              href="/signin?next=/onboarding/screen-1"
              className="w-full sm:w-auto px-7 py-3.5 rounded-full text-sm font-semibold transition-opacity hover:opacity-90"
              style={{ background: '#E8705A', color: 'white' }}
            >
              Join as a Creator
            </Link>
            <Link
              href="/signin?next=/adda/onboard"
              className="w-full sm:w-auto px-7 py-3.5 rounded-full text-sm font-semibold transition-all hover:bg-white/5"
              style={{ border: '1px solid rgba(255,255,255,0.10)', color: '#F0EFF8' }}
            >
              List your Venue
            </Link>
          </div>
        </div>
      </section>

      {/* ════════════════════════════════════════════════════════════
          FOOTER
      ════════════════════════════════════════════════════════════ */}
      <footer
        className="relative z-10 px-6 py-10 md:px-14 lg:px-24"
        style={{ borderTop: '1px solid rgba(255,255,255,0.05)' }}
      >
        <div className="max-w-7xl mx-auto flex flex-col sm:flex-row items-start sm:items-center justify-between gap-6">
          <div>
            <WimcLogo color="white" size="xs" />
            <p className="text-[11px] mt-2 font-medium tracking-widest uppercase" style={{ color: '#3C3A52' }}>
              wheninmycity.com
            </p>
          </div>
          <div className="flex flex-wrap items-center gap-x-6 gap-y-2 text-[12px]" style={{ color: '#3C3A52' }}>
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
