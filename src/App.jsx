import { useEffect, useMemo, useRef, useState } from 'react'
import './App.css'

const SUITS = ['♠', '♥', '♦', '♣']
const RANKS = ['A','2','3','4','5','6','7','8','9','10','J','Q','K']
const KEY_RANKS = ['A','K','Q','J','10','9','8','7','6','5','4','3','2']
const HAND_ORDER = ['High Card','One Pair','Two Pair','Three of a Kind','Straight','Flush','Full House','Four of a Kind','Straight Flush']
const THEORETICAL_7CARD = {
  'High Card': 0.174119,
  'One Pair': 0.438225,
  'Two Pair': 0.235173,
  'Three of a Kind': 0.048298,
  'Straight': 0.046193,
  'Flush': 0.030254,
  'Full House': 0.025961,
  'Four of a Kind': 0.001681,
  'Straight Flush': 0.000311
}

function makeDeck(){
  const deck = []
  for(const s of SUITS){
    for(const r of RANKS){
      deck.push({code: r + s, rank: r, suit: s})
    }
  }
  return deck
}

function handKey(c1, c2){
  if(!c1 || !c2) return null
  if(c1.rank === c2.rank) return c1.rank + c2.rank
  const order = (r) => KEY_RANKS.indexOf(r)
  const [high, low] = [c1.rank, c2.rank].sort((a,b)=> order(a) - order(b))
  const suited = c1.suit === c2.suit ? 's' : 'o'
  return `${high}${low}${suited}`
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

  const [preflopTable, setPreflopTable] = useState(null)
  const [calc, setCalc] = useState({win:null, odds:null, loading:false, source:null})
  const workerRef = useRef(null)

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

  useEffect(() => {
    fetch(`/preflop.json?v=${Date.now()}`)
      .then(r => r.json())
      .then(setPreflopTable)
      .catch(() => {})
  }, [])

  useEffect(() => {
    const worker = new Worker(new URL('./oddsWorker.js', import.meta.url), {type:'module'})
    workerRef.current = worker
    worker.onmessage = (e) => {
      const {win, odds} = e.data
      setCalc({win, odds, loading:false, source:'worker'})
    }
    return () => worker.terminate()
  }, [])

  useEffect(() => {
    const holeCards = hole.filter(Boolean)
    const communityCards = community.filter(Boolean)
    if(holeCards.length < 2){
      setCalc({win:null, odds:null, loading:false, source:null})
      return
    }

    if(communityCards.length === 0 && preflopTable){
      const key = handKey(holeCards[0], holeCards[1])
      const entry = key ? preflopTable[key] : null
      if(entry){
        const highest = [...HAND_ORDER].reverse().find(name => (entry.handProbs[name] || 0) > 0)
        const odds = { total: 1, handCounts: entry.handProbs, bestExample: highest ? {name: highest, needed: []} : null, fromTable:true }
        setCalc({win:null, odds, loading:false, source:'preflop'})
        return
      }
    }

    if(workerRef.current){
      setCalc(prev => ({...prev, loading:true, source:'worker'}))
      workerRef.current.postMessage({hole: holeCards, community: communityCards})
    }
  }, [hole, community, preflopTable])

  const winSim = calc.win
  const odds = calc.odds
  const isPreflop = community.filter(Boolean).length === 0
  const handProbList = useMemo(() => {
    if(!odds) return []
    return HAND_ORDER.map(name => {
      const count = odds.handCounts[name] || 0
      const pct = odds.total ? (count / odds.total) : 0
      return {name, count, pct}
    })
  }, [odds])

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
          <div className="winrate">
            <h3>Win rate (vs 1 random opponent)</h3>
            {isPreflop ? (
              <p className="muted">Preflop: win rate not shown (table shows hand odds only).</p>
            ) : calc.loading ? (
              <p className="muted">Calculating...</p>
            ) : !winSim ? (
              <p className="muted">Select both hole cards to calculate.</p>
            ) : (
              <div className="rates">
                <div><strong>{(winSim.winRate*100).toFixed(1)}%</strong> Win</div>
                <div>{(winSim.tieRate*100).toFixed(1)}% Tie</div>
                <div>{(winSim.lossRate*100).toFixed(1)}% Lose</div>
              </div>
            )}
          </div>

          <div className="best-possible">
            <h3>Highest possible {calc.source==='preflop' ? '(lookup)' : '(exact)'}</h3>
            {calc.loading ? (
              <p className="muted">Calculating...</p>
            ) : (!odds || !odds.bestExample ? (
              <p className="muted">No data yet.</p>
            ) : (
              <div>
                <strong>{odds.bestExample.name}</strong>
                <div className="muted small">Needed: {odds.bestExample.needed.length ? odds.bestExample.needed.join(', ') : 'None'}</div>
              </div>
            ))}
          </div>

          <div className="hand-prob">
            <h3>Hand Odds (Theoretical)</h3>
            {calc.loading ? (
              <p className="muted">Calculating...</p>
            ) : !odds ? (
              <p className="muted">Select both hole cards to calculate.</p>
            ) : (
              <ul>
                {handProbList.map(h => (
                  <li key={h.name}>
                    <span>{h.name}</span>
                    <span className="pct">
                      {(h.pct*100).toFixed(2)}%
                      {isPreflop && THEORETICAL_7CARD[h.name] !== undefined
                        ? ` (${(THEORETICAL_7CARD[h.name]*100).toFixed(3)}%)`
                        : ''}
                    </span>
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
