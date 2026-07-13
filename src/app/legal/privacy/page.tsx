import type { Metadata } from 'next'
import Link from 'next/link'
import { PRIVACY_EFFECTIVE_DATE } from './constants'

export const metadata: Metadata = {
  title: 'Privacy Notice | When In My City',
}

// ── Layout constants ──────────────────────────────────────────────────────────

const prose: React.CSSProperties = {
  fontSize:    14,
  lineHeight:  1.75,
  color:       '#1A1A2E',
  margin:      '0 0 16px',
}

const h2: React.CSSProperties = {
  fontSize:      17,
  fontWeight:    700,
  color:         '#0D0D1A',
  margin:        '36px 0 10px',
  paddingBottom: 8,
  borderBottom:  '1px solid #E0DFF4',
}

const tableRow: React.CSSProperties = {
  borderBottom: '1px solid #EEEDF8',
}
const tdL: React.CSSProperties = {
  padding:    '10px 14px 10px 0',
  fontWeight: 600,
  verticalAlign: 'top',
  minWidth:   140,
  fontSize:   13,
  color:      '#333',
}
const tdR: React.CSSProperties = {
  padding:    '10px 0',
  fontSize:   13,
  color:      '#555',
  lineHeight: 1.6,
}

// ── Page ─────────────────────────────────────────────────────────────────────

export default function PrivacyPage() {
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
          Privacy Notice
        </h1>
        <p style={{ fontSize: 13, color: '#666', margin: 0 }}>
          Data Fiduciary: <strong>City Collective LLP</strong> ·
          Effective: {PRIVACY_EFFECTIVE_DATE} ·
          Governed by the Digital Personal Data Protection Act, 2023 (India)
        </p>
      </div>

      {/* 1. Who we are */}
      <h2 style={h2}>1. Who We Are</h2>
      <p style={prose}>
        When In My City (WIMC) is operated by <strong>City Collective LLP</strong>, registered in India
        ("we", "our", "WIMC"). We build technology that connects creators and venues with audiences
        in India's Tier-2 cities. This notice describes how we collect, use, and protect your
        personal data, and the rights you have under the Digital Personal Data Protection Act, 2023
        ("DPDP Act").
      </p>

      {/* 2. Data we collect */}
      <h2 style={h2}>2. Personal Data We Process</h2>
      <table style={{ width: '100%', borderCollapse: 'collapse', marginBottom: 16 }}>
        <thead>
          <tr>
            <th style={{ ...tdL, fontSize: 11, letterSpacing: '0.08em', textTransform: 'uppercase', color: '#888', fontWeight: 700, paddingBottom: 6 }}>Data</th>
            <th style={{ ...tdR, fontSize: 11, letterSpacing: '0.08em', textTransform: 'uppercase', color: '#888', fontWeight: 700, paddingBottom: 6 }}>Purpose</th>
          </tr>
        </thead>
        <tbody>
          {[
            ['Phone number / email address', 'Account authentication via OTP or Google OAuth. Booking confirmation messages sent via WhatsApp if you opt in.'],
            ['Display name', 'Shown on your public Explorer profile and on event booking records.'],
            ['City and neighbourhood', 'Used to personalise event recommendations for your location.'],
            ['Interest tags and budget preference', 'Powers ranked event discovery. Stored on your profile.'],
            ['Approximate GPS location — City Guide (optional)', 'Requested in-browser when you tap "Use my location" in the City Guide. Sent to our server only to proxy a map query (OpenStreetMap Overpass API) and is not stored on our servers. You can decline or revoke this at any time in Settings → Privacy.'],
            ['Location coordinates — civic reports (optional)', 'If you choose to attach your location to a civic report, the coordinates are stored on our servers solely to identify the site of the issue and forward the report to the relevant government channel. Stored until the report is forwarded and confirmed, or until you request account deletion. You are asked for separate consent at the time of each report submission.'],
            ['Event booking records (RSVP, amount paid, check-in status)', 'Required to issue and verify your event tickets. Retained for the lifetime of your account.'],
            ['Event attendance history and ratings', 'Used to personalise your feed and to help creators improve their events. Stored on your profile.'],
            ['Payment transaction records (ticket purchases)', 'We store the Razorpay order ID and capture status for your ticket purchases. Card numbers, UPI handles, and net-banking details used to pay for tickets are processed exclusively by Razorpay and are never accessible to WIMC.'],
            ['Payout bank/UPI details (creators & venue partners only)', 'If you request a payout as a creator or venue (Venue) partner, we collect and store your bank account number, IFSC code, and/or UPI ID in our own systems in order to process that payout. Access is restricted to the account owner and authorised WIMC admins.'],
          ].map(([data, purpose], i, arr) => (
            <tr key={data} style={i < arr.length - 1 ? tableRow : {}}>
              <td style={tdL}>{data}</td>
              <td style={tdR}>{purpose}</td>
            </tr>
          ))}
        </tbody>
      </table>

      {/* 3. What we do NOT collect */}
      <h2 style={h2}>3. What We Do Not Collect</h2>
      <ul style={{ ...prose, paddingLeft: 20 }}>
        <li>We do not store the GPS coordinates used for City Guide map queries — these are processed transiently and never written to our database. Location coordinates you explicitly attach to a civic report are an exception: those are stored to fulfil the capture-and-forward purpose and are retained until the report is forwarded or you delete your account.</li>
        <li>We do not sell or share your personal data with advertisers.</li>
        <li>We do not track your activity across other websites.</li>
        <li>When you open a third-party app (Uber, Ola, Rapido, IRCTC) from the Transit tab, that handoff is governed by the respective app's own privacy policy. WIMC only logs that a handoff occurred (app name, destination, attribution reference) — no personal data from those sessions is received by WIMC.</li>
      </ul>

      {/* 4. Legal basis */}
      <h2 style={h2}>4. Legal Basis for Processing</h2>
      <p style={prose}>
        We rely on the following grounds under the DPDP Act, 2023:
      </p>
      <ul style={{ ...prose, paddingLeft: 20 }}>
        <li><strong>Consent</strong> — for optional features such as City Guide location access, civic report location attachment, and WhatsApp notifications. Each purpose has its own consent request; withdrawing one does not withdraw the others. You can withdraw any consent at any time in Settings → Privacy &amp; Data.</li>
        <li><strong>Contract performance</strong> — for processing bookings, issuing tickets, and processing payments through Razorpay.</li>
        <li><strong>Legitimate interest</strong> — for account security, fraud prevention, and personalised event recommendations using data you have provided.</li>
      </ul>

      {/* 5. Third-party processors */}
      <h2 style={h2}>5. Third-Party Data Processors</h2>
      <table style={{ width: '100%', borderCollapse: 'collapse', marginBottom: 16 }}>
        <tbody>
          {[
            ['Supabase', 'Database and authentication infrastructure. Data stored in AWS Mumbai (ap-south-1) region.'],
            ['Razorpay', 'Payment gateway. Processes all UPI, card, and net banking transactions. PCI-DSS compliant.'],
            ['OpenStreetMap / Overpass API', 'Public civic map data queried on your behalf for the City Guide utility layers. Data is open-licensed (ODbL); no personal data is sent to or received from OSM.'],
            ['Vercel', 'Application hosting and edge delivery. Request logs (IP address, URL) retained for 30 days.'],
          ].map(([name, desc], i, arr) => (
            <tr key={name} style={i < arr.length - 1 ? tableRow : {}}>
              <td style={tdL}>{name}</td>
              <td style={tdR}>{desc}</td>
            </tr>
          ))}
        </tbody>
      </table>

      {/* 6. Your rights */}
      <h2 style={h2}>6. Your Rights Under the DPDP Act, 2023</h2>
      <p style={prose}>
        As a Data Principal, you have the following rights. To exercise any of them, email our
        Grievance Officer (details in §7 below).
      </p>
      <ul style={{ ...prose, paddingLeft: 20 }}>
        <li><strong>Right to access</strong> — request a summary of personal data we hold about you.</li>
        <li><strong>Right to correction and erasure</strong> — request corrections to inaccurate data, or deletion of your account and associated personal data.</li>
        <li><strong>Right to withdraw consent</strong> — revoke consent for City Guide location access, civic report location attachment, or WhatsApp notifications at any time in Settings → Privacy &amp; Data. Withdrawal does not affect bookings already made or reports already forwarded.</li>
        <li><strong>Right to grievance redressal</strong> — raise a complaint with our Grievance Officer. We will respond within <strong>30 days</strong>.</li>
        <li><strong>Right to nominate a representative</strong> — you may nominate another individual to exercise your rights on your behalf in the event of incapacity.</li>
      </ul>

      {/* 7. Grievance Officer */}
      <h2 style={h2}>7. Grievance Officer</h2>
      <p style={prose}>
        In accordance with the Information Technology Act, 2000 and the Digital Personal Data
        Protection Act, 2023, we have designated a Grievance Officer. All data-related complaints
        and requests must be directed to:
      </p>
      <div style={{
        background:   '#F0EFF8',
        border:       '1px solid #D4D0F4',
        borderRadius: 10,
        padding:      '18px 20px',
        marginBottom: 24,
      }}>
        <div style={{ fontWeight: 700, fontSize: 15, color: '#0D0D1A', marginBottom: 4 }}>
          Grievance Officer — City Collective LLP
        </div>
        <div style={{ fontSize: 13, color: '#444', lineHeight: 1.7 }}>
          <div>Name: <strong>Vishrut Shah</strong> (Founder, City Collective LLP)</div>
          <div>Email: <a href="mailto:wheninmycity@gmail.com?subject=DPDP%20Grievance" style={{ color: '#9B8FFF' }}>wheninmycity@gmail.com</a></div>
          <div>Subject line: <em>DPDP Grievance — [your account email/phone]</em></div>
          <div>Response SLA: Within <strong>30 days</strong> of receiving a complete request</div>
          <div>Address: City Collective LLP, India <span style={{ color: '#888' }}>(registered office)</span></div>
        </div>
      </div>
      <p style={prose}>
        If you are not satisfied with our response, you may escalate your complaint to the Data
        Protection Board of India once it is constituted under the DPDP Act, 2023.
      </p>

      {/* 8. Retention */}
      <h2 style={h2}>8. Data Retention</h2>
      <ul style={{ ...prose, paddingLeft: 20 }}>
        <li>Account and profile data: retained until you request deletion.</li>
        <li>Booking records: retained for 7 years to comply with Indian GST and accounting laws.</li>
        <li>City Guide GPS coordinates: not stored (processed transiently for map queries only; never written to our database).</li>
        <li>Civic report coordinates: retained until the report is forwarded to the government channel and confirmed, or until you request account deletion, whichever is sooner.</li>
        <li>Server request logs: retained for 30 days, then automatically deleted.</li>
      </ul>

      {/* 9. Changes */}
      <h2 style={h2}>9. Changes to This Notice</h2>
      <p style={prose}>
        We may update this Privacy Notice from time to time. Material changes will be communicated
        via email or an in-app notice at least 7 days before they take effect. The effective date
        at the top of this page reflects the most recent revision.
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
          <Link href="/legal/terms" style={{ color: '#9B8FFF', marginRight: 16 }}>Terms of Use</Link>
          <a href="mailto:support@wheninmycity.com" style={{ color: '#9B8FFF' }}>Contact Support</a>
        </p>
      </div>

    </div>
  )
}
