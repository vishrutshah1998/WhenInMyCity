import type { Metadata } from 'next'
import Link from 'next/link'
import { TERMS_EFFECTIVE_DATE } from './constants'

export const metadata: Metadata = {
  title: 'Terms of Use | When In My City',
}

const prose: React.CSSProperties = {
  fontSize:   14,
  lineHeight: 1.75,
  color:      '#1A1A2E',
  margin:     '0 0 16px',
}

const h2: React.CSSProperties = {
  fontSize:      17,
  fontWeight:    700,
  color:         '#0D0D1A',
  margin:        '36px 0 10px',
  paddingBottom: 8,
  borderBottom:  '1px solid #E0DFF4',
}

export default function TermsPage() {
  return (
    <div style={{
      maxWidth:   740,
      margin:     '0 auto',
      padding:    '48px 24px 80px',
      background: '#FAFAF9',
      color:      '#1A1A2E',
      fontFamily: 'system-ui, -apple-system, sans-serif',
    }}>

      {/* Header */}
      <div style={{ marginBottom: 32 }}>
        <Link href="/" style={{ fontSize: 12, color: '#9B8FFF', textDecoration: 'none' }}>
          ← When In My City
        </Link>
        <h1 style={{ fontSize: 28, fontWeight: 800, margin: '16px 0 6px', color: '#0D0D1A' }}>
          Terms of Use
        </h1>
        <p style={{ fontSize: 13, color: '#666', margin: 0 }}>
          Operator: <strong>City Collective LLP</strong> ·
          Effective: {TERMS_EFFECTIVE_DATE} ·
          Governing law: Republic of India
        </p>
      </div>

      <h2 style={h2}>1. Acceptance</h2>
      <p style={prose}>
        By accessing or using When In My City ("WIMC", "the Platform"), you agree to these Terms of
        Use. If you do not agree, do not use the Platform. These Terms constitute a legally binding
        agreement between you and <strong>City Collective LLP</strong> ("we", "our", "Company"),
        registered in India.
      </p>

      <h2 style={h2}>2. Eligibility</h2>
      <ul style={{ ...prose, paddingLeft: 20 }}>
        <li>You must be at least 18 years of age to create an account and purchase tickets.</li>
        <li>You must be located in India or be an Indian resident to use the Platform.</li>
        <li>By registering, you confirm that the information you provide is accurate and complete.</li>
      </ul>

      <h2 style={h2}>3. Platform Description</h2>
      <p style={prose}>
        WIMC is a discovery and ticketing platform for creator-led offline experiences. Creators
        (musicians, comedians, artists, and others) publish events; attendees ("Explorers") browse
        events and purchase tickets. We also provide utility features — including a City Guide with
        civic information and transit discovery — for Explorers in participating cities.
      </p>
      <p style={prose}>
        The Platform includes a <strong>City (Government Edition)</strong> configuration for
        Ahmedabad–Gandhinagar developed in partnership with local government bodies. This configuration
        displays civic information and transit options sourced from public datasets. WIMC is not
        affiliated with or an agent of any government body, and does not dispatch or relay emergency
        services.
      </p>

      <h2 style={h2}>4. Accounts</h2>
      <ul style={{ ...prose, paddingLeft: 20 }}>
        <li>You may sign in via phone OTP or Google OAuth. Keep your credentials secure.</li>
        <li>You are responsible for all activity that occurs under your account.</li>
        <li>We reserve the right to suspend or terminate accounts that violate these Terms.</li>
      </ul>

      <h2 style={h2}>5. Ticket Purchases</h2>
      <ul style={{ ...prose, paddingLeft: 20 }}>
        <li>All payments are processed by <strong>Razorpay</strong>. By completing a purchase you also agree to Razorpay's terms of service.</li>
        <li>Ticket prices are displayed inclusive of applicable GST. Events priced at ₹500 or above attract GST at 18% (SAC 998596).</li>
        <li>Tickets are generally <strong>non-refundable</strong> once purchased, unless the event is cancelled by the organiser. In the event of cancellation, refunds will be issued to the original payment method within 7–10 business days.</li>
        <li>WIMC does not guarantee that a Creator will deliver the event as described. Disputes with Creators should be raised via our support team.</li>
        <li>Ticket transfer or resale is not permitted without our prior written consent.</li>
      </ul>

      <h2 style={h2}>6. Creator Obligations</h2>
      <p style={prose}>
        Creators who host events on the Platform agree to:
      </p>
      <ul style={{ ...prose, paddingLeft: 20 }}>
        <li>Provide accurate event details (venue, date, time, ticket price).</li>
        <li>Obtain all necessary permits and licences for the event.</li>
        <li>Issue refunds promptly in the event of cancellation.</li>
        <li>Not promote illegal, harmful, or misleading content.</li>
      </ul>

      <h2 style={h2}>7. City Guide and Transit Features</h2>
      <ul style={{ ...prose, paddingLeft: 20 }}>
        <li>Civic and transit information in the City Guide is sourced from public datasets (OpenStreetMap, government open data) and is provided for informational purposes only.</li>
        <li>Static transit data (routes, fares) may be outdated. Always verify schedules and fares directly with the transport operator before travel.</li>
        <li>Transit "handoff" links that open third-party apps (Uber, Ola, Rapido, etc.) transfer you to those apps, which have their own terms and pricing. WIMC does not process or guarantee any booking or ride made through those apps.</li>
        <li>Emergency helpline numbers listed in the Emergency tab are sourced from official ERSS documentation. WIMC does not dispatch emergency services and is not affiliated with ERSS.</li>
        <li>Location access is optional and governed by our <Link href="/legal/privacy" style={{ color: '#9B8FFF' }}>Privacy Notice</Link>. We never store your GPS coordinates.</li>
      </ul>

      <h2 style={h2}>8. Prohibited Conduct</h2>
      <p style={prose}>You agree not to:</p>
      <ul style={{ ...prose, paddingLeft: 20 }}>
        <li>Use the Platform for any unlawful purpose.</li>
        <li>Impersonate another person or entity.</li>
        <li>Attempt to reverse engineer, scrape, or exploit the Platform's APIs.</li>
        <li>Upload or transmit malicious code.</li>
        <li>Circumvent or interfere with security features.</li>
      </ul>

      <h2 style={h2}>9. Intellectual Property</h2>
      <p style={prose}>
        All content, branding, and software on the Platform are owned by City Collective LLP or its
        licensors. Civic map data is sourced from OpenStreetMap contributors under the Open Database
        Licence (ODbL) — attribution: © OpenStreetMap contributors. Nothing in these Terms transfers
        any intellectual property rights to you.
      </p>

      <h2 style={h2}>10. Limitation of Liability</h2>
      <p style={prose}>
        To the maximum extent permitted by Indian law, City Collective LLP's aggregate liability
        for any claim arising from your use of the Platform shall not exceed the amount you paid
        for the event or service that gave rise to the claim. We are not liable for any indirect,
        incidental, or consequential damages.
      </p>

      <h2 style={h2}>11. Governing Law and Disputes</h2>
      <p style={prose}>
        These Terms are governed by the laws of the Republic of India. Any dispute shall be subject
        to the exclusive jurisdiction of the courts of Ahmedabad, Gujarat. We encourage you to
        first contact us at <a href="mailto:support@wheninmycity.com" style={{ color: '#9B8FFF' }}>support@wheninmycity.com</a> to
        resolve disputes informally before initiating legal proceedings.
      </p>

      <h2 style={h2}>12. Changes to These Terms</h2>
      <p style={prose}>
        We may update these Terms from time to time. Material changes will be communicated via
        email or an in-app notice at least 7 days before they take effect. Continued use of the
        Platform after that date constitutes acceptance of the revised Terms.
      </p>

      {/* Footer */}
      <div style={{
        marginTop:   40,
        paddingTop:  24,
        borderTop:   '1px solid #E0DFF4',
        fontSize:    12,
        color:       '#888',
        lineHeight:  1.7,
      }}>
        <p>City Collective LLP · <a href="https://wheninmycity.com" style={{ color: '#9B8FFF' }}>wheninmycity.com</a></p>
        <p>
          <Link href="/legal/privacy" style={{ color: '#9B8FFF', marginRight: 16 }}>Privacy Notice</Link>
          <a href="mailto:support@wheninmycity.com" style={{ color: '#9B8FFF' }}>Contact Support</a>
        </p>
      </div>

    </div>
  )
}
