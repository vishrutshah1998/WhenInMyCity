'use client'

import { useEffect, useRef } from 'react'
import { MapContainer, TileLayer, Marker, Popup, AttributionControl } from 'react-leaflet'
import type { Map as LeafletMap } from 'leaflet'
import L from 'leaflet'
import 'leaflet/dist/leaflet.css'
import type { CityAttraction } from '@/app/actions/cityGuide'

// OSM-sourced POI — coordinates come from OpenStreetMap and may safely be
// rendered on this OSM/Leaflet map.  Do NOT populate with Google Places
// coordinates; use /api/city/places/nearby (list-only) for Places data.
export type CivicPOI = {
  id:    string   // "osm-node-XXXXXXXX" | "osm-way-XXXXXXXX"
  name:  string | null
  lat:   number
  lng:   number
  layer: ActiveLayer
}

export type ActiveLayer = 'toilet' | 'hospital' | 'police' | 'petrol'

// ── Icon factories ────────────────────────────────────────────────────────────

const CATEGORY_ICONS: Record<string, { emoji: string; color: string }> = {
  heritage:   { emoji: '🏛', color: '#E8A838' },
  park:       { emoji: '🌳', color: '#4CAF50' },
  market:     { emoji: '🛍', color: '#E8705A' },
  food:       { emoji: '🍽', color: '#FF7043' },
  temple:     { emoji: '🛕', color: '#9C27B0' },
  nature:     { emoji: '🌿', color: '#2E7D32' },
  arts:       { emoji: '🎨', color: '#1976D2' },
  shopping:   { emoji: '🏬', color: '#0288D1' },
  attraction: { emoji: '⭐', color: '#F5A800' },
}

const LAYER_ICONS: Record<ActiveLayer, { emoji: string; color: string }> = {
  toilet:   { emoji: '🚻', color: '#5DD9D0' },
  hospital: { emoji: '🏥', color: '#EF5350' },
  police:   { emoji: '🚔', color: '#1565C0' },
  petrol:   { emoji: '⛽', color: '#FB8C00' },
}

function makePinIcon(emoji: string, color: string, size = 34) {
  const half = size / 2
  return L.divIcon({
    className: '',
    html: `<div style="
      position:relative; width:${size}px; height:${size + 8}px;
    ">
      <div style="
        width:${size}px; height:${size}px; border-radius:50% 50% 50% 0;
        transform:rotate(-45deg); background:${color};
        border:2px solid rgba(255,255,255,0.9);
        box-shadow:0 2px 8px rgba(0,0,0,0.35);
      "></div>
      <div style="
        position:absolute; top:0; left:0;
        width:${size}px; height:${size}px;
        display:flex; align-items:center; justify-content:center;
        font-size:${half - 2}px; line-height:1;
      ">${emoji}</div>
    </div>`,
    iconSize:    [size, size + 8],
    iconAnchor:  [half, size + 8],
    popupAnchor: [0, -(size + 8)],
  })
}

// ── Props ─────────────────────────────────────────────────────────────────────

interface Props {
  attractions:   CityAttraction[]
  civicPOIs:     CivicPOI[]
  activeLayers:  ActiveLayer[]
  showAttractions: boolean
  onAttractionClick?: (a: CityAttraction) => void
  mapStyle?: React.CSSProperties
}

// ── Component ─────────────────────────────────────────────────────────────────

const AHM_CENTRE: [number, number] = [23.0225, 72.5714]

export default function CityMap({
  attractions,
  civicPOIs,
  activeLayers,
  showAttractions,
  onAttractionClick,
  mapStyle,
}: Props) {
  const mapRef = useRef<LeafletMap | null>(null)

  // Suppress the "delete _getIconUrl" workaround that breaks SSR checks
  useEffect(() => {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    delete (L.Icon.Default.prototype as any)._getIconUrl
    L.Icon.Default.mergeOptions({
      iconUrl:       'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon.png',
      iconRetinaUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon-2x.png',
      shadowUrl:     'https://unpkg.com/leaflet@1.9.4/dist/images/marker-shadow.png',
    })
  }, [])

  return (
    <div style={{ position: 'relative', width: '100%' }}>
      <MapContainer
        center={AHM_CENTRE}
        zoom={12}
        style={{ height: 380, width: '100%', borderRadius: 12, zIndex: 0, ...mapStyle }}
        attributionControl={false}
        ref={mapRef}
      >
        <TileLayer
          url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
          attribution="&copy; <a href='https://www.openstreetmap.org/copyright'>OpenStreetMap contributors</a>"
        />
        <AttributionControl position="bottomright" prefix={false} />

        {/* Attraction pins */}
        {showAttractions && attractions.map(a => {
          const meta = CATEGORY_ICONS[a.category] ?? { emoji: '📍', color: '#9B8FFF' }
          return (
            <Marker
              key={a.id}
              position={[a.lat, a.lng]}
              icon={makePinIcon(meta.emoji, meta.color)}
              eventHandlers={{ click: () => onAttractionClick?.(a) }}
            >
              <Popup>
                <strong style={{ fontSize: 13 }}>{a.name}</strong>
                {a.description && (
                  <p style={{ fontSize: 12, margin: '4px 0 0', color: '#555' }}>{a.description}</p>
                )}
                {a.address && (
                  <p style={{ fontSize: 11, margin: '3px 0 0', color: '#888' }}>{a.address}</p>
                )}
              </Popup>
            </Marker>
          )
        })}

        {/* Civic POI pins — OSM/Overpass data only, safe on this OSM tile layer */}
        {civicPOIs.map(poi => {
          const meta = LAYER_ICONS[poi.layer] ?? { emoji: '📍', color: '#9B8FFF' }
          const directionsHref = `https://www.google.com/maps/dir/?api=1&destination=${poi.lat},${poi.lng}`
          return (
            <Marker
              key={poi.id}
              position={[poi.lat, poi.lng]}
              icon={makePinIcon(meta.emoji, meta.color, 30)}
            >
              <Popup>
                <strong style={{ fontSize: 13 }}>{poi.name ?? 'Unnamed'}</strong>
                <div style={{ marginTop: 6 }}>
                  <a
                    href={directionsHref}
                    target="_blank"
                    rel="noopener noreferrer"
                    style={{ fontSize: 12, color: '#1976D2' }}
                  >
                    Get Directions ↗
                  </a>
                </div>
              </Popup>
            </Marker>
          )
        })}
      </MapContainer>

      {/* OSM attribution overlay */}
      <div style={{
        position: 'absolute', bottom: 6, left: 8, zIndex: 1000,
        fontSize: 10, color: 'rgba(0,0,0,0.6)',
        background: 'rgba(255,255,255,0.75)', padding: '1px 4px', borderRadius: 3,
      }}>
        © <a href="https://www.openstreetmap.org/copyright" target="_blank" rel="noopener noreferrer" style={{ color: 'inherit' }}>
          OpenStreetMap contributors
        </a>
      </div>

    </div>
  )
}
