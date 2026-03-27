'use client'

import { useState, useEffect, useRef } from 'react'
import dynamic from 'next/dynamic'
import { MapPin, ExternalLink, CheckCircle } from 'lucide-react'
import { getApproxLocation } from '@/utils/getApproxLocation'
import 'mapbox-gl/dist/mapbox-gl.css'

// Mapbox GL JS is heavy, load it dynamically
const Map = dynamic(() => import('react-map-gl/mapbox').then(mod => mod.Map), { 
  ssr: false,
  loading: () => <div className="w-full h-full bg-gray-100 animate-pulse flex items-center justify-center"><MapPin className="text-gray-300 w-8 h-8" /></div>
}) as any

const Source = dynamic(() => import('react-map-gl/mapbox').then(mod => mod.Source), { ssr: false }) as any
const Layer = dynamic(() => import('react-map-gl/mapbox').then(mod => mod.Layer), { ssr: false }) as any
const Marker = dynamic(() => import('react-map-gl/mapbox').then(mod => mod.Marker), { ssr: false }) as any

interface PropertyMapProps {
  lat: number
  lng: number
  isConfirmed: boolean
  pincode?: string
  areaName?: string
  city?: string
}

const MAPBOX_TOKEN = process.env.NEXT_PUBLIC_MAPBOX_ACCESS_TOKEN || ''

export default function PropertyMap({ lat, lng, isConfirmed, pincode, areaName, city }: PropertyMapProps) {
  const [isInteractive, setIsInteractive] = useState(false)
  const [approxCoord, setApproxCoord] = useState<{ lat: number; lng: number } | null>(null)

  useEffect(() => {
    // Generate approx coordinates once on mount if not confirmed
    if (!isConfirmed && !approxCoord) {
      setApproxCoord(getApproxLocation(lat, lng))
    }
  }, [lat, lng, isConfirmed])

  const mapLat = isConfirmed ? lat : approxCoord?.lat || lat
  const mapLng = isConfirmed ? lng : approxCoord?.lng || lng

  // Static Map URL
  // For approximate, we don't show a marker in static view, just the area
  // We'll use a slightly zoomed out static map
  const staticMapUrl = `https://api.mapbox.com/styles/v1/mapbox/light-v10/static/${mapLng},${mapLat},13,0/600x300?access_token=${MAPBOX_TOKEN}`

  if (!lat || !lng) return null

  return (
    <div className="flex flex-col gap-2">
      <div 
        className="relative rounded-2xl overflow-hidden border border-gray-100 shadow-sm transition-all duration-500 cursor-pointer"
        style={{ height: 280 }}
        onClick={() => !isInteractive && setIsInteractive(true)}
      >
        {!isInteractive ? (
          <>
            {/* Static View */}
            <img 
              src={staticMapUrl} 
              alt="Location map" 
              className="w-full h-full object-cover"
            />
            
            {/* Overlay if not confirmed */}
            {!isConfirmed && (
              <div className="absolute inset-0 flex flex-col items-center justify-center gap-3 p-4"
                style={{ background: 'rgba(255,255,255,0.15)', backdropFilter: 'blur(4px)' }}>
                <div className="bg-white/95 rounded-2xl px-6 py-5 shadow-2xl text-center border border-gray-100 max-w-xs transition-transform hover:scale-105 duration-300">
                  <div className="text-3xl mb-2">📍</div>
                  <p className="font-bold text-gray-900 text-sm">Approximate location</p>
                  <p className="text-xs text-gray-500 mt-1.5 leading-relaxed">
                    Exact address & precise location will be shared automatically after booking confirmation.
                  </p>
                </div>
              </div>
            )}

            {/* Hint to interact */}
            <div className="absolute bottom-3 left-3 bg-black/50 backdrop-blur-sm text-white px-2 py-1 rounded text-[10px] font-bold uppercase tracking-wider opacity-0 group-hover:opacity-100 transition-opacity">
              Click to interact
            </div>
          </>
        ) : (
          /* Interactive View */
          <Map
            initialViewState={{
              latitude: mapLat,
              longitude: mapLng,
              zoom: 14
            }}
            style={{ width: '100%', height: '100%' }}
            mapStyle="mapbox://styles/mapbox/light-v10"
            mapboxAccessToken={MAPBOX_TOKEN}
          >
            {isConfirmed ? (
              // Exact Marker
              <Marker latitude={lat} longitude={lng} color="#ef4444" />
            ) : (
              // Approximate Circle
              <Source id="approx-area" type="geojson" data={{
                type: 'Feature',
                geometry: {
                  type: 'Point',
                  coordinates: [mapLng, mapLat]
                },
                properties: {}
              }}>
                <Layer
                  id="circle-fill"
                  type="circle"
                  paint={{
                    'circle-radius': {
                      stops: [[5, 2], [10, 20], [15, 60]] // Dynamic radius based on zoom
                    },
                    'circle-color': '#3b82f6',
                    'circle-opacity': 0.3,
                    'circle-stroke-width': 1,
                    'circle-stroke-color': '#2563eb'
                  }}
                />
              </Source>
            )}
          </Map>
        )}

        {/* Confirmed Indicator or Open in Maps */}
        {isConfirmed && (
          <div className="absolute top-4 right-4 flex flex-col gap-2">
            <a
              href={`https://www.google.com/maps/search/?api=1&query=${lat},${lng}`}
              target="_blank"
              rel="noopener noreferrer"
              className="bg-white/95 hover:bg-white text-blue-600 text-sm font-bold px-4 py-2 rounded-full shadow-lg border border-blue-100 flex items-center gap-2 transition-all active:scale-95"
              onClick={(e) => e.stopPropagation()}
            >
              <ExternalLink className="w-4 h-4" /> Open in Google Maps
            </a>
          </div>
        )}
      </div>

      {/* Messaging */}
      {!isConfirmed && (
        <div className="flex flex-col gap-1.5 px-1">
          <div className="flex items-center gap-2 text-xs text-gray-500">
            <CheckCircle className="w-3.5 h-3.5 text-green-500 flex-shrink-0" />
            Precise address shared automatically after booking confirmation.
          </div>
        </div>
      )}
    </div>
  )
}
