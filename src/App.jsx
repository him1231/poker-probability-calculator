import { useMemo, useState } from 'react'
import './App.css'
import { bestHand, compareHands } from './evaluator'

const SUITS = ['♠', '♥', '♦', '♣']
const RANKS = ['A','2','3','4','5','6','7','8','9','10','J','Q','K']
const HAND_ORDER = ['High Card','One Pair','Two Pair','Three of a Kind','Straight','Flush','Full House','Four of a Kind','Straight Flush']

function makeDeck(){
  const deck = []
  for(const s of SUITS){
    for(const r of RANKS){
      deck.push({code: r + s, rank: r, suit: s})
    }
  }
  return deck
}

function sampleN(arr, n){
  const copy = arr.slice()
  const out = []
  for(let i=0;i<n;i++){
    const idx = Math.floor(Math.random() * (copy.length - i))
    const swapIdx = copy.length - 1 - i
    const pick = copy[idx]
    copy[idx] = copy[swapIdx]
    copy[swapIdx] = pick
    out.push(pick)
  }
  return out
}

function simulateOutcomes({hole, community, deck, iterations=6000}){
  const holeCards = hole.filter(Boolean)
  if(holeCards.length < 2) return null

  const communityCards = community.filter(Boolean)
  const missingCommunity = 5 - communityCards.length
  if(missingCommunity < 0) return null

  const used = [...holeCards, ...communityCards]
  const remaining = deck.filter(c => !used.find(u => u.code === c.code))

  let wins = 0, ties = 0, losses = 0
  const handCounts = {}
  let bestRankSeen = -1
  let bestExample = null

  const addHand = (name) => { handCounts[name] = (handCounts[name] || 0) + 1 }

  if(missingCommunity === 0){
    // exact vs random opponent holes
    for(let i=0;i<remaining.length;i++){
      for(let j=i+1;j<remaining.length;j++){
        const oppHole = [remaining[i], remaining[j]]
        const finalCommunity = communityCards
        const playerBest = bestHand([...holeCards, ...finalCommunity])
        const oppBest = bestHand([...oppHole, ...finalCommunity])
        const cmp = compareHands(playerBest, oppBest)
        if(cmp > 0) wins++
        else if(cmp === 0) ties++
        else losses++
        addHand(playerBest.name)
        if(playerBest.rank > bestRankSeen){
          bestRankSeen = playerBest.rank
          bestExample = {name: playerBest.name, needed: []}
        }
      }
    }
    const total = wins + ties + losses
    return {
      total,
      winRate: total ? wins/total : 0,
      tieRate: total ? ties/total : 0,
      lossRate: total ? losses/total : 0,
      handCounts,
      bestExample
    }
  }

  for(let t=0;t<iterations;t++){
    const draw = sampleN(remaining, missingCommunity + 2)
    const oppHole = draw.slice(0,2)
    const missing = draw.slice(2)
    const finalCommunity = communityCards.concat(missing)

    const playerBest = bestHand([...holeCards, ...finalCommunity])
    const oppBest = bestHand([...oppHole, ...finalCommunity])
    const cmp = compareHands(playerBest, oppBest)
    if(cmp > 0) wins++
    else if(cmp === 0) ties++
    else losses++

    addHand(playerBest.name)
    if(playerBest.rank > bestRankSeen){
      bestRankSeen = playerBest.rank
      bestExample = {name: playerBest.name, needed: missing.map(c => c.code)}
    }
  }

  const total = wins + ties + losses
  return {
    total,
    winRate: total ? wins/total : 0,
    tieRate: total ? ties/total : 0,
    lossRate: total ? losses/total : 0,
    handCounts,
    bestExample
  }
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
  const deck = useMemo(() => makeDeck(), [])

  // board state: single player only
  const [hole, setHole] = useState([null, null])
  const [community, setCommunity] = useState([null, null, null, null, null])

  // active target: 'hole' or 'community' with index; null when none
  const [target, setTarget] = useState({area: 'hole', index: 0})

  function nextTargetFor(nextHole, nextCommunity, current){
    const order = [
      {area:'hole', index:0},
      {area:'hole', index:1},
      {area:'community', index:0},
      {area:'community', index:1},
      {area:'community', index:2},
      {area:'community', index:3},
      {area:'community', index:4},
    ]
    const isEmpty = (slot) => (slot.area === 'hole' ? !nextHole[slot.index] : !nextCommunity[slot.index])
    const startIdx = order.findIndex(s => s.area === current.area && s.index === current.index)
    for(let i=startIdx+1;i<order.length;i++) if(isEmpty(order[i])) return order[i]
    for(let i=0;i<order.length;i++) if(isEmpty(order[i])) return order[i]
    return null
  }

  function placeCard(card){
    // prevent placing a card that's already used on board
    if(isCardUsed(card)) return

    if(!target) return

    if(target.area === 'hole'){
      const nextHole = [...hole]
      nextHole[target.index] = card
      setHole(nextHole)
      setTarget(nextTargetFor(nextHole, community, target))
    } else if(target.area === 'community'){
      const nextCommunity = [...community]
      nextCommunity[target.index] = card
      setCommunity(nextCommunity)
      setTarget(nextTargetFor(hole, nextCommunity, target))
    }
  }

  function isCardUsed(card){
    const used = [...hole, ...community].filter(Boolean)
    return used.find(c => c.code === card.code)
  }

  function removeFromSlot(area, idx){
    if(area === 'hole') setHole(h => { const c=[...h]; c[idx]=null; return c })
    if(area === 'community') setCommunity(c => { const cc=[...c]; cc[idx]=null; return cc })
    // after removing, set that slot as active so user can place new card
    setTarget({area, index: idx})
  }

  function clearAll(){
    setHole([null,null]); setCommunity([null,null,null,null,null]); setTarget({area:'hole', index:0})
  }

  const sim = useMemo(() => simulateOutcomes({hole, community, deck}), [hole, community, deck])
  const handProbList = useMemo(() => {
    if(!sim) return []
    return HAND_ORDER.map(name => {
      const count = sim.handCounts[name] || 0
      const pct = sim.total ? (count / sim.total) : 0
      return {name, count, pct}
    })
  }, [sim])

  return (
    <div className="app">
      <header>
        <h1>Poker Probability — Card Picker</h1>
        <p>Click a board slot to make it active, then click a card to place it. Click a filled slot to remove the card.</p>
      </header>

      <section className="board">
        <div className="players">
          <div className={`player ${target && target.area==='hole' ? 'active' : ''}`}>
            <h3>Player</h3>
            <div className="slot-row horizontal">
              {hole.map((c, i) => (
                <div key={i} className={`slot ${target && target.area==='hole' && target.index===i ? 'active-slot' : ''}`} onClick={() => {
                  if(c) removeFromSlot('hole', i); else setTarget({area:'hole', index:i})
                }}>
                  {c ? (
                    <div className="card-display">
                      <span className="rank">{c.rank}</span>
                      <span className="suit">{c.suit}</span>
                    </div>
                  ) : <span className="empty">🂠</span>}
                </div>
              ))}
            </div>
          </div>
        </div>

        <div className="community">
          <h3>Community</h3>
          <div className="community-row horizontal">
            {community.map((c,i) => (
              <div key={i} className={`slot ${target && target.area==='community' && target.index===i ? 'active-slot' : ''}`} onClick={() => {
                if(c) removeFromSlot('community', i); else setTarget({area:'community', index:i})
              }}>
                {c ? (
                  <div className="card-display">
                    <span className="rank">{c.rank}</span>
                    <span className="suit">{c.suit}</span>
                  </div>
                ) : <span className="empty">🂠</span>}
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
          <h2>{target ? `Active: ${target.area} #${target.index+1}` : 'Active: none'}</h2>
          <p>Used cards: {[...hole, ...community].filter(Boolean).map(c=>c.code).join(', ') || 'None'}</p>
          <div className="best-hand">
            <h3>Best hand</h3>
            {(() => {
              const all = [...hole, ...community].filter(Boolean)
              const best = bestHand(all)
              if(!best) return <p className="muted">No cards yet</p>
              return (
                <div>
                  <strong>{best.name}</strong>
                  <div className="hand-cards">{best.cards.map(code => <span key={code} className="mini-card">{code}</span>)}</div>
                </div>
              )
            })()}
          </div>

          <div className="winrate">
            <h3>Win rate (vs 1 random opponent)</h3>
            {!sim ? (
              <p className="muted">Select both hole cards to calculate.</p>
            ) : (
              <div className="rates">
                <div><strong>{(sim.winRate*100).toFixed(1)}%</strong> Win</div>
                <div>{(sim.tieRate*100).toFixed(1)}% Tie</div>
                <div>{(sim.lossRate*100).toFixed(1)}% Lose</div>
              </div>
            )}
          </div>

          <div className="best-possible">
            <h3>Highest possible (simulated)</h3>
            {!sim || !sim.bestExample ? (
              <p className="muted">No data yet.</p>
            ) : (
              <div>
                <strong>{sim.bestExample.name}</strong>
                <div className="muted small">Needed: {sim.bestExample.needed.length ? sim.bestExample.needed.join(', ') : 'None'}</div>
              </div>
            )}
          </div>

          <div className="hand-prob">
            <h3>Hand odds (simulated)</h3>
            {!sim ? (
              <p className="muted">Select both hole cards to calculate.</p>
            ) : (
              <ul>
                {handProbList.map(h => (
                  <li key={h.name}>
                    <span>{h.name}</span>
                    <span className="pct">{(h.pct*100).toFixed(1)}%</span>
                  </li>
                ))}
              </ul>
            )}
          </div>

          <div className="actions">
            <button onClick={clearAll}>Clear board</button>
          </div>
        </aside>
      </section>

    </div>
  )
}
