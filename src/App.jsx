import { useState } from 'react'
import './App.css'

const SUITS = ['♠', '♥', '♦', '♣']
const RANKS = ['A','2','3','4','5','6','7','8','9','10','J','Q','K']

function makeDeck(){
  const deck = []
  for(const s of SUITS){
    for(const r of RANKS){
      deck.push({code: r + s, rank: r, suit: s})
    }
  }
  return deck
}

function CardButton({card, onClick, selected}){
  return (
    <button className={`card ${selected ? 'selected' : ''}`} onClick={() => onClick(card)}>
      <span className="rank">{card.rank}</span>
      <span className="suit">{card.suit}</span>
    </button>
  )
}

export default function App(){
  const deck = makeDeck()
  const [selectedPool, setSelectedPool] = useState([]) // temporary selected before placing

  // board state
  const [hole1, setHole1] = useState([null, null])
  const [hole2, setHole2] = useState([null, null])
  const [community, setCommunity] = useState([null, null, null, null, null])

  // active target: 'hole1','hole2','community' with index
  const [target, setTarget] = useState({area: 'hole1', index: 0})

  function togglePool(card){
    setSelectedPool(prev => {
      const exists = prev.find(c => c.code === card.code)
      if(exists) return prev.filter(c => c.code !== card.code)
      if(prev.length >= 10) return prev
      return [...prev, card]
    })
  }

  function placeCard(card){
    // prevent placing a card that's already used on board
    if(isCardUsed(card)) return

    if(target.area === 'hole1'){
      setHole1(h => {
        const copy = [...h]
        copy[target.index] = card
        return copy
      })
    } else if(target.area === 'hole2'){
      setHole2(h => {
        const copy = [...h]
        copy[target.index] = card
        return copy
      })
    } else if(target.area === 'community'){
      setCommunity(c => {
        const copy = [...c]
        copy[target.index] = card
        return copy
      })
    }
  }

  function isCardUsed(card){
    const used = [...hole1, ...hole2, ...community].filter(Boolean)
    return used.find(c => c.code === card.code)
  }

  function removeFromSlot(area, idx){
    if(area === 'hole1') setHole1(h => { const c=[...h]; c[idx]=null; return c })
    if(area === 'hole2') setHole2(h => { const c=[...h]; c[idx]=null; return c })
    if(area === 'community') setCommunity(c => { const cc=[...c]; cc[idx]=null; return cc })
  }

  function clearAll(){
    setHole1([null,null]); setHole2([null,null]); setCommunity([null,null,null,null,null]);
  }

  return (
    <div className="app">
      <header>
        <h1>Poker Probability — Card Picker</h1>
        <p>Click a board slot to make it active, then click a card to place it. Used cards are disabled.</p>
      </header>

      <section className="board">
        <div className="players">
          <div className={`player ${target.area==='hole1' ? 'active' : ''}`} onClick={() => setTarget({area: 'hole1', index: 0})}>
            <h3>Player 1</h3>
            <div className="slot-row">
              {hole1.map((c, i) => (
                <div key={i} className={`slot ${target.area==='hole1' && target.index===i ? 'active-slot' : ''}`} onClick={() => setTarget({area:'hole1', index:i})}>
                  {c ? (
                    <>
                      <span>{c.code}</span>
                      <button className="remove" onClick={(e) => { e.stopPropagation(); removeFromSlot('hole1', i) }}>×</button>
                    </>
                  ) : <span className="empty">—</span>}
                </div>
              ))}
            </div>
          </div>

          <div className={`player ${target.area==='hole2' ? 'active' : ''}`} onClick={() => setTarget({area: 'hole2', index: 0})}>
            <h3>Player 2</h3>
            <div className="slot-row">
              {hole2.map((c, i) => (
                <div key={i} className={`slot ${target.area==='hole2' && target.index===i ? 'active-slot' : ''}`} onClick={() => setTarget({area:'hole2', index:i})}>
                  {c ? (
                    <>
                      <span>{c.code}</span>
                      <button className="remove" onClick={(e) => { e.stopPropagation(); removeFromSlot('hole2', i) }}>×</button>
                    </>
                  ) : <span className="empty">—</span>}
                </div>
              ))}
            </div>
          </div>
        </div>

        <div className="community">
          <h3>Community</h3>
          <div className="community-row">
            {community.map((c,i) => (
              <div key={i} className={`slot ${target.area==='community' && target.index===i ? 'active-slot' : ''}`} onClick={() => setTarget({area:'community', index:i})}>
                {c ? (
                  <>
                    <span>{c.code}</span>
                    <button className="remove" onClick={(e) => { e.stopPropagation(); removeFromSlot('community', i) }}>×</button>
                  </>
                ) : <span className="empty">—</span>}
              </div>
            ))}
          </div>
        </div>

      </section>

      <section className="picker">
        <div className="deck">
          {deck.map(card => {
            const used = isCardUsed(card)
            return (
              <CardButton key={card.code} card={card} onClick={(c)=>{ if(!used) placeCard(c)}} selected={used} />
            )
          })}
        </div>

        <aside className="summary">
          <h2>Active: {target.area} #{target.index+1}</h2>
          <p>Used cards: {[...hole1, ...hole2, ...community].filter(Boolean).map(c=>c.code).join(', ') || 'None'}</p>
          <div className="actions">
            <button onClick={clearAll}>Clear board</button>
          </div>
        </aside>
      </section>

      <footer>
        <small>Slots follow Texas Hold'em rules: each player gets 2 hole cards; community has up to 5 cards (flop 3, turn, river).</small>
      </footer>
    </div>
  )
}
