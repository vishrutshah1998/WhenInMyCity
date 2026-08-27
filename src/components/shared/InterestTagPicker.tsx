'use client'

import { useMemo } from 'react'
import { INTEREST_TAGS, type InterestTag } from '@/lib/constants/interests'

export function groupTagsByCategory(): Record<string, InterestTag[]> {
  return INTEREST_TAGS.reduce<Record<string, InterestTag[]>>((acc, tag) => {
    if (!acc[tag.category]) acc[tag.category] = []
    acc[tag.category].push(tag)
    return acc
  }, {})
}

export interface InterestPickerCategory {
  key:   string
  label: string
  icon?: string
}

export interface InterestTagPickerProps {
  selected: string[]
  onToggle: (id: string) => void
  categories: InterestPickerCategory[]
  /** Accordion mode (default) shows only open categories; non-collapsible always renders every category expanded. */
  collapsible?: boolean
  openCategories?: Set<string>
  onToggleCategory?: (key: string) => void
  /** Full control over each category's header row — count/isOpen/toggle are supplied, markup stays with the caller. */
  renderCategoryHeader: (opts: {
    category: InterestPickerCategory
    isOpen: boolean
    count: number
    toggle: () => void
  }) => React.ReactNode
  /** Per-chip inline style, computed from the tag and its selected state. */
  chipStyle: (tag: InterestTag, isSelected: boolean) => React.CSSProperties
  /** Defaults to "{emoji} {label}". */
  chipContent?: (tag: InterestTag) => React.ReactNode
  sectionWrapperStyle?: (opts: { category: InterestPickerCategory; isOpen: boolean; count: number }) => React.CSSProperties
  chipsRowStyle?: React.CSSProperties
  wrapperStyle?: React.CSSProperties
}

/**
 * Shared category-grouped tag picker used by every interest-selection surface
 * (Creator + Explorer onboarding, dashboard settings/studio). Owns tag
 * grouping, category iteration, and selection wiring; callers own all visual
 * styling via the render/style props so each screen's existing look is
 * preserved rather than forced into one shared visual design.
 */
export default function InterestTagPicker({
  selected,
  onToggle,
  categories,
  collapsible = true,
  openCategories,
  onToggleCategory,
  renderCategoryHeader,
  chipStyle,
  chipContent,
  sectionWrapperStyle,
  chipsRowStyle,
  wrapperStyle,
}: InterestTagPickerProps) {
  const grouped = useMemo(groupTagsByCategory, [])

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 8, ...wrapperStyle }}>
      {categories.filter(cat => grouped[cat.key]).map(cat => {
        const tags  = grouped[cat.key]
        const count = tags.filter(t => selected.includes(t.id)).length
        const isOpen = collapsible ? (openCategories?.has(cat.key) ?? false) : true

        return (
          <div key={cat.key} style={sectionWrapperStyle?.({ category: cat, isOpen, count })}>
            {renderCategoryHeader({
              category: cat,
              isOpen,
              count,
              toggle: () => onToggleCategory?.(cat.key),
            })}

            {isOpen && (
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8, ...chipsRowStyle }}>
                {tags.map(tag => {
                  const isSel = selected.includes(tag.id)
                  return (
                    <button
                      key={tag.id}
                      type="button"
                      onClick={() => onToggle(tag.id)}
                      style={chipStyle(tag, isSel)}
                    >
                      {chipContent ? chipContent(tag) : <><span>{tag.emoji}</span>{tag.label}</>}
                    </button>
                  )
                })}
              </div>
            )}
          </div>
        )
      })}
    </div>
  )
}
