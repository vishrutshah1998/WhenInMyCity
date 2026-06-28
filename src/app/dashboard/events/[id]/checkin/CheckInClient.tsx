'use client'

import { useState, useEffect, useRef, useTransition } from 'react'
import { useRouter } from 'next/navigation'
import type { AttendeeRow } from '@/app/actions/rsvp'
import { checkInAttendee, checkInAttendeeById } from '@/app/actions/rsvp'

// jsQR is loaded dynamically — only in the browser, only when scanner is opened
type JsQR = (data: Uint8ClampedArray, width: number, height: number) => { data: string } | null

interface Props {
  eventId:    string
  eventTitle: string
  attendees:  AttendeeRow[]
}

type ScanResult =
  | { status: 'success'; name: string }
  | { status: 'duplicate'; name: string }
  | { status: 'error'; message: string }

export default function CheckInClient({ eventId, eventTitle, attendees: initial }: Props) {
  const router = useRouter()
  const [, startTransition] = useTransition()

  const [attendees, setAttendees] = useState(initial)
  const [tab, setTab] = useState<'scanner' | 'list'>('scanner')
  const [search, setSearch] = useState('')

  // Scanner state
  const videoRef    = useRef<HTMLVideoElement>(null)
  const canvasRef   = useRef<HTMLCanvasElement>(null)
  const streamRef   = useRef<MediaStream | null>(null)
  const rafRef      = useRef<number>(0)
  const jsqrRef     = useRef<JsQR | null>(null)

  const [cameraActive,  setCameraActive]  = useState(false)
  const [cameraError,   setCameraError]   = useState<string | null>(null)
  const [scanning,      setScanning]      = useState(false)
  const [lastResult,    setLastResult]    = useState<ScanResult | null>(null)
  const [processingToken, setProcessingToken] = useState<string | null>(null)

  // Manual check-in state
  const [manualPending, setManualPending] = useState<string | null>(null)

  const checkedInCount = attendees.filter((a) => a.checked_in).length

  // ── Camera ────────────────────────────────────────────────────────────────

  async function startCamera() {
    setCameraError(null)
    setLastResult(null)

    // Load jsQR lazily
    if (!jsqrRef.current) {
      try {
        const mod = await import('jsqr')
        jsqrRef.current = mod.default as JsQR
      } catch {
        setCameraError('Could not load QR scanner library.')
        return
      }
    }

    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        video: { facingMode: 'environment', width: { ideal: 1280 }, height: { ideal: 720 } },
      })
      streamRef.current = stream
      if (videoRef.current) {
        videoRef.current.srcObject = stream
        await videoRef.current.play()
      }
      setCameraActive(true)
      scanLoop()
    } catch {
      setCameraError('Camera permission denied. Allow camera access and try again.')
    }
  }

  function stopCamera() {
    cancelAnimationFrame(rafRef.current)
    streamRef.current?.getTracks().forEach((t) => t.stop())
    streamRef.current = null
    if (videoRef.current) videoRef.current.srcObject = null
    setCameraActive(false)
    setScanning(false)
  }

  function scanLoop() {
    rafRef.current = requestAnimationFrame(async () => {
      const video  = videoRef.current
      const canvas = canvasRef.current
      const jsqr   = jsqrRef.current
      if (!video || !canvas || !jsqr || video.readyState < 2) {
        scanLoop()
        return
      }

      canvas.width  = video.videoWidth
      canvas.height = video.videoHeight
      const ctx = canvas.getContext('2d')!
      ctx.drawImage(video, 0, 0)
      const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height)
      const code = jsqr(imageData.data, imageData.width, imageData.height)

      if (code?.data && !scanning) {
        await handleScan(code.data)
      } else {
        scanLoop()
      }
    })
  }

  async function handleScan(token: string) {
    if (processingToken === token) return  // debounce same token
    setScanning(true)
    setProcessingToken(token)
    setLastResult(null)

    const result = await checkInAttendee(eventId, token)

    if (result.success && !result.alreadyCheckedIn) {
      setLastResult({ status: 'success', name: result.attendeeName ?? 'Attendee' })
      setAttendees((prev) =>
        prev.map((a) =>
          // Update optimistically by name match (token not stored client-side)
          !a.checked_in && a.attendee_name === result.attendeeName
            ? { ...a, checked_in: true, checked_in_at: new Date().toISOString() }
            : a,
        ),
      )
      startTransition(() => router.refresh())
    } else if (result.alreadyCheckedIn) {
      setLastResult({ status: 'duplicate', name: result.attendeeName ?? 'Attendee' })
    } else {
      setLastResult({ status: 'error', message: result.error ?? 'Unknown error' })
    }

    // Resume scanning after 2.5s
    setTimeout(() => {
      setScanning(false)
      setProcessingToken(null)
      setLastResult(null)
      scanLoop()
    }, 2500)
  }

  async function handleManualCheckIn(attendeeId: string) {
    setManualPending(attendeeId)
    const result = await checkInAttendeeById(eventId, attendeeId)
    if (result.success) {
      setAttendees((prev) =>
        prev.map((a) =>
          a.id === attendeeId
            ? { ...a, checked_in: true, checked_in_at: new Date().toISOString() }
            : a,
        ),
      )
      startTransition(() => router.refresh())
    }
    setManualPending(null)
  }

  useEffect(() => {
    return () => {
      cancelAnimationFrame(rafRef.current)
      streamRef.current?.getTracks().forEach((t) => t.stop())
    }
  }, [])

  // ── Filter ────────────────────────────────────────────────────────────────

  const filtered = attendees.filter(
    (a) =>
      a.attendee_name.toLowerCase().includes(search.toLowerCase()) ||
      a.attendee_phone.includes(search),
  )

  // ── Render ────────────────────────────────────────────────────────────────

  return (
    <div style={{ minHeight: '100vh', background: 'var(--wimc-bg-base)' }}>
      {/* Header */}
      <header style={{
        position: 'sticky', top: 0, zIndex: 40,
        height: 56, borderBottom: '1px solid var(--wimc-border-subtle)',
        background: 'rgba(242,237,227,0.96)', backdropFilter: 'blur(12px)',
        display: 'flex', alignItems: 'center', justifyContent: 'space-between',
        padding: '0 20px',
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
          <button
            onClick={() => { stopCamera(); router.push(`/dashboard/events/${eventId}`) }}
            style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--wimc-text-secondary)', display: 'grid', placeItems: 'center' }}
          >
            <span className="material-symbols-outlined" style={{ fontSize: 20 }}>arrow_back</span>
          </button>
          <div>
            <div style={{ fontFamily: 'var(--font-syne)', fontWeight: 700, fontSize: 15, lineHeight: 1.2 }}>
              Check-in
            </div>
            <div style={{ fontSize: 11, color: 'var(--wimc-text-muted)', maxWidth: 220, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
              {eventTitle}
            </div>
          </div>
        </div>
        <div style={{
          fontSize: 13, fontWeight: 700,
          fontFamily: 'var(--font-jetbrains-mono)',
          color: checkedInCount > 0 ? '#22c55e' : 'var(--wimc-text-muted)',
        }}>
          {checkedInCount} / {attendees.length} in
        </div>
      </header>

      {/* Tab switcher */}
      <div style={{
        display: 'flex', borderBottom: '1px solid var(--wimc-border-subtle)',
        background: 'var(--wimc-bg-raised)',
      }}>
        {(['scanner', 'list'] as const).map((t) => (
          <button
            key={t}
            onClick={() => { if (t !== 'scanner') stopCamera(); setTab(t) }}
            style={{
              flex: 1, padding: '12px 0', border: 'none', background: 'none',
              cursor: 'pointer', fontSize: 13, fontWeight: 600,
              color: tab === t ? 'var(--wimc-coral)' : 'var(--wimc-text-secondary)',
              borderBottom: tab === t ? '2px solid var(--wimc-coral)' : '2px solid transparent',
              display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6,
            }}
          >
            <span className="material-symbols-outlined" style={{ fontSize: 16 }}>
              {t === 'scanner' ? 'qr_code_scanner' : 'list'}
            </span>
            {t === 'scanner' ? 'Scan QR' : `Attendee List (${attendees.length})`}
          </button>
        ))}
      </div>

      {/* Scanner tab */}
      {tab === 'scanner' && (
        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', padding: '32px 20px', gap: 20 }}>
          {!cameraActive ? (
            <div style={{ textAlign: 'center' }}>
              <div style={{
                width: 80, height: 80, borderRadius: 20, background: 'var(--wimc-bg-raised)',
                border: '1px solid var(--wimc-border-subtle)',
                display: 'grid', placeItems: 'center', margin: '0 auto 20px',
              }}>
                <span className="material-symbols-outlined" style={{ fontSize: 40, color: 'var(--wimc-coral)' }}>qr_code_scanner</span>
              </div>
              <p style={{ fontSize: 14, color: 'var(--wimc-text-secondary)', marginBottom: 20, maxWidth: 280 }}>
                Point your camera at an attendee's QR code ticket to check them in instantly.
              </p>
              {cameraError && (
                <div style={{
                  fontSize: 13, color: 'var(--wimc-coral)', background: 'rgba(232,87,42,0.08)',
                  border: '1px solid rgba(232,87,42,0.2)', borderRadius: 8,
                  padding: '10px 14px', marginBottom: 16, maxWidth: 320,
                }}>
                  {cameraError}
                </div>
              )}
              <button
                onClick={startCamera}
                style={{
                  background: 'var(--wimc-coral)', color: '#fff', border: 'none',
                  borderRadius: 10, padding: '12px 28px', fontSize: 14, fontWeight: 700,
                  cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 8,
                }}
              >
                <span className="material-symbols-outlined" style={{ fontSize: 18 }}>videocam</span>
                Start Camera
              </button>
            </div>
          ) : (
            <div style={{ width: '100%', maxWidth: 420, position: 'relative' }}>
              {/* Video feed */}
              <div style={{ position: 'relative', borderRadius: 16, overflow: 'hidden', background: '#000' }}>
                <video
                  ref={videoRef}
                  playsInline
                  muted
                  style={{ width: '100%', display: 'block', maxHeight: 340, objectFit: 'cover' }}
                />
                <canvas ref={canvasRef} style={{ display: 'none' }} />

                {/* Scan overlay corners */}
                <div style={{
                  position: 'absolute', inset: 0, display: 'grid', placeItems: 'center',
                  pointerEvents: 'none',
                }}>
                  <div style={{ width: 180, height: 180, position: 'relative' }}>
                    {['tl', 'tr', 'bl', 'br'].map((corner) => (
                      <div
                        key={corner}
                        style={{
                          position: 'absolute',
                          width: 28, height: 28,
                          borderColor: 'var(--wimc-coral)',
                          borderStyle: 'solid',
                          borderWidth: 0,
                          ...(corner === 'tl' && { top: 0, left: 0, borderTopWidth: 3, borderLeftWidth: 3, borderTopLeftRadius: 4 }),
                          ...(corner === 'tr' && { top: 0, right: 0, borderTopWidth: 3, borderRightWidth: 3, borderTopRightRadius: 4 }),
                          ...(corner === 'bl' && { bottom: 0, left: 0, borderBottomWidth: 3, borderLeftWidth: 3, borderBottomLeftRadius: 4 }),
                          ...(corner === 'br' && { bottom: 0, right: 0, borderBottomWidth: 3, borderRightWidth: 3, borderBottomRightRadius: 4 }),
                        }}
                      />
                    ))}
                  </div>
                </div>

                {/* Result overlay */}
                {lastResult && (
                  <div style={{
                    position: 'absolute', inset: 0,
                    background: lastResult.status === 'success'
                      ? 'rgba(34,197,94,0.88)'
                      : lastResult.status === 'duplicate'
                      ? 'rgba(245,158,11,0.88)'
                      : 'rgba(239,68,68,0.88)',
                    display: 'flex', flexDirection: 'column',
                    alignItems: 'center', justifyContent: 'center',
                    gap: 8,
                  }}>
                    <span className="material-symbols-outlined" style={{ fontSize: 56, color: '#fff' }}>
                      {lastResult.status === 'success' ? 'check_circle' : lastResult.status === 'duplicate' ? 'info' : 'cancel'}
                    </span>
                    <div style={{ fontSize: 18, fontWeight: 800, color: '#fff', fontFamily: 'var(--font-syne)' }}>
                      {lastResult.status === 'success'
                        ? `✓ ${lastResult.name}`
                        : lastResult.status === 'duplicate'
                        ? `Already in: ${lastResult.name}`
                        : lastResult.message}
                    </div>
                  </div>
                )}
              </div>

              {/* Status + stop */}
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginTop: 14 }}>
                <div style={{ fontSize: 13, color: 'var(--wimc-text-secondary)', display: 'flex', alignItems: 'center', gap: 6 }}>
                  <span style={{
                    display: 'inline-block', width: 8, height: 8, borderRadius: '50%',
                    background: scanning ? 'var(--wimc-amber)' : '#22c55e',
                    animation: scanning ? 'none' : undefined,
                  }} />
                  {scanning ? 'Processing…' : 'Scanning…'}
                </div>
                <button
                  onClick={stopCamera}
                  style={{
                    background: 'transparent', border: '1px solid var(--wimc-border-subtle)',
                    color: 'var(--wimc-text-secondary)', borderRadius: 8,
                    padding: '6px 14px', fontSize: 12, fontWeight: 600, cursor: 'pointer',
                  }}
                >
                  Stop
                </button>
              </div>
            </div>
          )}
        </div>
      )}

      {/* List tab */}
      {tab === 'list' && (
        <div style={{ padding: '20px 16px', maxWidth: 640, margin: '0 auto' }}>
          {/* Search */}
          <div style={{ position: 'relative', marginBottom: 16 }}>
            <span className="material-symbols-outlined" style={{
              position: 'absolute', left: 12, top: '50%', transform: 'translateY(-50%)',
              fontSize: 18, color: 'var(--wimc-text-muted)', pointerEvents: 'none',
            }}>search</span>
            <input
              type="text"
              placeholder="Search by name or phone…"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              style={{
                width: '100%', padding: '10px 14px 10px 38px',
                background: 'var(--wimc-bg-raised)',
                border: '1px solid var(--wimc-border-subtle)',
                borderRadius: 10, fontSize: 14, color: 'var(--wimc-text-primary)',
                outline: 'none', boxSizing: 'border-box',
              }}
            />
          </div>

          {/* Stats bar */}
          <div style={{
            display: 'flex', gap: 16, marginBottom: 14,
            fontSize: 12, fontFamily: 'var(--font-jetbrains-mono)',
            color: 'var(--wimc-text-muted)',
          }}>
            <span style={{ color: '#22c55e' }}>{checkedInCount} checked in</span>
            <span>{attendees.length - checkedInCount} remaining</span>
            <span>{attendees.length} total</span>
          </div>

          {filtered.length === 0 ? (
            <div style={{ textAlign: 'center', padding: '40px 0', color: 'var(--wimc-text-muted)', fontSize: 14 }}>
              No attendees found
            </div>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
              {filtered.map((a) => (
                <div
                  key={a.id}
                  style={{
                    display: 'flex', alignItems: 'center', gap: 12,
                    background: 'var(--wimc-bg-raised)',
                    border: `1px solid ${a.checked_in ? 'rgba(34,197,94,0.25)' : 'var(--wimc-border-subtle)'}`,
                    borderRadius: 10, padding: '12px 14px',
                    opacity: a.checked_in ? 0.7 : 1,
                    transition: 'opacity 200ms',
                  }}
                >
                  {/* Status icon */}
                  <div style={{
                    width: 32, height: 32, borderRadius: '50%', flexShrink: 0,
                    background: a.checked_in ? 'rgba(34,197,94,0.12)' : 'var(--wimc-bg-overlay)',
                    display: 'grid', placeItems: 'center',
                  }}>
                    <span className="material-symbols-outlined" style={{
                      fontSize: 18,
                      color: a.checked_in ? '#22c55e' : 'var(--wimc-text-muted)',
                    }}>
                      {a.checked_in ? 'check_circle' : 'radio_button_unchecked'}
                    </span>
                  </div>

                  {/* Info */}
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ fontSize: 14, fontWeight: 600, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                      {a.attendee_name}
                    </div>
                    <div style={{ fontSize: 12, color: 'var(--wimc-text-muted)', fontFamily: 'var(--font-jetbrains-mono)' }}>
                      {a.attendee_phone}
                      {a.checked_in && a.checked_in_at && (
                        <span style={{ marginLeft: 8 }}>
                          · {new Date(a.checked_in_at).toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit', hour12: true })}
                        </span>
                      )}
                    </div>
                  </div>

                  {/* Manual check-in */}
                  {!a.checked_in && (
                    <button
                      onClick={() => handleManualCheckIn(a.id)}
                      disabled={manualPending === a.id}
                      style={{
                        background: 'var(--wimc-coral)', color: '#fff', border: 'none',
                        borderRadius: 8, padding: '6px 14px', fontSize: 12, fontWeight: 700,
                        cursor: manualPending === a.id ? 'wait' : 'pointer',
                        opacity: manualPending === a.id ? 0.6 : 1,
                        flexShrink: 0,
                      }}
                    >
                      {manualPending === a.id ? '…' : 'Check in'}
                    </button>
                  )}
                </div>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  )
}

