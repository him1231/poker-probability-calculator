import React, {useState,useEffect} from 'react';
import {simulate} from './simulator';
export default function App(){
  const [players,setPlayers]=useState(2);
  const emptyHands = Array.from({length:6},()=>[null,null]);
  const [hands,setHands]=useState(emptyHands);
  const [community,setCommunity]=useState([]);
  const [results,setResults]=useState([]);
  useEffect(()=>{const res=simulate({players,playerHands:hands.slice(0,players),community,trials:10000});setResults(res)},[players,hands,community]);
  return (<div style={{padding:20,fontFamily:'sans-serif'}}>
    <h1>Poker Probability Calculator</h1>
    <label>Players: <select value={players} onChange={e=>setPlayers(Number(e.target.value))}>{[2,3,4,5,6].map(n=><option key={n} value={n}>{n}</option>)}</select></label>
    <div>
      {Array.from({length:players}).map((_,i)=> (
        <div key={i} style={{border:'1px solid #ddd',padding:10,margin:10}}>
          <h3>Player {i+1}</h3>
          <div>Hole cards: <input placeholder='e.g. Ah' onChange={e=>{const v=e.target.value; const copy=hands.slice(); copy[i][0]=v; setHands(copy)}}/> <input placeholder='e.g. Kd' onChange={e=>{const v=e.target.value; const copy=hands.slice(); copy[i][1]=v; setHands(copy)}}/></div>
          <div>Result: {results[i]?`${results[i].win.toFixed(2)}% win, ${results[i].tie.toFixed(2)}% tie`:'—'}</div>
        </div>
      ))}
    </div>
    <div>
      <h3>Community Cards</h3>
      <div>{Array.from({length:5}).map((_,i)=> <input key={i} placeholder='Ah' onChange={e=>{const v=e.target.value; const copy=community.slice(0); copy[i]=v; setCommunity(copy)}} />)}</div>
    </div>
    <div style={{marginTop:20}}><button onClick={()=>{setHands(emptyHands);setCommunity([]);setResults([])}}>Reset</button></div>
  </div>)
}
