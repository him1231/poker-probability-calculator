import React from 'react';
import Timeline from './components/Timeline';
import sampleData from './sample-data.json';

function App() {
  // For this demo we pick a tripId if present, otherwise take first
  const tripId = Object.keys(sampleData.trips || {})[0];
  const days = tripId ? (sampleData.trips[tripId].days || []) : [];

  return (
    <div style={{fontFamily: 'Arial, sans-serif', padding: 24}}>
      <h1>Trip Timeline (demo)</h1>
      {days.length === 0 ? (
        <p>No days found in sample data.</p>
      ) : (
        <Timeline days={days} />
      )}
    </div>
  );
}

export default App;
