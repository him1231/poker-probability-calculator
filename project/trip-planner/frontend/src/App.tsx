import React, { useEffect, useState } from 'react'
import MapView from './Map'

// sample in-memory trip (used if Firestore not configured)
import sampleTrip from '../../sample-data/trip-sample.json'

export default function App() {
  const [trip, setTrip] = useState<any>(sampleTrip)

  useEffect(() => {
    // TODO: initialize Firebase and load trip from Firestore when configured
  }, [])

  return (
    <div style={{display: 'flex', height: '100vh'}}>
      <div style={{width: '35%', padding: 12, borderRight: '1px solid #eee', overflow: 'auto'}}>
        <h2>{trip.title}</h2>
        <div>
          <h3>Timeline (sample)</h3>
          <div>Use the timeline component here. Suggested items should be highlighted (status: suggested)</div>
        </div>
      </div>
      <div style={{flex: 1}}>
        <MapView trip={trip} />
      </div>
    </div>
  )
}
