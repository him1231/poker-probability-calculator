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

function CardButton({card, onClick, disabled}){
  return (
    <button className={`card ${disabled ? 'disabled' : ''}`} onClick={() => !disabled && onClick(card)}>
      <span className="rank">{card.rank}</span>
      <span className="suit">{card.suit}</span>
    </button>
  )
}

export default function App(){
  const deck = makeDeck()

  // board state: single player only
  const [hole, setHole] = useState([null, null])
  const [community, setCommunity] = useState([null, null, null, null, null])

  // active target: 'hole' or 'community' with index
  const [target, setTarget] = useState({area: 'hole', index: 0})

  function placeCard(card){
    // prevent placing a card that's already used on board
    if(isCardUsed(card)) return

    if(target.area === 'hole'){
      setHole(h => {
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
    const used = [...hole, ...community].filter(Boolean)
    return used.find(c => c.code === card.code)
  }

  function removeFromSlot(area, idx){
    if(area === 'hole') setHole(h => { const c=[...h]; c[idx]=null; return c })
    if(area === 'community') setCommunity(c => { const cc=[...c]; cc[idx]=null; return cc })
  }

  function clearAll(){
    setHole([null,null]); setCommunity([null,null,null,null,null]);
  }

  return (
    <div className="app">
      <header>
        <h1>Poker Probability — Card Picker</h1>
        <p>Click a board slot to make it active, then click a card to place it. Click a filled slot to remove the card.</p>
      </header>

      <section className="board">
        <div className="players">
          <div className={`player ${target.area==='hole' ? 'active' : ''}`}>
            <h3>Player</h3>
            <div className="slot-row horizontal">
              {hole.map((c, i) => (
                <div key={i} className={`slot ${target.area==='hole' && target.index===i ? 'active-slot' : ''}`} onClick={() => {
                  if(c) removeFromSlot('hole', i); else setTarget({area:'hole', index:i})
                }}>
                  {c ? (
                    <span className="card-label">{c.code}</span>
                  ) : <span className="empty">Empty</span>}
                </div>
              ))}
            </div>
          </div>
        </div>

        <div className="community">
          <h3>Community</h3>
          <div className="community-row horizontal">
            {community.map((c,i) => (
              <div key={i} className={`slot ${target.area==='community' && target.index===i ? 'active-slot' : ''}`} onClick={() => {
                if(c) removeFromSlot('community', i); else setTarget({area:'community', index:i})
              }}>
                {c ? (
                  <span className="card-label">{c.code}</span>
                ) : <span className="empty">Empty</span>}
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
              <CardButton key={card.code} card={card} onClick={(c)=> placeCard(c)} disabled={used} />
            )
          })}
        </div>

        <aside className="summary">
          <h2>Active: {target.area} #{target.index+1}</h2>
          <p>Used cards: {[...hole, ...community].filter(Boolean).map(c=>c.code).join(', ') || 'None'}</p>
          <div className="actions">
            <button onClick={clearAll}>Clear board</button>
          </div>
        </aside>
      </section>

      <footer>
        <small>Slots follow Texas Hold'em rules: player gets 2 hole cards; community has up to 5 cards (flop 3, turn, river).</small>
      </footer>
    </div>
  )
}
