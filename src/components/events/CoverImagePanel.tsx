'use client'

import { useRef, useState, type MutableRefObject } from 'react'
import { createPortal } from 'react-dom'
import Image from 'next/image'
import { uploadEventCover } from '@/app/actions/upload'
import { THEMES, getTheme, type Theme } from './themes'
import EventCanvasRenderer, { POSTER_TEMPLATES, type CanvasEventData } from './EventCanvasRenderer'

interface CoverImagePanelProps {
  themeId: string
  customUrl: string | null
  onThemeChange: (id: string) => void
  onUpload: (url: string) => void
  onClearCustom: () => void
  eventData?: CanvasEventData
  coverCanvasRef?: MutableRefObject<HTMLCanvasElement | null>
  selectedTemplate: string
  onTemplateChange: (id: string) => void
}

export function CoverImagePanel({
  themeId,
  customUrl,
  onThemeChange,
  onUpload,
  onClearCustom,
  eventData,
  coverCanvasRef,
  selectedTemplate,
  onTemplateChange,
}: CoverImagePanelProps) {
  const [sheetOpen,    setSheetOpen  ] = useState(false)
  const [uploading,    setUploading  ] = useState(false)
  const [uploadError,  setUploadError] = useState<string | null>(null)
  const [sheetTab,     setSheetTab   ] = useState<'upload' | 'templates'>('templates')
  const fileRef = useRef<HTMLInputElement>(null)

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
    if (fileRef.current) fileRef.current.value = ''
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
        ) : eventData ? (
          <EventCanvasRenderer
            data={eventData}
            templateId={selectedTemplate}
            size={1080}
            fill
            canvasRefOut={coverCanvasRef}
          />
        ) : (
          <CoverComponent />
        )}

        {/* Camera button */}
        <button
          type="button"
          onClick={() => setSheetOpen(true)}
          className="absolute bottom-3 right-3 w-9 h-9 flex items-center justify-center rounded-full border border-white/20 transition-colors hover:bg-black/70"
          style={{ background: 'rgba(0,0,0,0.6)' }}
          aria-label="Change cover"
        >
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

      {/* Sheet overlay — rendered via portal so fixed covers the full viewport */}
      {sheetOpen && typeof document !== 'undefined' && createPortal(
        <div className="fixed inset-0 z-[9000] flex items-end md:items-center justify-center">
          <div className="fixed inset-0 bg-black/70 backdrop-blur-[2px]" onClick={() => setSheetOpen(false)} />

          <div className="relative z-10 w-full md:w-[460px] bg-[#161616] rounded-t-2xl md:rounded-2xl border border-white/10 pb-safe shadow-2xl">
            {/* Sheet handle */}
            <div className="flex justify-center pt-3 pb-1 md:hidden">
              <div className="w-10 h-1 rounded-full bg-[#444]" />
            </div>

            <div className="px-5 pt-4 pb-6 space-y-5">
              <div className="flex items-center justify-between">
                <h3 className="text-white font-bold text-base">Cover Image</h3>
                <button
                  type="button"
                  onClick={() => setSheetOpen(false)}
                  className="w-7 h-7 flex items-center justify-center rounded-full bg-white/8 hover:bg-white/14 transition-colors text-white/50 hover:text-white text-xs"
                >
                  ✕
                </button>
              </div>

              {/* Tab bar */}
              {eventData && (
                <div className="flex gap-1 p-1 bg-[#202020] rounded-xl">
                  {(['templates', 'upload'] as const).map((t) => (
                    <button
                      key={t}
                      type="button"
                      onClick={() => setSheetTab(t)}
                      className="flex-1 py-2 rounded-lg text-xs font-semibold transition-colors"
                      style={{
                        background: sheetTab === t ? '#2E2E2E' : 'transparent',
                        color: sheetTab === t ? '#fff' : '#666',
                      }}
                    >
                      {t === 'templates' ? '✦ Templates' : 'Upload / Theme'}
                    </button>
                  ))}
                </div>
              )}

              {/* Templates tab — pick a style, modal closes immediately */}
              {eventData && sheetTab === 'templates' && (
                <div className="space-y-3">
                  <p className="text-[11px] text-[#555] uppercase tracking-widest">Choose a style — applied instantly</p>
                  <div className="grid grid-cols-4 gap-3">
                    {POSTER_TEMPLATES.map((tmpl) => {
                      const isActive = selectedTemplate === tmpl.id
                      return (
                        <button
                          key={tmpl.id}
                          type="button"
                          onClick={() => { onTemplateChange(tmpl.id); setSheetOpen(false) }}
                          className="flex flex-col items-center gap-2 group"
                        >
                          <div
                            className="w-full overflow-hidden rounded-xl transition-all"
                            style={{
                              aspectRatio: '1/1',
                              border: isActive ? '2.5px solid #E8572A' : '2px solid rgba(255,255,255,0.08)',
                              boxShadow: isActive ? '0 0 0 3px rgba(232,87,42,0.20)' : 'none',
                              transform: isActive ? 'scale(1.04)' : 'scale(1)',
                            }}
                          >
                            <EventCanvasRenderer
                              data={eventData}
                              templateId={tmpl.id}
                              size={240}
                              displaySize={104}
                            />
                          </div>
                          <span
                            className="text-[11px] font-semibold transition-colors"
                            style={{ color: isActive ? '#E8572A' : '#666' }}
                          >
                            {tmpl.name}
                          </span>
                        </button>
                      )
                    })}
                  </div>
                  {uploadError && <p className="text-red-400 text-xs">{uploadError}</p>}
                </div>
              )}

              {/* Upload tab */}
              {(!eventData || sheetTab === 'upload') && (
                <div>
                  <button
                    type="button"
                    disabled={uploading}
                    onClick={() => fileRef.current?.click()}
                    className="w-full flex items-center gap-3 py-3 px-4 rounded-xl bg-[#2A2A2A] hover:bg-[#333] transition-colors text-white text-sm font-medium disabled:opacity-60"
                  >
                    {uploading ? (
                      <><Spinner /> Uploading…</>
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
                  {uploadError && <p className="text-red-400 text-xs mt-2">{uploadError}</p>}
                </div>
              )}

              {/* Theme swatches — upload tab only */}
              {(!eventData || sheetTab === 'upload') && (
                <div>
                  <p className="text-[11px] text-[#555] uppercase tracking-widest mb-3">Background theme</p>
                  <div className="flex gap-3 overflow-x-auto pb-1">
                    {THEMES.map((t: Theme) => (
                      <button
                        key={t.id}
                        type="button"
                        onClick={() => { onThemeChange(t.id); if (customUrl) onClearCustom(); setSheetOpen(false) }}
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
        </div>,
        document.body
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
