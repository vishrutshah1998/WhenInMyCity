import { getWhatsAppSendFailures } from '@/app/actions/admin'

export default async function AdminWhatsAppFailuresPage() {
  const { data: failures, error } = await getWhatsAppSendFailures()

  if (error) {
    return (
      <div style={{ color: 'var(--wimc-text-secondary)', fontSize: 14, padding: '40px 0' }}>
        {error}
      </div>
    )
  }

  return (
    <div>
      <div style={{ marginBottom: 24 }}>
        <h1 style={{ fontFamily: 'var(--font-syne)', fontWeight: 800, fontSize: 22, marginBottom: 4 }}>
          WhatsApp Send Failures
        </h1>
        <p style={{ fontSize: 13, color: 'var(--wimc-text-secondary)' }}>
          Most recent 200 failed sends for the critical templates (application decisions, payout
          notices) that get logged here — not every WhatsApp template in the codebase. No retry;
          this is a visibility list only.
        </p>
      </div>

      {!failures?.length ? (
        <div style={{ textAlign: 'center', padding: '60px 24px', color: 'var(--wimc-text-secondary)' }}>
          <div style={{ fontSize: 36, marginBottom: 12 }}>✓</div>
          <div style={{ fontSize: 15, fontWeight: 600 }}>No failed sends</div>
        </div>
      ) : (
        <div style={{
          border: '1px solid var(--wimc-border-subtle)',
          borderRadius: 10,
          overflow: 'hidden',
        }}>
          <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 13 }}>
            <thead>
              <tr style={{ background: 'var(--wimc-bg-raised)', textAlign: 'left' }}>
                <th style={thStyle}>When</th>
                <th style={thStyle}>Template</th>
                <th style={thStyle}>Recipient</th>
                <th style={thStyle}>Error</th>
                <th style={thStyle}>Event</th>
                <th style={thStyle}>Context</th>
              </tr>
            </thead>
            <tbody>
              {failures.map((f) => (
                <tr key={f.id} style={{ borderTop: '1px solid var(--wimc-border-subtle)' }}>
                  <td style={tdStyle}>
                    {new Date(f.created_at).toLocaleString('en-IN', {
                      day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit',
                    })}
                  </td>
                  <td style={{ ...tdStyle, fontFamily: 'var(--font-jetbrains-mono)', fontWeight: 600 }}>
                    {f.template_name}
                  </td>
                  <td style={{ ...tdStyle, fontFamily: 'var(--font-jetbrains-mono)' }}>
                    {f.recipient_phone}
                  </td>
                  <td style={{ ...tdStyle, color: 'var(--wimc-coral)', maxWidth: 320 }}>
                    {f.error_detail}
                  </td>
                  <td style={{ ...tdStyle, fontFamily: 'var(--font-jetbrains-mono)', fontSize: 11, color: 'var(--wimc-text-muted)' }}>
                    {f.event_id ? f.event_id.slice(0, 8) : '—'}
                  </td>
                  <td style={{ ...tdStyle, fontFamily: 'var(--font-jetbrains-mono)', fontSize: 11, color: 'var(--wimc-text-muted)' }}>
                    {f.context_id ? f.context_id.slice(0, 8) : '—'}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  )
}

const thStyle: React.CSSProperties = {
  padding: '10px 14px', fontSize: 11, fontWeight: 700,
  textTransform: 'uppercase', letterSpacing: '0.05em',
  color: 'var(--wimc-text-secondary)',
}

const tdStyle: React.CSSProperties = {
  padding: '10px 14px', verticalAlign: 'top',
  color: 'var(--wimc-text-primary)',
}
