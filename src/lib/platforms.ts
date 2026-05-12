export interface PlatformEntry {
  id: string
  label: string
  emoji: string
  placeholder: string
  color: string
}

export const PLATFORM_REGISTRY: PlatformEntry[] = [
  { id: 'instagram', label: 'Instagram',   emoji: '📸', placeholder: 'instagram.com/yourname', color: '#E1306C' },
  { id: 'youtube',   label: 'YouTube',     emoji: '▶️',  placeholder: 'youtube.com/@yourname',  color: '#FF0000' },
  { id: 'whatsapp',  label: 'WhatsApp',    emoji: '💬', placeholder: 'Phone or link',           color: '#25D366' },
  { id: 'spotify',   label: 'Spotify',     emoji: '🎵', placeholder: 'open.spotify.com/artist/…', color: '#1DB954' },
  { id: 'soundcloud',label: 'SoundCloud',  emoji: '☁️', placeholder: 'soundcloud.com/yourname', color: '#FF3300' },
  { id: 'twitter',   label: 'X / Twitter', emoji: '𝕏',  placeholder: 'x.com/yourname',          color: '#E7E9EA' },
  { id: 'linkedin',  label: 'LinkedIn',    emoji: '💼', placeholder: 'linkedin.com/in/yourname', color: '#0A66C2' },
  { id: 'website',   label: 'Website',     emoji: '🌐', placeholder: 'yoursite.com',            color: '#6B7280' },
  { id: 'telegram',  label: 'Telegram',    emoji: '✈️', placeholder: 't.me/yourname',           color: '#0088CC' },
  { id: 'substack',  label: 'Substack',    emoji: '📧', placeholder: 'yourname.substack.com',   color: '#FF6719' },
  { id: 'behance',   label: 'Behance',     emoji: '🎨', placeholder: 'behance.net/yourname',    color: '#1769FF' },
  { id: 'github',    label: 'GitHub',      emoji: '💻', placeholder: 'github.com/yourname',     color: '#C9D1D9' },
]
