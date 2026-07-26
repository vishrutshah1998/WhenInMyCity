'use client'

import { useState, useTransition } from 'react'
import {
  createSpotList,
  updateSpotListMeta,
  deleteSpotList,
  addPlaceToList,
  removePlaceFromList,
  publishSpotList,
  unpublishSpotList,
  getAttractionOptions,
} from '@/app/actions/spotLists'
import type { SpotList, SpotListItem, SpotListStatus, AttractionOption } from '@/app/actions/spotLists'

// ── Category emoji map ────────────────────────────────────────────────────────

const CAT_EMOJI: Record<string, string> = {
  heritage: '🏛', park: '🌳', market: '🛍', food: '🍽', temple: '🛕',
  nature: '🌿', arts: '🎨', shopping: '🏬', attraction: '⭐',
}

// ── Status badge ──────────────────────────────────────────────────────────────

function StatusBadge({ status }: { status: SpotListStatus }) {
  const cfg: Record<SpotListStatus, { label: string; bg: string; color: string }> = {
    draft:        { label: 'Draft',        bg: 'rgba(155,143,255,0.12)', color: '#9B8FFF' },
    under_review: { label: 'Under review', bg: 'rgba(245,168,0,0.12)',   color: '#F5A800' },
    published:    { label: 'Published',    bg: 'rgba(77,210,177,0.12)',  color: '#4DD2B1' },
    removed:      { label: 'Removed',      bg: 'rgba(198,40,40,0.10)',   color: '#C62828' },
  }
  const { label, bg, color } = cfg[status]
  return (
    <span style={{
      fontSize: 10, fontWeight: 700, padding: '2px 8px', borderRadius: 9999,
      background: bg, color,
      fontFamily: 'var(--font-jetbrains-mono)', letterSpacing: '0.08em', textTransform: 'uppercase',
    }}>
      {label}
    </span>
  )
}

// ── Props ─────────────────────────────────────────────────────────────────────

interface Props {
  initialLists: SpotList[]
}

// ── Add-place state ───────────────────────────────────────────────────────────

interface AddPlaceState {
  listId:     string
  mode:       'guide' | 'custom'
  search:     string
  selected:   AttractionOption | null
  customName: string
  note:       string
}

// ── Component ─────────────────────────────────────────────────────────────────

export default function SpotListsPanel({ initialLists }: Props) {
  const [lists,       setLists]       = useState<SpotList[]>(initialLists)
  const [expandedId,  setExpandedId]  = useState<string | null>(null)
  const [showCreate,  setShowCreate]  = useState(false)
  const [createTitle, setCreateTitle] = useState('')
  const [createDesc,  setCreateDesc]  = useState('')
  const [editingId,   setEditingId]   = useState<string | null>(null)
  const [editTitle,   setEditTitle]   = useState('')
  const [editDesc,    setEditDesc]    = useState('')
  const [confirmDel,  setConfirmDel]  = useState<string | null>(null)
  const [addPlace,    setAddPlace]    = useState<AddPlaceState | null>(null)
  const [attractions, setAttractions] = useState<AttractionOption[] | null>(null)
  const [panelError,  setPanelError]  = useState<string | null>(null)
  const [,            startTransition]= useTransition()

  const appUrl = process.env.NEXT_PUBLIC_APP_URL ?? 'https://www.wheninmycity.com'

  // ── Helpers ────────────────────────────────────────────────────────────────

  function updateList(id: string, patch: Partial<SpotList>) {
    setLists(prev => prev.map(l => l.id === id ? { ...l, ...patch } : l))
  }

  function updateListItems(id: string, patchFn: (items: SpotListItem[]) => SpotListItem[]) {
    setLists(prev => prev.map(l => l.id === id ? { ...l, items: patchFn(l.items) } : l))
  }

  async function loadAttractions() {
    if (attractions !== null) return
    const opts = await getAttractionOptions()
    setAttractions(opts)
  }

  // ── Create list ────────────────────────────────────────────────────────────

  function handleCreate() {
    if (!createTitle.trim()) return
    startTransition(async () => {
      const res = await createSpotList({ title: createTitle, description: createDesc || undefined })
      if (!res.success) { setPanelError(res.error); return }
      setLists(prev => [res.list, ...prev])
      setShowCreate(false)
      setCreateTitle('')
      setCreateDesc('')
      setExpandedId(res.list.id)
      setPanelError(null)
    })
  }

  // ── Edit meta ──────────────────────────────────────────────────────────────

  function startEdit(list: SpotList) {
    setEditingId(list.id)
    setEditTitle(list.title)
    setEditDesc(list.description ?? '')
  }

  function handleSaveMeta(listId: string) {
    if (!editTitle.trim()) return
    startTransition(async () => {
      const res = await updateSpotListMeta(listId, { title: editTitle, description: editDesc || undefined })
      if (!res.success) { setPanelError(res.error); return }
      updateList(listId, { title: editTitle.trim(), description: editDesc.trim() || null })
      setEditingId(null)
      setPanelError(null)
    })
  }

  // ── Delete ─────────────────────────────────────────────────────────────────

  function handleDelete(listId: string) {
    startTransition(async () => {
      const res = await deleteSpotList(listId)
      if (!res.success) { setPanelError(res.error); return }
      setLists(prev => prev.filter(l => l.id !== listId))
      if (expandedId === listId) setExpandedId(null)
      setConfirmDel(null)
      setPanelError(null)
    })
  }

  // ── Publish / unpublish ────────────────────────────────────────────────────

  function handlePublish(listId: string) {
    startTransition(async () => {
      const res = await publishSpotList(listId)
      if (!res.success) { setPanelError(res.error); return }
      updateList(listId, {
        status:    res.status,
        is_public: res.status === 'published',
      })
      setPanelError(null)
    })
  }

  function handleUnpublish(listId: string) {
    startTransition(async () => {
      const res = await unpublishSpotList(listId)
      if (!res.success) { setPanelError(res.error); return }
      updateList(listId, { status: 'draft', is_public: false })
      setPanelError(null)
    })
  }

  // ── Add place ──────────────────────────────────────────────────────────────

  function openAddPlace(listId: string) {
    setAddPlace({ listId, mode: 'guide', search: '', selected: null, customName: '', note: '' })
    loadAttractions()
  }

  function handleAddPlace() {
    if (!addPlace) return
    const isGuide  = addPlace.mode === 'guide' && addPlace.selected
    const isCustom = addPlace.mode === 'custom' && addPlace.customName.trim()
    if (!isGuide && !isCustom) return

    const payload = isGuide
      ? {
          attraction_id:  addPlace.selected!.id,
          place_name:     addPlace.selected!.name,
          place_category: addPlace.selected!.category,
          note:           addPlace.note || undefined,
        }
      : {
          place_name: addPlace.customName.trim(),
          note:       addPlace.note || undefined,
        }

    startTransition(async () => {
      const res = await addPlaceToList(addPlace.listId, payload)
      if (!res.success) { setPanelError(res.error); return }
      updateListItems(addPlace.listId, items => [...items, res.item])
      setAddPlace(null)
      setPanelError(null)
    })
  }

  function handleRemovePlace(itemId: string, listId: string) {
    startTransition(async () => {
      const res = await removePlaceFromList(itemId, listId)
      if (!res.success) { setPanelError(res.error); return }
      updateListItems(listId, items => items.filter(i => i.id !== itemId))
      setPanelError(null)
    })
  }

  // ── Shared style fragments ─────────────────────────────────────────────────

  const card: React.CSSProperties = {
    background: 'var(--wimc-bg-elevated)',
    border:     '1px solid var(--wimc-border-default)',
    borderRadius: 12, overflow: 'hidden',
  }

  const sectionLabel: React.CSSProperties = {
    fontSize: 10, fontWeight: 700, letterSpacing: '0.12em', textTransform: 'uppercase',
    color: 'var(--wimc-text-muted)', fontFamily: 'var(--font-jetbrains-mono)',
  }

  const inputStyle: React.CSSProperties = {
    width: '100%', padding: '10px 12px', borderRadius: 8,
    border: '1px solid var(--wimc-border-subtle)',
    background: 'var(--wimc-bg-base)',
    color: 'var(--wimc-text-primary)',
    fontSize: 13, fontFamily: 'var(--font-dm-sans)',
    boxSizing: 'border-box', outline: 'none',
  }

  const ghostBtn = (color = 'var(--wimc-text-secondary)'): React.CSSProperties => ({
    display: 'inline-flex', alignItems: 'center', gap: 4,
    padding: '4px 10px', borderRadius: 6,
    border: '1px solid var(--wimc-border-default)',
    background: 'transparent', color,
    fontSize: 11, fontWeight: 500, cursor: 'pointer',
    fontFamily: 'var(--font-dm-sans)',
  })

  // ── Add-place picker ───────────────────────────────────────────────────────

  const filteredAttractions = attractions?.filter(a =>
    a.name.toLowerCase().includes((addPlace?.search ?? '').toLowerCase()) ||
    a.category.toLowerCase().includes((addPlace?.search ?? '').toLowerCase()),
  ) ?? []

  // ── Render ─────────────────────────────────────────────────────────────────

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>

      {/* ── Global error banner ─────────────────────────────────────────── */}
      {panelError && (
        <div style={{
          padding: '9px 12px', borderRadius: 8,
          background: 'rgba(198,40,40,0.08)',
          border: '1px solid rgba(198,40,40,0.25)',
          fontSize: 12, color: '#EF5350',
          display: 'flex', justifyContent: 'space-between', alignItems: 'center',
        }}>
          {panelError}
          <button
            onClick={() => setPanelError(null)}
            style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#EF5350', fontSize: 14 }}
          >
            ✕
          </button>
        </div>
      )}

      {/* ── Create list form / button ────────────────────────────────────── */}
      {showCreate ? (
        <div style={{ ...card, padding: '14px 16px', display: 'flex', flexDirection: 'column', gap: 10 }}>
          <div style={sectionLabel}>New list</div>
          <input
            type="text"
            placeholder="List title (e.g. Weekend escapes near Ahmedabad)"
            value={createTitle}
            onChange={e => setCreateTitle(e.target.value.slice(0, 100))}
            style={inputStyle}
            autoFocus
          />
          <textarea
            placeholder="Description (optional, max 500 chars)"
            value={createDesc}
            onChange={e => setCreateDesc(e.target.value.slice(0, 500))}
            rows={2}
            style={{ ...inputStyle, resize: 'vertical', lineHeight: 1.5 }}
          />
          <div style={{ display: 'flex', gap: 8, justifyContent: 'flex-end' }}>
            <button onClick={() => setShowCreate(false)} style={ghostBtn()}>Cancel</button>
            <button
              onClick={handleCreate}
              disabled={!createTitle.trim()}
              style={{
                padding: '7px 16px', borderRadius: 8,
                background: createTitle.trim() ? 'var(--wimc-coral)' : 'var(--wimc-bg-overlay)',
                color: createTitle.trim() ? '#fff' : 'var(--wimc-text-muted)',
                fontSize: 12, fontWeight: 700, border: 'none',
                cursor: createTitle.trim() ? 'pointer' : 'not-allowed',
                fontFamily: 'var(--font-syne)',
              }}
            >
              Create list
            </button>
          </div>
        </div>
      ) : (
        <button
          onClick={() => setShowCreate(true)}
          style={{
            display: 'flex', alignItems: 'center', gap: 8,
            padding: '10px 14px', borderRadius: 10,
            border: '1.5px dashed var(--wimc-border-default)',
            background: 'transparent', color: 'var(--wimc-text-secondary)',
            fontSize: 13, fontWeight: 500, cursor: 'pointer',
            fontFamily: 'var(--font-dm-sans)', width: '100%',
          }}
        >
          <span className="material-symbols-outlined" style={{ fontSize: 16 }}>add</span>
          Create a new list
        </button>
      )}

      {/* ── Moderation note ──────────────────────────────────────────────── */}
      {lists.some(l => l.status === 'under_review') && (
        <div style={{
          padding: '9px 12px', borderRadius: 8,
          background: 'rgba(245,168,0,0.08)',
          border: '1px solid rgba(245,168,0,0.2)',
          fontSize: 11, color: '#F5A800',
          fontFamily: 'var(--font-jetbrains-mono)',
        }}>
          ⏳ Lists under review will be published within 48 hours once approved.
        </div>
      )}

      {/* ── No lists empty state ─────────────────────────────────────────── */}
      {lists.length === 0 && !showCreate && (
        <div style={{
          textAlign: 'center', padding: '36px 24px',
          color: 'var(--wimc-text-secondary)', fontSize: 13,
          display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 12,
        }}>
          <span className="material-symbols-outlined" style={{
            fontSize: 32, color: 'var(--wimc-text-muted)',
          }}>
            format_list_bulleted
          </span>
          <span>No lists yet. Share your favourite spots in the city.</span>
          <button
            onClick={() => setShowCreate(true)}
            style={{
              marginTop: 4,
              padding: '8px 20px', borderRadius: 8,
              background: 'var(--wimc-coral)', color: '#fff',
              fontSize: 12, fontWeight: 700, border: 'none', cursor: 'pointer',
              fontFamily: 'var(--font-syne)',
            }}
          >
            Create your first list
          </button>
        </div>
      )}

      {/* ── List cards ───────────────────────────────────────────────────── */}
      {lists.map(list => {
        const isExpanded = expandedId === list.id
        const isEditing  = editingId  === list.id

        return (
          <div key={list.id} style={card}>

            {/* ── Card header ─────────────────────────────────────────── */}
            <div style={{
              padding: '12px 16px',
              borderBottom: isExpanded ? '1px solid var(--wimc-border-subtle)' : 'none',
              display: 'flex', alignItems: 'flex-start', gap: 10,
            }}>
              <div style={{ flex: 1, minWidth: 0 }}>
                {isEditing ? (
                  <div style={{ display: 'flex', flexDirection: 'column', gap: 7 }}>
                    <input
                      type="text"
                      value={editTitle}
                      onChange={e => setEditTitle(e.target.value.slice(0, 100))}
                      style={{ ...inputStyle, fontSize: 14, fontWeight: 600 }}
                      autoFocus
                    />
                    <textarea
                      value={editDesc}
                      onChange={e => setEditDesc(e.target.value.slice(0, 500))}
                      placeholder="Description (optional)"
                      rows={2}
                      style={{ ...inputStyle, resize: 'vertical' }}
                    />
                    <div style={{ display: 'flex', gap: 7 }}>
                      <button onClick={() => setEditingId(null)} style={ghostBtn()}>Cancel</button>
                      <button onClick={() => handleSaveMeta(list.id)} style={ghostBtn('var(--wimc-coral)')}>Save</button>
                    </div>
                  </div>
                ) : (
                  <>
                    <div style={{
                      fontSize: 14, fontWeight: 700, color: 'var(--wimc-text-primary)',
                      fontFamily: 'var(--font-syne)',
                      overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap',
                    }}>
                      {list.title}
                    </div>
                    <div style={{
                      marginTop: 4, display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap',
                    }}>
                      <StatusBadge status={list.status} />
                      <span style={{ fontSize: 11, color: 'var(--wimc-text-muted)', fontFamily: 'var(--font-jetbrains-mono)' }}>
                        {list.items.length} place{list.items.length !== 1 ? 's' : ''}
                      </span>
                    </div>
                  </>
                )}
              </div>

              {/* Card actions */}
              {!isEditing && (
                <div style={{ display: 'flex', gap: 6, flexShrink: 0 }}>
                  <button
                    onClick={() => setExpandedId(isExpanded ? null : list.id)}
                    style={ghostBtn()}
                  >
                    <span className="material-symbols-outlined" style={{ fontSize: 13 }}>
                      {isExpanded ? 'expand_less' : 'expand_more'}
                    </span>
                    {isExpanded ? 'Close' : 'Edit'}
                  </button>
                </div>
              )}
            </div>

            {/* ── Expanded body ────────────────────────────────────────── */}
            {isExpanded && (
              <div style={{ padding: '14px 16px', display: 'flex', flexDirection: 'column', gap: 14 }}>

                {/* ── Items list ────────────────────────────────────── */}
                {list.items.length > 0 && (
                  <div style={{ display: 'flex', flexDirection: 'column', gap: 0 }}>
                    <div style={{ ...sectionLabel, marginBottom: 8 }}>Places in this list</div>
                    {list.items.map((item, idx) => (
                      <div
                        key={item.id}
                        style={{
                          display: 'flex', alignItems: 'flex-start', gap: 10,
                          padding: '9px 0',
                          borderBottom: idx < list.items.length - 1
                            ? '1px solid var(--wimc-border-subtle)' : 'none',
                        }}
                      >
                        <span style={{ fontSize: 18, flexShrink: 0, marginTop: 1 }}>
                          {item.place_category ? (CAT_EMOJI[item.place_category] ?? '📍') : '📍'}
                        </span>
                        <div style={{ flex: 1, minWidth: 0 }}>
                          <div style={{
                            fontSize: 13, fontWeight: 600, color: 'var(--wimc-text-primary)',
                            overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap',
                          }}>
                            {item.place_name}
                          </div>
                          {item.note && (
                            <div style={{
                              fontSize: 11, color: 'var(--wimc-text-secondary)',
                              marginTop: 2, lineHeight: 1.5,
                            }}>
                              {item.note}
                            </div>
                          )}
                        </div>
                        <button
                          onClick={() => handleRemovePlace(item.id, list.id)}
                          style={{
                            flexShrink: 0, background: 'none',
                            border: '1px solid var(--wimc-border-subtle)',
                            color: 'var(--wimc-text-muted)', fontSize: 13,
                            cursor: 'pointer', padding: '2px 6px', borderRadius: 4,
                          }}
                          aria-label="Remove place"
                        >
                          ✕
                        </button>
                      </div>
                    ))}
                  </div>
                )}

                {/* ── Add place ─────────────────────────────────────── */}
                {addPlace?.listId === list.id ? (
                  <div style={{
                    background: 'var(--wimc-bg-base)',
                    border: '1px solid var(--wimc-border-subtle)',
                    borderRadius: 10, padding: '12px 14px',
                    display: 'flex', flexDirection: 'column', gap: 10,
                  }}>
                    <div style={{ ...sectionLabel }}>Add a place</div>

                    {/* Mode toggle */}
                    <div style={{ display: 'flex', gap: 6 }}>
                      {(['guide', 'custom'] as const).map(mode => (
                        <button
                          key={mode}
                          onClick={() => setAddPlace(p => p ? { ...p, mode, selected: null } : null)}
                          style={{
                            padding: '4px 12px', borderRadius: 9999, fontSize: 11, fontWeight: 600,
                            border: `1.5px solid ${addPlace.mode === mode ? 'var(--wimc-coral)' : 'var(--wimc-border-default)'}`,
                            background: addPlace.mode === mode ? 'rgba(232,87,42,0.1)' : 'transparent',
                            color: addPlace.mode === mode ? 'var(--wimc-coral)' : 'var(--wimc-text-secondary)',
                            cursor: 'pointer', fontFamily: 'var(--font-dm-sans)',
                          }}
                        >
                          {mode === 'guide' ? '🗺 City guide' : '✏️ Custom'}
                        </button>
                      ))}
                    </div>

                    {addPlace.mode === 'guide' && (
                      <>
                        <input
                          type="text"
                          placeholder="Search places…"
                          value={addPlace.search}
                          onChange={e => setAddPlace(p => p ? { ...p, search: e.target.value } : null)}
                          style={inputStyle}
                        />
                        {attractions === null ? (
                          <div style={{ fontSize: 12, color: 'var(--wimc-text-muted)', padding: '8px 0' }}>
                            Loading…
                          </div>
                        ) : (
                          <div style={{
                            maxHeight: 200, overflowY: 'auto',
                            display: 'flex', flexDirection: 'column', gap: 2,
                          }}>
                            {filteredAttractions.map(a => (
                              <button
                                key={a.id}
                                onClick={() => setAddPlace(p => p ? { ...p, selected: a } : null)}
                                style={{
                                  display: 'flex', alignItems: 'center', gap: 8,
                                  padding: '7px 10px', borderRadius: 7,
                                  border: `1.5px solid ${addPlace.selected?.id === a.id ? 'var(--wimc-coral)' : 'transparent'}`,
                                  background: addPlace.selected?.id === a.id
                                    ? 'rgba(232,87,42,0.08)'
                                    : 'var(--wimc-bg-elevated)',
                                  cursor: 'pointer', textAlign: 'left',
                                }}
                              >
                                <span style={{ fontSize: 16, flexShrink: 0 }}>
                                  {CAT_EMOJI[a.category] ?? '📍'}
                                </span>
                                <div style={{ flex: 1, minWidth: 0 }}>
                                  <div style={{
                                    fontSize: 12, fontWeight: 600, color: 'var(--wimc-text-primary)',
                                    overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap',
                                  }}>
                                    {a.name}
                                  </div>
                                  {a.address && (
                                    <div style={{ fontSize: 10, color: 'var(--wimc-text-muted)', marginTop: 1 }}>
                                      {a.address}
                                    </div>
                                  )}
                                </div>
                              </button>
                            ))}
                            {filteredAttractions.length === 0 && (
                              <div style={{ fontSize: 12, color: 'var(--wimc-text-muted)', padding: '6px 0' }}>
                                No matches. Try "custom" to add any place.
                              </div>
                            )}
                          </div>
                        )}
                      </>
                    )}

                    {addPlace.mode === 'custom' && (
                      <input
                        type="text"
                        placeholder="Place name (e.g. Gujarat Science City café)"
                        value={addPlace.customName}
                        onChange={e => setAddPlace(p => p ? { ...p, customName: e.target.value.slice(0, 100) } : null)}
                        style={inputStyle}
                        autoFocus
                      />
                    )}

                    {/* Note (optional) */}
                    <input
                      type="text"
                      placeholder="Your note about this place (optional, max 200 chars)"
                      value={addPlace.note}
                      onChange={e => setAddPlace(p => p ? { ...p, note: e.target.value.slice(0, 200) } : null)}
                      style={inputStyle}
                    />

                    <div style={{ display: 'flex', gap: 8 }}>
                      <button onClick={() => setAddPlace(null)} style={ghostBtn()}>Cancel</button>
                      <button
                        onClick={handleAddPlace}
                        disabled={
                          addPlace.mode === 'guide'
                            ? !addPlace.selected
                            : !addPlace.customName.trim()
                        }
                        style={{
                          padding: '7px 16px', borderRadius: 8,
                          background: 'var(--wimc-coral)', color: '#fff',
                          fontSize: 12, fontWeight: 700, border: 'none', cursor: 'pointer',
                          fontFamily: 'var(--font-syne)',
                          opacity: (addPlace.mode === 'guide' ? !addPlace.selected : !addPlace.customName.trim()) ? 0.4 : 1,
                        }}
                      >
                        Add to list
                      </button>
                    </div>
                  </div>
                ) : (
                  <button
                    onClick={() => openAddPlace(list.id)}
                    style={ghostBtn()}
                  >
                    <span className="material-symbols-outlined" style={{ fontSize: 14 }}>add_location</span>
                    Add a place
                  </button>
                )}

                {/* ── List actions ──────────────────────────────────── */}
                <div style={{
                  borderTop: '1px solid var(--wimc-border-subtle)', paddingTop: 12,
                  display: 'flex', flexWrap: 'wrap', gap: 8, alignItems: 'center',
                }}>

                  {/* Edit title */}
                  <button onClick={() => startEdit(list)} style={ghostBtn()}>
                    <span className="material-symbols-outlined" style={{ fontSize: 13 }}>edit</span>
                    Edit title
                  </button>

                  {/* Publish / submit / unpublish */}
                  {(list.status === 'draft') && (
                    <button
                      onClick={() => handlePublish(list.id)}
                      style={ghostBtn('var(--wimc-teal)')}
                    >
                      <span className="material-symbols-outlined" style={{ fontSize: 13 }}>publish</span>
                      Publish list
                    </button>
                  )}
                  {list.status === 'published' && (
                    <button onClick={() => handleUnpublish(list.id)} style={ghostBtn()}>
                      <span className="material-symbols-outlined" style={{ fontSize: 13 }}>unpublished</span>
                      Unpublish
                    </button>
                  )}
                  {list.status === 'under_review' && (
                    <button onClick={() => handleUnpublish(list.id)} style={ghostBtn('#F5A800')}>
                      <span className="material-symbols-outlined" style={{ fontSize: 13 }}>cancel</span>
                      Cancel review
                    </button>
                  )}

                  {/* Share link (published only) */}
                  {list.status === 'published' && (
                    <button
                      onClick={() => {
                        const url = `${appUrl}/explore/lists/${list.slug}`
                        navigator.clipboard?.writeText(url).catch(() => {})
                      }}
                      style={ghostBtn('#4DD2B1')}
                    >
                      <span className="material-symbols-outlined" style={{ fontSize: 13 }}>link</span>
                      Copy link
                    </button>
                  )}

                  {/* Delete */}
                  <div style={{ marginLeft: 'auto' }}>
                    {confirmDel === list.id ? (
                      <div style={{ display: 'flex', gap: 6, alignItems: 'center' }}>
                        <span style={{ fontSize: 11, color: 'var(--wimc-text-muted)' }}>Delete?</span>
                        <button onClick={() => handleDelete(list.id)} style={ghostBtn('#C62828')}>Yes</button>
                        <button onClick={() => setConfirmDel(null)} style={ghostBtn()}>No</button>
                      </div>
                    ) : (
                      <button
                        onClick={() => setConfirmDel(list.id)}
                        style={ghostBtn('var(--wimc-text-muted)')}
                      >
                        <span className="material-symbols-outlined" style={{ fontSize: 13 }}>delete</span>
                        Delete
                      </button>
                    )}
                  </div>

                </div>

              </div>
            )}

          </div>
        )
      })}

      {/* ── Scope note (always visible) ──────────────────────────────────── */}
      {lists.length > 0 && (
        <div style={{
          fontSize: 11, color: 'var(--wimc-text-muted)', lineHeight: 1.6,
          fontFamily: 'var(--font-jetbrains-mono)', paddingTop: 4,
        }}>
          Lists are about places only — no reviews of individuals are permitted.
          Reported lists are reviewed by the WIMC team within 48 hours.
        </div>
      )}

    </div>
  )
}
