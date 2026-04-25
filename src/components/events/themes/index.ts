import React from 'react'
import { MinimalTheme, MinimalSwatch } from './MinimalTheme'
import { BauhausTheme, BauhausSwatch } from './BauhausTheme'
import { BloomTheme, BloomSwatch } from './BloomTheme'
import { DuskTheme, DuskSwatch } from './DuskTheme'
import { CityTheme, CitySwatch } from './CityTheme'

export interface Theme {
  id: string
  name: string
  swatch: React.CSSProperties
  Cover: React.FC
}

export const THEMES: Theme[] = [
  { id: 'minimal', name: 'Minimal', swatch: MinimalSwatch, Cover: MinimalTheme },
  { id: 'bauhaus', name: 'Bauhaus', swatch: BauhausSwatch, Cover: BauhausTheme },
  { id: 'bloom',   name: 'Bloom',   swatch: BloomSwatch,   Cover: BloomTheme   },
  { id: 'dusk',    name: 'Dusk',    swatch: DuskSwatch,    Cover: DuskTheme    },
  { id: 'city',    name: 'City',    swatch: CitySwatch,    Cover: CityTheme    },
]

export function getTheme(id: string): Theme {
  return THEMES.find((t) => t.id === id) ?? THEMES[0]
}
