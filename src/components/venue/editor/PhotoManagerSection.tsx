'use client'

import { useState, useRef } from 'react'
import { AnimatePresence, motion } from 'framer-motion'
import {
  DndContext,
  closestCenter,
  PointerSensor,
  KeyboardSensor,
  useSensor,
  useSensors,
  type DragEndEvent,
} from '@dnd-kit/core'
import {
  SortableContext,
  sortableKeyboardCoordinates,
  rectSortingStrategy,
  useSortable,
  arrayMove,
} from '@dnd-kit/sortable'
import { CSS } from '@dnd-kit/utilities'
import type { PhotoItem } from './types'

// ─── Types ────────────────────────────────────────────────────────────────────

interface Props {
  photos: PhotoItem[]
  onChange: (photos: PhotoItem[]) => void
  isEditing: boolean
}

interface SortablePhotoProps {
  photo: PhotoItem
  isEditing: boolean
  onDelete: (id: string) => void
  onEditAlt: (id: string, alt: string) => void
}

// ─── Sortable photo card ───────────────────────────────────────────────────────

function SortablePhoto({ photo, isEditing, onDelete, onEditAlt }: SortablePhotoProps) {
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({ id: photo.id })

  const [hovered, setHovered] = useState(false)
  const [showAltEdit, setShowAltEdit] = useState(false)
  const [altDraft, setAltDraft] = useState(photo.alt_text)
  const [deleteConfirm, setDeleteConfirm] = useState(false)

  const style: React.CSSProperties = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.4 : 1,
    zIndex: isDragging ? 10 : undefined,
  }

  return (
    <div
      ref={setNodeRef}
      style={{
        ...style,
        position: 'relative',
        aspectRatio: '4/3',
        borderRadius: 10,
        overflow: 'hidden',
        background: 'var(--venue-bg-overlay)',
        border: photo.is_cover
          ? '2px solid var(--venue-amber)'
          : '1px solid var(--venue-border-subtle)',
        cursor: isEditing ? 'grab' : 'default',
      }}
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => { setHovered(false); setDeleteConfirm(false) }}
      {...(isEditing ? { ...attributes, ...listeners } : {})}
    >
      {/* Image */}
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img
        src={photo.url}
        alt={photo.alt_text}
        style={{ width: '100%', height: '100%', objectFit: 'cover', display: 'block' }}
      />

      {/* Cover badge */}
      {photo.is_cover && (
        <div style={{
          position: 'absolute', top: 8, left: 8,
          padding: '2px 8px', borderRadius: 9999,
          background: 'var(--venue-amber)',
          color: '#000', fontSize: 10, fontWeight: 700,
          fontFamily: 'var(--font-inter), sans-serif',
          letterSpacing: '0.05em',
        }}>
          Cover
        </div>
      )}

      {/* Hover overlay with actions */}
      {isEditing && hovered && (
        <div style={{
          position: 'absolute', inset: 0,
          background: 'rgba(0,0,0,0.55)',
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          gap: 8,
        }}>
          {/* Edit alt text */}
          <button
            onClick={(e) => { e.stopPropagation(); setShowAltEdit(true) }}
            style={{
              width: 32, height: 32, borderRadius: 8,
              background: 'rgba(255,255,255,0.15)',
              border: '1px solid rgba(255,255,255,0.2)',
              color: '#fff', cursor: 'pointer',
              display: 'grid', placeItems: 'center',
            }}
            title="Edit alt text"
          >
            <span className="material-symbols-outlined" style={{ fontSize: 16 }}>edit</span>
          </button>

          {/* Delete */}
          {deleteConfirm ? (
            <button
              onClick={(e) => { e.stopPropagation(); onDelete(photo.id) }}
              style={{
                padding: '0 10px', height: 32, borderRadius: 8,
                background: '#ef4444', border: 'none',
                color: '#fff', cursor: 'pointer', fontSize: 11, fontWeight: 700,
                fontFamily: 'var(--font-inter), sans-serif',
              }}
            >
              Confirm?
            </button>
          ) : (
            <button
              onClick={(e) => { e.stopPropagation(); setDeleteConfirm(true) }}
              style={{
                width: 32, height: 32, borderRadius: 8,
                background: 'rgba(255,255,255,0.15)',
                border: '1px solid rgba(255,255,255,0.2)',
                color: '#fff', cursor: 'pointer',
                display: 'grid', placeItems: 'center',
              }}
              title="Delete photo"
            >
              <span className="material-symbols-outlined" style={{ fontSize: 16 }}>delete</span>
            </button>
          )}
        </div>
      )}

      {/* Alt text edit inline panel */}
      {showAltEdit && (
        <div
          style={{
            position: 'absolute', inset: 0,
            background: 'rgba(0,0,0,0.85)',
            display: 'flex', flexDirection: 'column',
            alignItems: 'center', justifyContent: 'center',
            padding: 12, gap: 8,
          }}
          onClick={e => e.stopPropagation()}
        >
          <span style={{ fontSize: 10, color: 'rgba(255,255,255,0.6)', fontFamily: 'var(--font-inter), sans-serif', letterSpacing: '0.06em', textTransform: 'uppercase' }}>
            Alt text
          </span>
          <input
            value={altDraft}
            onChange={e => setAltDraft(e.target.value)}
            style={{
              width: '100%', padding: '6px 8px', borderRadius: 6,
              background: 'rgba(255,255,255,0.1)',
              border: '1px solid rgba(255,255,255,0.25)',
              color: '#fff', fontSize: 12,
              fontFamily: 'var(--font-inter), sans-serif',
              outline: 'none',
            }}
            autoFocus
          />
          <div style={{ display: 'flex', gap: 6 }}>
            <button
              onClick={() => { onEditAlt(photo.id, altDraft); setShowAltEdit(false) }}
              style={{
                padding: '4px 12px', borderRadius: 6,
                background: 'var(--venue-amber)', border: 'none',
                color: '#000', fontSize: 11, fontWeight: 700, cursor: 'pointer',
                fontFamily: 'var(--font-inter), sans-serif',
              }}
            >
              Save
            </button>
            <button
              onClick={() => setShowAltEdit(false)}
              style={{
                padding: '4px 12px', borderRadius: 6,
                background: 'rgba(255,255,255,0.1)', border: 'none',
                color: '#fff', fontSize: 11, cursor: 'pointer',
                fontFamily: 'var(--font-inter), sans-serif',
              }}
            >
              Cancel
            </button>
          </div>
        </div>
      )}
    </div>
  )
}

// ─── Requirements checklist ───────────────────────────────────────────────────

function PhotoRequirements({ count }: { count: number }) {
  const meetsMin = count >= 5
  // These are self-reported for now; real validation would inspect filenames/metadata
  const requirements = [
    { label: 'At least 5 photos', met: meetsMin },
    { label: 'At least 1 daytime exterior photo', met: count >= 2 },
    { label: 'At least 1 interior photo showing capacity', met: count >= 3 },
  ]

  const metCount = requirements.filter(r => r.met).length
  const strengthPct = Math.round((metCount / requirements.length) * 100)

  return (
    <div style={{ marginTop: 16 }}>
      {/* Listing strength bar */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 8 }}>
        <span style={{
          fontSize: 11, fontWeight: 600, color: 'var(--venue-text-muted)',
          fontFamily: 'var(--font-inter), sans-serif',
          textTransform: 'uppercase', letterSpacing: '0.07em',
        }}>
          Listing strength
        </span>
        <div style={{
          flex: 1, height: 5, borderRadius: 9999,
          background: 'var(--venue-bg-overlay)',
          overflow: 'hidden',
        }}>
          <motion.div
            animate={{ width: `${strengthPct}%` }}
            transition={{ duration: 0.4, ease: 'easeOut' }}
            style={{
              height: '100%', borderRadius: 9999,
              background: strengthPct === 100
                ? 'var(--venue-success)'
                : strengthPct > 50
                  ? 'var(--venue-amber)'
                  : '#ef4444',
            }}
          />
        </div>
        <span style={{
          fontSize: 11, fontWeight: 700,
          color: strengthPct === 100 ? 'var(--venue-success)' : 'var(--venue-amber)',
          fontFamily: 'var(--font-jetbrains-mono), monospace',
        }}>
          {strengthPct}%
        </span>
      </div>

      {/* Checklist */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
        {requirements.map(r => (
          <div key={r.label} style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
            <span
              className="material-symbols-outlined"
              style={{
                fontSize: 14,
                color: r.met ? 'var(--venue-success)' : 'var(--venue-amber)',
              }}
            >
              {r.met ? 'check_circle' : 'cancel'}
            </span>
            <span style={{
              fontSize: 12, color: 'var(--venue-text-muted)',
              fontFamily: 'var(--font-inter), sans-serif',
            }}>
              {r.label}
            </span>
          </div>
        ))}
      </div>
    </div>
  )
}

// ─── Main section ─────────────────────────────────────────────────────────────

export default function PhotoManagerSection({ photos, onChange, isEditing }: Props) {
  const [collapsed, setCollapsed] = useState(false)
  const fileInputRef = useRef<HTMLInputElement>(null)

  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 5 } }),
    useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates }),
  )

  function handleDragEnd(event: DragEndEvent) {
    const { active, over } = event
    if (!over || active.id === over.id) return
    const oldIndex = photos.findIndex(p => p.id === active.id)
    const newIndex = photos.findIndex(p => p.id === over.id)
    const reordered = arrayMove(photos, oldIndex, newIndex)
    // First photo is always cover
    const withCover = reordered.map((p, i) => ({ ...p, is_cover: i === 0 }))
    onChange(withCover)
  }

  function handleDelete(id: string) {
    const filtered = photos.filter(p => p.id !== id)
    const withCover = filtered.map((p, i) => ({ ...p, is_cover: i === 0 }))
    onChange(withCover)
  }

  function handleEditAlt(id: string, alt: string) {
    onChange(photos.map(p => p.id === id ? { ...p, alt_text: alt } : p))
  }

  function handleFileChange(e: React.ChangeEvent<HTMLInputElement>) {
    const files = Array.from(e.target.files ?? [])
    if (!files.length) return

    const newPhotos: PhotoItem[] = files.map((file, i) => ({
      id: `local-${Date.now()}-${i}`,
      url: URL.createObjectURL(file),
      alt_text: file.name.replace(/\.[^.]+$/, ''),
      is_cover: false,
      is_local: true,
    }))

    const combined = [...photos, ...newPhotos]
    const withCover = combined.map((p, i) => ({ ...p, is_cover: i === 0 }))
    onChange(withCover)
    e.target.value = ''
  }

  return (
    <div style={{
      borderBottom: '1px solid var(--venue-border-subtle)',
      paddingBottom: 24,
      marginBottom: 24,
    }}>
      {/* Section header */}
      <button
        onClick={() => setCollapsed(c => !c)}
        style={{
          width: '100%', display: 'flex', alignItems: 'center', justifyContent: 'space-between',
          padding: '16px 0 12px',
          background: 'transparent', border: 'none', cursor: 'pointer',
          color: 'var(--venue-text-primary)',
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          <span className="material-symbols-outlined" style={{ fontSize: 18, color: 'var(--venue-amber)' }}>
            photo_library
          </span>
          <span style={{
            fontFamily: 'var(--font-inter), sans-serif',
            fontWeight: 600, fontSize: 14,
          }}>
            Photos
          </span>
          <span style={{
            padding: '1px 8px', borderRadius: 9999,
            background: 'var(--venue-bg-overlay)',
            fontSize: 11, fontFamily: 'var(--font-jetbrains-mono), monospace',
            color: 'var(--venue-text-muted)',
          }}>
            {photos.length}
          </span>
        </div>
        <span
          className="material-symbols-outlined"
          style={{
            fontSize: 18, color: 'var(--venue-text-muted)',
            transform: collapsed ? 'rotate(-90deg)' : 'rotate(0deg)',
            transition: 'transform 200ms ease',
          }}
        >
          expand_more
        </span>
      </button>

      <AnimatePresence initial={false}>
        {!collapsed && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: 'auto' }}
            exit={{ opacity: 0, height: 0 }}
            transition={{ duration: 0.2 }}
            style={{ overflow: 'hidden' }}
          >
            {/* Photo grid */}
            <DndContext
              sensors={sensors}
              collisionDetection={closestCenter}
              onDragEnd={handleDragEnd}
            >
              <SortableContext items={photos.map(p => p.id)} strategy={rectSortingStrategy}>
                <div style={{
                  display: 'grid',
                  gridTemplateColumns: 'repeat(3, 1fr)',
                  gap: 10,
                }}>
                  {photos.map(photo => (
                    <SortablePhoto
                      key={photo.id}
                      photo={photo}
                      isEditing={isEditing}
                      onDelete={handleDelete}
                      onEditAlt={handleEditAlt}
                    />
                  ))}

                  {/* Add photo slot */}
                  {isEditing && (
                    <button
                      onClick={() => fileInputRef.current?.click()}
                      style={{
                        aspectRatio: '4/3',
                        borderRadius: 10,
                        border: '1.5px dashed var(--venue-border-default)',
                        background: 'transparent',
                        cursor: 'pointer',
                        display: 'flex', flexDirection: 'column',
                        alignItems: 'center', justifyContent: 'center',
                        gap: 6, color: 'var(--venue-text-muted)',
                        transition: 'border-color 150ms, background 150ms',
                      }}
                      onMouseEnter={e => {
                        e.currentTarget.style.borderColor = 'var(--venue-amber)'
                        e.currentTarget.style.background = 'var(--venue-amber-tint)'
                      }}
                      onMouseLeave={e => {
                        e.currentTarget.style.borderColor = 'var(--venue-border-default)'
                        e.currentTarget.style.background = 'transparent'
                      }}
                    >
                      <span className="material-symbols-outlined" style={{ fontSize: 24 }}>add_photo_alternate</span>
                      <span style={{ fontSize: 11, fontFamily: 'var(--font-inter), sans-serif' }}>
                        Add photo
                      </span>
                    </button>
                  )}
                </div>
              </SortableContext>
            </DndContext>

            {/* Hidden file input */}
            <input
              ref={fileInputRef}
              type="file"
              accept="image/*"
              multiple
              style={{ display: 'none' }}
              onChange={handleFileChange}
            />

            {/* Requirements */}
            <PhotoRequirements count={photos.length} />
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  )
}
