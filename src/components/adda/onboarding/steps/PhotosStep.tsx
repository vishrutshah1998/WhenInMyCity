'use client'

import { useState, useRef, useCallback, useId } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import {
  DndContext,
  closestCenter,
  PointerSensor,
  useSensor,
  useSensors,
  type DragEndEvent,
} from '@dnd-kit/core'
import {
  SortableContext,
  rectSortingStrategy,
  useSortable,
  arrayMove,
} from '@dnd-kit/sortable'
import { CSS } from '@dnd-kit/utilities'
import { useOnboarding } from '@/components/adda/onboarding/OnboardingShell'

interface PhotoItem {
  id: string
  url: string
  file: File
  progress: number
  uploading: boolean
}

const MIN_PHOTOS = 3
const REC_PHOTOS = 8

function CloudUploadIcon() {
  return (
    <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor"
      strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"
      style={{ color: 'var(--adda-amber)' }}>
      <polyline points="16 16 12 12 8 16" />
      <line x1="12" y1="12" x2="12" y2="21" />
      <path d="M20.39 18.39A5 5 0 0 0 18 9h-1.26A8 8 0 1 0 3 16.3" />
    </svg>
  )
}

function DragHandleIcon() {
  return (
    <svg width="14" height="14" viewBox="0 0 24 24" fill="currentColor">
      <circle cx="9" cy="5"  r="1.5" /><circle cx="15" cy="5"  r="1.5" />
      <circle cx="9" cy="12" r="1.5" /><circle cx="15" cy="12" r="1.5" />
      <circle cx="9" cy="19" r="1.5" /><circle cx="15" cy="19" r="1.5" />
    </svg>
  )
}

function SortablePhoto({
  photo,
  isCover,
  onRemove,
}: {
  photo: PhotoItem
  isCover: boolean
  onRemove: (id: string) => void
}) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } =
    useSortable({ id: photo.id })

  const style: React.CSSProperties = {
    transform: CSS.Transform.toString(transform),
    transition,
    aspectRatio: '4 / 3',
    position: 'relative',
    borderRadius: 8,
    overflow: 'hidden',
    boxShadow: isDragging
      ? '0 8px 30px rgba(251,191,36,0.35), 0 2px 12px rgba(0,0,0,0.5)'
      : '0 1px 4px rgba(0,0,0,0.25)',
    zIndex: isDragging ? 50 : 'auto',
    cursor: isDragging ? 'grabbing' : 'default',
  }

  return (
    <div ref={setNodeRef} style={style} {...attributes}>
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img
        src={photo.url}
        alt=""
        style={{ width: '100%', height: '100%', objectFit: 'cover', display: 'block' }}
      />

      {/* Drag handle */}
      <button
        {...listeners}
        style={{
          position: 'absolute',
          top: 5,
          left: 5,
          width: 24,
          height: 24,
          borderRadius: 5,
          background: 'rgba(0,0,0,0.55)',
          border: 'none',
          color: '#fff',
          display: 'grid',
          placeItems: 'center',
          cursor: 'grab',
          padding: 0,
        }}
        aria-label="Drag to reorder"
      >
        <DragHandleIcon />
      </button>

      {/* Remove */}
      <button
        onClick={() => onRemove(photo.id)}
        style={{
          position: 'absolute',
          top: 5,
          right: 5,
          width: 22,
          height: 22,
          borderRadius: '50%',
          background: 'rgba(0,0,0,0.6)',
          border: 'none',
          color: '#fff',
          display: 'grid',
          placeItems: 'center',
          fontSize: 13,
          cursor: 'pointer',
          fontWeight: 700,
          lineHeight: 1,
          padding: 0,
        }}
        aria-label="Remove photo"
      >
        ×
      </button>

      {/* Cover badge */}
      {isCover && (
        <span style={{
          position: 'absolute',
          bottom: 6,
          left: 6,
          padding: '2px 7px',
          borderRadius: 100,
          background: 'var(--adda-amber)',
          color: '#000',
          fontSize: 10,
          fontWeight: 700,
          fontFamily: 'var(--font-inter), system-ui, sans-serif',
          letterSpacing: '0.04em',
        }}>
          Cover
        </span>
      )}
    </div>
  )
}

function PendingUploadRow({ file, progress }: { file: File; progress: number }) {
  return (
    <div style={{
      display: 'flex',
      flexDirection: 'column',
      gap: 4,
      padding: '6px 0',
    }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <span style={{
          fontSize: 12,
          color: 'var(--adda-text-secondary)',
          fontFamily: 'var(--font-inter), system-ui, sans-serif',
          overflow: 'hidden',
          textOverflow: 'ellipsis',
          whiteSpace: 'nowrap',
          maxWidth: '75%',
        }}>
          {file.name}
        </span>
        <span style={{ fontSize: 11, color: 'var(--adda-text-muted)', fontFamily: 'var(--font-inter), system-ui, sans-serif' }}>
          {Math.round(progress)}%
        </span>
      </div>
      <div style={{ height: 3, borderRadius: 2, background: 'var(--adda-bg-overlay)' }}>
        <motion.div
          initial={{ width: 0 }}
          animate={{ width: `${progress}%` }}
          style={{ height: '100%', borderRadius: 2, background: 'var(--adda-amber)' }}
          transition={{ ease: 'easeOut', duration: 0.2 }}
        />
      </div>
    </div>
  )
}

export default function PhotosStep() {
  const { handleAnswer, snapshot, send } = useOnboarding()
  const [photos, setPhotos] = useState<PhotoItem[]>([])
  const [pending, setPending] = useState<Array<{ file: File; progress: number }>>([])
  const [isDragOver, setIsDragOver] = useState(false)
  const fileInputRef = useRef<HTMLInputElement>(null)
  const dndId = useId()

  const sensors = useSensors(useSensor(PointerSensor, { activationConstraint: { distance: 5 } }))

  const simulateUpload = useCallback((file: File) => {
    const id = `photo-${Date.now()}-${Math.random().toString(36).slice(2)}`
    const objectUrl = URL.createObjectURL(file)

    setPending(prev => [...prev, { file, progress: 0 }])

    // Simulate progress in ~600ms
    let prog = 0
    const interval = setInterval(() => {
      prog = Math.min(prog + Math.random() * 30 + 10, 100)
      setPending(prev => prev.map(p => p.file === file ? { ...p, progress: prog } : p))

      if (prog >= 100) {
        clearInterval(interval)
        setPending(prev => prev.filter(p => p.file !== file))
        setPhotos(prev => [...prev, { id, url: objectUrl, file, progress: 100, uploading: false }])
      }
    }, 120)
  }, [])

  function processFiles(files: FileList | null) {
    if (!files) return
    Array.from(files).forEach(f => {
      if (f.type.startsWith('image/')) simulateUpload(f)
    })
  }

  function handleDrop(e: React.DragEvent) {
    e.preventDefault()
    setIsDragOver(false)
    processFiles(e.dataTransfer.files)
  }

  function handleDragEnd(event: DragEndEvent) {
    const { active, over } = event
    if (over && active.id !== over.id) {
      setPhotos(prev => {
        const oldIdx = prev.findIndex(p => p.id === active.id)
        const newIdx = prev.findIndex(p => p.id === over.id)
        return arrayMove(prev, oldIdx, newIdx)
      })
    }
  }

  function removePhoto(id: string) {
    setPhotos(prev => {
      const p = prev.find(ph => ph.id === id)
      if (p) URL.revokeObjectURL(p.url)
      return prev.filter(ph => ph.id !== id)
    })
  }

  function handleConfirm(skipPhotos = false) {
    if (skipPhotos) {
      handleAnswer('photos', [], 'Skipped photos')
      return
    }
    const payload = photos.map((p, i) => ({ url: p.url, order: i, isCover: i === 0 }))
    handleAnswer('photos', payload.map(p => p.url), `${photos.length} photos`, {
      photos: payload.map(p => p.url),
    })
  }

  const canGoBack = snapshot.can({ type: 'BACK' })
  const photoIds = photos.map(p => p.id)
  const canContinue = photos.length >= MIN_PHOTOS
  const progressPct = Math.min((photos.length / REC_PHOTOS) * 100, 100)

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
      {/* Drop zone */}
      <div
        onDragOver={e => { e.preventDefault(); setIsDragOver(true) }}
        onDragLeave={() => setIsDragOver(false)}
        onDrop={handleDrop}
        onClick={() => fileInputRef.current?.click()}
        style={{
          height: 160,
          borderRadius: 12,
          border: `2px dashed ${isDragOver ? 'var(--adda-amber)' : 'var(--adda-amber-border)'}`,
          background: isDragOver ? 'var(--adda-amber-tint)' : 'var(--adda-bg-elevated)',
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          justifyContent: 'center',
          gap: 8,
          cursor: 'pointer',
          transition: 'background 150ms ease, border-color 150ms ease',
        }}
      >
        <CloudUploadIcon />
        <span style={{
          fontSize: 14,
          color: 'var(--adda-text-secondary)',
          fontFamily: 'var(--font-inter), system-ui, sans-serif',
          textAlign: 'center',
          lineHeight: 1.5,
        }}>
          Drag photos here, or tap to browse
        </span>
        <span style={{ fontSize: 11, color: 'var(--adda-text-muted)', fontFamily: 'var(--font-inter), system-ui, sans-serif' }}>
          JPEG, PNG, WebP
        </span>
      </div>

      <input
        ref={fileInputRef}
        type="file"
        accept="image/jpeg,image/png,image/webp"
        multiple
        style={{ display: 'none' }}
        onChange={e => processFiles(e.target.files)}
      />

      {/* Pending uploads */}
      {pending.length > 0 && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
          {pending.map(p => (
            <PendingUploadRow key={p.file.name + p.file.size} file={p.file} progress={p.progress} />
          ))}
        </div>
      )}

      {/* Sortable grid */}
      {photos.length > 0 && (
        <DndContext
          id={dndId}
          sensors={sensors}
          collisionDetection={closestCenter}
          onDragEnd={handleDragEnd}
        >
          <SortableContext items={photoIds} strategy={rectSortingStrategy}>
            <div className="photos-grid">
              {photos.map((photo, idx) => (
                <SortablePhoto
                  key={photo.id}
                  photo={photo}
                  isCover={idx === 0}
                  onRemove={removePhoto}
                />
              ))}
            </div>
          </SortableContext>
        </DndContext>
      )}

      {/* Photo count progress bar */}
      {(photos.length > 0 || pending.length > 0) && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <span style={{
              fontSize: 12,
              color: canContinue ? 'var(--adda-amber)' : 'var(--adda-text-muted)',
              fontFamily: 'var(--font-inter), system-ui, sans-serif',
              fontWeight: canContinue ? 600 : 400,
            }}>
              {photos.length} / {REC_PHOTOS} photos recommended
            </span>
            {photos.length >= REC_PHOTOS && (
              <span style={{ fontSize: 11, color: 'var(--adda-amber)', fontFamily: 'var(--font-inter), system-ui, sans-serif' }}>✓ Great set!</span>
            )}
          </div>
          <div style={{ height: 4, borderRadius: 2, background: 'var(--adda-bg-overlay)' }}>
            <motion.div
              animate={{ width: `${progressPct}%` }}
              style={{ height: '100%', borderRadius: 2, background: 'var(--adda-amber)' }}
              transition={{ ease: 'easeOut', duration: 0.3 }}
            />
          </div>
        </div>
      )}

      {/* Actions */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', paddingTop: 2 }}>
        <button
          onClick={() => handleConfirm(true)}
          style={{
            padding: '6px 0',
            background: 'transparent',
            border: 'none',
            color: 'var(--adda-text-muted)',
            fontFamily: 'var(--font-inter), system-ui, sans-serif',
            fontSize: 12,
            cursor: 'pointer',
          }}
        >
          Skip for now
        </button>

        <div style={{ position: 'relative' }}>
          <button
            onClick={() => canContinue && handleConfirm()}
            disabled={!canContinue}
            title={!canContinue ? `Add at least ${MIN_PHOTOS} photos to continue — these are the first thing creators see.` : undefined}
            style={{
              padding: '9px 20px',
              borderRadius: 100,
              background: canContinue ? 'var(--adda-amber)' : 'var(--adda-bg-overlay)',
              color: canContinue ? '#000' : 'var(--adda-text-muted)',
              fontWeight: 700,
              fontSize: 14,
              fontFamily: 'var(--font-inter), system-ui, sans-serif',
              border: 'none',
              cursor: canContinue ? 'pointer' : 'not-allowed',
              transition: 'background 150ms ease, color 150ms ease',
            }}
          >
            Next →
          </button>
        </div>
      </div>

      {canGoBack && (
        <button
          onClick={() => send({ type: 'BACK' })}
          style={{
            alignSelf: 'flex-start',
            padding: '6px 0',
            background: 'transparent',
            border: 'none',
            color: 'var(--adda-text-muted)',
            fontFamily: 'var(--font-inter), system-ui, sans-serif',
            fontSize: 12,
            cursor: 'pointer',
          }}
        >
          ← Go back
        </button>
      )}

      <style>{`
        .photos-grid {
          display: grid;
          grid-template-columns: repeat(3, 1fr);
          gap: 8px;
        }
        @media (max-width: 640px) {
          .photos-grid { grid-template-columns: repeat(2, 1fr); }
        }
      `}</style>
    </div>
  )
}
