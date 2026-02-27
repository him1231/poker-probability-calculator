import React, { useEffect, useRef } from 'react'

declare global { interface Window { initMap: any } }

export default function MapView({ trip }: { trip: any }) {
  const ref = useRef<HTMLDivElement | null>(null)

  useEffect(() => {
    const load = async () => {
      if (!window.google) {
        const key = (import.meta.env.VITE_GOOGLE_MAPS_API_KEY || (window as any).REACT_APP_GOOGLE_MAPS_API_KEY)
        const script = document.createElement('script')
        script.src = `https://maps.googleapis.com/maps/api/js?key=${key}`
        script.async = true
        document.head.appendChild(script)
        await new Promise((res) => (script.onload = res))
      }
      if (ref.current) {
        const map = new (window as any).google.maps.Map(ref.current, { center: { lat: 40.7128, lng: -74.0060 }, zoom: 12 })
        // sample markers: try reading trip.days if exists
        // placeholder: create a couple of markers from sample coordinates if available
        const markers = [
          { title: 'Sample POI 1', lat: 40.758, lng: -73.9855, status: 'confirmed' },
          { title: 'Sample Suggestion', lat: 40.7295, lng: -73.9965, status: 'suggested' }
        ]
        for (const m of markers) {
          const marker = new (window as any).google.maps.Marker({ position: { lat: m.lat, lng: m.lng }, map, title: m.title })
          if (m.status === 'suggested') {
            marker.setIcon('http://maps.google.com/mapfiles/ms/icons/blue-dot.png')
          }
        }
      }
    }
    load()
  }, [trip])

  return <div ref={ref} style={{width: '100%', height: '100%'}} />
}
