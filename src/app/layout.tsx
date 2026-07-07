import type { Metadata } from 'next'
import {
  Inter, Plus_Jakarta_Sans, Dancing_Script, Playfair_Display,
  Space_Grotesk, Archivo_Black, Outfit, DM_Sans, JetBrains_Mono,
  Abril_Fatface, Barlow_Condensed,
} from 'next/font/google'
import './globals.css'
import '../../styles/venue-tokens.css'

// ── Profile theme fonts ──────────────────────────────────────────────────────
const inter = Inter({ subsets: ['latin'], variable: '--font-inter' })
const jakarta = Plus_Jakarta_Sans({
  subsets: ['latin'], weight: ['400', '500', '600', '700', '800'],
  variable: '--font-jakarta',
})
const dancing = Dancing_Script({ subsets: ['latin'], weight: ['600'], variable: '--font-dancing' })
const playfair = Playfair_Display({
  subsets: ['latin'], weight: ['400', '500', '600', '700', '800'],
  variable: '--font-playfair',
})
const spaceGrotesk = Space_Grotesk({
  subsets: ['latin'], weight: ['400', '500', '600', '700'],
  variable: '--font-space-grotesk',
})
const archivoBlack = Archivo_Black({ subsets: ['latin'], weight: '400', variable: '--font-archivo-black' })

// ── Dashboard design system fonts ────────────────────────────────────────────
// Outfit replaces Syne as display font — clean geometric sans that renders
// crisply at heavy weights without horizontal stretch.
const outfit = Outfit({
  subsets: ['latin'], weight: ['400', '500', '600', '700', '800', '900'],
  variable: '--font-syne',   // keep var name; all components reference this
})
const dmSans = DM_Sans({
  subsets: ['latin'], weight: ['300', '400', '500', '600'],
  variable: '--font-dm-sans',
})
const jetbrainsMono = JetBrains_Mono({
  subsets: ['latin'], weight: ['400', '500'],
  variable: '--font-jetbrains-mono',
})
const abrilFatface = Abril_Fatface({
  subsets: ['latin'], weight: '400',
  variable: '--font-abril',
})
const barlowCondensed = Barlow_Condensed({
  subsets: ['latin'], weight: ['400', '600', '700', '800', '900'],
  variable: '--font-barlow',
})

export const metadata: Metadata = {
  title: 'When In My City',
  description: 'Creator-led offline experiences for Tier-2 India',
}

export default function RootLayout({ children }: { children: React.ReactNode }) {
  const fontVars = [
    inter.variable, jakarta.variable, dancing.variable,
    playfair.variable, spaceGrotesk.variable, archivoBlack.variable,
    outfit.variable, dmSans.variable, jetbrainsMono.variable,
    abrilFatface.variable, barlowCondensed.variable,
  ].join(' ')

  return (
    <html lang="en" className={`dark ${fontVars}`}>
      <head>
        {/* Material Symbols icon font */}
        <link
          rel="stylesheet"
          href="https://fonts.googleapis.com/css2?family=Material+Symbols+Outlined:opsz,wght,FILL,GRAD@20..48,100..700,0..1,-50..200"
        />
      </head>
      <body className="bg-background text-on-background font-body antialiased">
        {children}
      </body>
    </html>
  )
}
