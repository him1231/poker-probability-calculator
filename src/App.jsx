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

export default function App(){
  const deck = makeDeck()
  const [selected, setSelected] = useState([])

  function toggle(card){
    setSelected(prev => {
      const exists = prev.find(c => c.code === card.code)
      if(exists) return prev.filter(c => c.code !== card.code)
      if(prev.length >= 10) return prev // limit selection to 10 for UI
      return [...prev, card]
    })
  }

  return (
    <div className="app">
      <header>
        <h1>Poker Probability — Card Picker</h1>
        <p>Select hole cards and community cards below.</p>
      </header>

      <section className="picker">
        <div className="deck">
          {deck.map(card => {
            const isSelected = selected.find(c => c.code === card.code)
            return (
              <button key={card.code} className={`card ${isSelected ? 'selected' : ''}`} onClick={() => toggle(card)}>
                <span className="rank">{card.rank}</span>
                <span className="suit">{card.suit}</span>
              </button>
            )
          })}
        </div>

        <aside className="summary">
          <h2>Selected ({selected.length})</h2>
          {selected.length === 0 ? <p>None — pick cards to start</p> : (
            <ul>
              {selected.map(c => <li key={c.code}>{c.code}</li>)}
            </ul>
          )}
          <div className="actions">
            <button onClick={() => setSelected([])}>Clear</button>
          </div>
        </aside>
      </section>

      <footer>
        <small>Simple card picker — use selections in the simulator.</small>
      </footer>
    </div>
  )
}
