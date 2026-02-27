import React from 'react';

type Item = {
  id: string;
  title: string;
  startTime?: string; // ISO or hh:mm — sample-data may vary
  status?: 'suggested' | 'confirmed' | string;
  placeId?: string;
  photos?: string[];
};

type Day = {
  id: string;
  date?: string;
  items: Item[];
};

export default function Timeline({days}:{days:Day[]}){
  return (
    <div>
      {days.map(day => (
        <div key={day.id} style={{marginBottom: 24}}>
          <h2 style={{marginBottom: 8}}>{day.date || `Day ${day.id}`}</h2>
          <div style={{borderLeft: '2px solid #eee', paddingLeft: 12}}>
            {day.items.map(item => (
              <div key={item.id} style={{display: 'flex', alignItems: 'center', marginBottom: 12}}>
                <div style={{width: 12, height: 12, borderRadius: 6, background: item.status === 'confirmed' ? '#2ecc71' : '#f39c12', marginRight: 12}} />
                <div style={{flex: 1}}>
                  <div style={{display: 'flex', alignItems: 'baseline', justifyContent: 'space-between'}}>
                    <div>
                      <strong>{item.title}</strong>
                      <div style={{color: '#666', fontSize: 12}}>{item.startTime || ''}{item.placeId ? ` — place:${item.placeId}` : ''}</div>
                    </div>
                    <div style={{display: 'flex', gap: 8}}>
                      {item.status === 'suggested' && (
                        <>
                          <button style={{padding: '6px 10px', background:'#2ecc71', color:'#fff', border:'none', borderRadius:4}}>Accept</button>
                          <button style={{padding: '6px 10px', background:'#e74c3c', color:'#fff', border:'none', borderRadius:4}}>Reject</button>
                        </>
                      )}
                      {item.status === 'confirmed' && (
                        <span style={{padding: '6px 10px', background:'#ecf9f1', color:'#2ecc71', borderRadius:4}}>Confirmed</span>
                      )}
                      {item.status && item.status !== 'suggested' && item.status !== 'confirmed' && (
                        <span style={{padding: '6px 10px', background:'#f0f0f0', borderRadius:4}}>{item.status}</span>
                      )}
                    </div>
                  </div>
                  {item.photos && item.photos.length > 0 && (
                    <div style={{marginTop:8, display:'flex', gap:8}}>
                      {item.photos.slice(0,3).map((p,idx)=>(
                        <img key={idx} src={p} alt="photo" style={{width:72, height:48, objectFit:'cover', borderRadius:4, border:'1px solid #ddd'}} />
                      ))}
                    </div>
                  )}
                </div>
              </div>
            ))}
          </div>
        </div>
      ))}
    </div>
  );
}
