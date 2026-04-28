'use client'

import { useRef, useState } from 'react'
import Image from 'next/image'
import { uploadEventCover } from '@/app/actions/upload'
import { THEMES, getTheme, type Theme } from './themes'
import EventCanvasRenderer, { type CanvasEventData } from './EventCanvasRenderer'

interface CoverImagePanelProps {
  themeId: string
  customUrl: string | null
  onThemeChange: (id: string) => void
  onUpload: (url: string) => void
  onClearCustom: () => void
  eventData?: CanvasEventData
}

export function CoverImagePanel({
  themeId,
  customUrl,
  onThemeChange,
  onUpload,
  onClearCustom,
  eventData,
}: CoverImagePanelProps) {
  const [sheetOpen,   setSheetOpen  ] = useState(false)
  const [uploading,   setUploading  ] = useState(false)
  const [uploadError, setUploadError] = useState<string | null>(null)
  const [sheetTab,    setSheetTab   ] = useState<'upload' | 'generate'>('upload')
  const [genUploading, setGenUploading] = useState(false)
  const fileRef = useRef<HTMLInputElement>(null)

  async function handleUseGeneratedCover(blob: Blob) {
    setGenUploading(true)
    setUploadError(null)
    const file = new File([blob], 'generated-cover.jpg', { type: 'image/jpeg' })
    const fd = new FormData()
    fd.append('file', file)
    const result = await uploadEventCover(fd)
    setGenUploading(false)
    if (result.error || !result.url) {
      setUploadError(result.error ?? 'Upload failed.')
    } else {
      onUpload(result.url)
      setSheetOpen(false)
    }
  }

  const theme = getTheme(themeId)
  const CoverComponent = theme.Cover

  async function handleFileChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0]
    if (!file) return
    setUploading(true)
    setUploadError(null)
    const fd = new FormData()
    fd.append('file', file)
    const result = await uploadEventCover(fd)
    setUploading(false)
    if (result.error || !result.url) {
      setUploadError(result.error ?? 'Upload failed.')
    } else {
      onUpload(result.url)
      setSheetOpen(false)
    }
    // reset so same file can be re-selected
    if (fileRef.current) fileRef.current.value = ''
  }

  function handleThemePickInSheet(id: string) {
    onThemeChange(id)
    if (customUrl) onClearCustom()
    setSheetOpen(false)
  }

  return (
    <>
      {/* Square cover area */}
      <div
        className="relative w-full rounded-2xl overflow-hidden"
        style={{ aspectRatio: '1 / 1' }}
      >
        {customUrl ? (
          <Image src={customUrl} alt="Event cover" fill className="object-cover" />
        ) : (
          <CoverComponent />
        )}

        {/* Camera button — bottom right */}
        <button
          type="button"
          onClick={() => setSheetOpen(true)}
          className="absolute bottom-3 right-3 w-9 h-9 flex items-center justify-center rounded-full border border-white/20 transition-colors hover:bg-black/70"
          style={{ background: 'rgba(0,0,0,0.6)' }}
          aria-label="Change cover"
        >
          {/* Camera icon */}
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
            <path d="M23 19a2 2 0 0 1-2 2H3a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h4l2-3h6l2 3h4a2 2 0 0 1 2 2z"/>
            <circle cx="12" cy="13" r="4"/>
          </svg>
        </button>
      </div>

      {/* Hidden file input */}
      <input
        ref={fileRef}
        type="file"
        accept="image/jpeg,image/png,image/webp"
        className="hidden"
        onChange={handleFileChange}
      />

      {/* Sheet overlay */}
      {sheetOpen && (
        <div className="fixed inset-0 z-[150] flex items-end md:items-center justify-center">
          <div className="fixed inset-0 bg-black/60" onClick={() => setSheetOpen(false)} />

          <div className="relative z-10 w-full md:w-[400px] bg-[#1A1A1A] rounded-t-2xl md:rounded-2xl border border-white/10 pb-safe">
            {/* Sheet handle */}
            <div className="flex justify-center pt-3 pb-1 md:hidden">
              <div className="w-10 h-1 rounded-full bg-[#444]" />
            </div>

            <div className="px-5 pt-4 pb-6 space-y-5">
              <h3 className="text-white font-bold text-base">Cover Image</h3>

              {/* Tab bar */}
              {eventData && (
                <div className="flex gap-1 p-1 bg-[#222] rounded-xl">
                  {(['upload', 'generate'] as const).map((t) => (
                    <button
                      key={t}
                      type="button"
                      onClick={() => setSheetTab(t)}
                      className="flex-1 py-2 rounded-lg text-xs font-semibold transition-colors capitalize"
                      style={{
                        background: sheetTab === t ? '#333' : 'transparent',
                        color: sheetTab === t ? '#fff' : '#777',
                      }}
                    >
                      {t === 'generate' ? '✦ Generate' : 'Upload / Theme'}
                    </button>
                  ))}
                </div>
              )}

              {/* Generate tab */}
              {eventData && sheetTab === 'generate' && (
                <div className="flex flex-col items-center gap-3">
                  <p className="text-[11px] text-[#555] uppercase tracking-widest self-start">Live preview</p>
                  <EventCanvasRenderer
                    data={eventData}
                    size={800}
                    displaySize={312}
                    onAction={handleUseGeneratedCover}
                    actionLabel="Use as Cover"
                    isPending={genUploading}
                  />
                  {uploadError && (
                    <p className="text-red-400 text-xs">{uploadError}</p>
                  )}
                </div>
              )}

              {/* Upload option */}
              {(!eventData || sheetTab === 'upload') && (
              <div>
                <button
                  type="button"
                  disabled={uploading}
                  onClick={() => fileRef.current?.click()}
                  className="w-full flex items-center gap-3 py-3 px-4 rounded-xl bg-[#2A2A2A] hover:bg-[#333] transition-colors text-white text-sm font-medium disabled:opacity-60"
                >
                  {uploading ? (
                    <>
                      <Spinner /> Uploading…
                    </>
                  ) : (
                    <>
                      <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
                        <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/>
                        <polyline points="17 8 12 3 7 8"/>
                        <line x1="12" y1="3" x2="12" y2="15"/>
                      </svg>
                      Upload image
                    </>
                  )}
                </button>
                {customUrl && (
                  <button
                    type="button"
                    onClick={() => { onClearCustom(); setSheetOpen(false) }}
                    className="w-full text-sm text-[#888] hover:text-white mt-2 py-2 transition-colors"
                  >
                    Remove custom image
                  </button>
                )}
                {uploadError && (
                  <p className="text-red-400 text-xs mt-2">{uploadError}</p>
                )}
              </div>
              )}

              {/* Theme swatches */}
              {(!eventData || sheetTab === 'upload') && (
              <div>
                <p className="text-[11px] text-[#555] uppercase tracking-widest mb-3">Choose a theme</p>
                <div className="flex gap-3 overflow-x-auto pb-1">
                  {THEMES.map((t: Theme) => (
                    <button
                      key={t.id}
                      type="button"
                      onClick={() => handleThemePickInSheet(t.id)}
                      className="flex-shrink-0 flex flex-col items-center gap-1.5"
                    >
                      <div
                        className={`w-20 h-20 rounded-xl overflow-hidden border-2 transition-colors ${
                          t.id === themeId && !customUrl
                            ? 'border-[#E8572A]'
                            : 'border-transparent hover:border-white/30'
                        }`}
                      >
                        <t.Cover />
                      </div>
                      <span className="text-[11px] text-[#888]">{t.name}</span>
                    </button>
                  ))}
                </div>
              </div>
              )}
            </div>
          </div>
        </div>
      )}
    </>
  )
}

function Spinner() {
  return (
    <svg className="animate-spin" width="16" height="16" viewBox="0 0 24 24" fill="none">
      <circle cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="2" strokeOpacity="0.25"/>
      <path d="M22 12a10 10 0 0 0-10-10" stroke="currentColor" strokeWidth="2" strokeLinecap="round"/>
    </svg>
  )
}
