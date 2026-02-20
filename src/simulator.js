// Monte Carlo Texas Hold'em simulator (browser-friendly)
const RANKS = "23456789TJQKA".split("");
const SUITS = ['h','d','c','s'];
function cardToId(card){return card[0]+card[1];}
function deck(exclude=[]) { const d=[]; RANKS.forEach(r=>SUITS.forEach(s=>d.push(r+s))); return d.filter(c=>!exclude.includes(c));}
function shuffle(a){for(let i=a.length-1;i>0;i--){const j=Math.floor(Math.random()*(i+1));[a[i],a[j]]=[a[j],a[i]]}return a}

// Very simple evaluator: use poker-evaluator library? We'll implement a minimal hand rank using scores by sorting — for brevity use simple comparison by best 5-card hand via external small algorithm.
// For this scaffold we'll use a lightweight evaluator: https://github.com/chenosaurus/poker-evaluator but we cannot fetch. Implement naive: map ranks to values and compare by highest sorted ranks (NOT perfect but placeholder).

const rankValue = r=>RANKS.indexOf(r);
function best5(cards){ // cards like 'Ah'
  const ranks = cards.map(c=>c[0]);
  const vals = ranks.map(rankValue).sort((a,b)=>b-a);
  return vals.slice(0,5).join(',');
}

export function simulate({players=2,playerHands=[],community=[],trials=10000}){
  // playerHands: array of arrays of two cards or []
  const exclude = [];
  playerHands.forEach(h=>h.forEach(c=>c&&exclude.push(c)));
  community.forEach(c=>c&&exclude.push(c));
  const d = deck(exclude);
  let wins=Array(players).fill(0), ties=Array(players).fill(0), losses=Array(players).fill(0);
  for(let t=0;t<trials;t++){
    const pool = shuffle(d.slice());
    let idx=0;
    const fullCommunity = community.slice();
    while(fullCommunity.length<5) fullCommunity.push(pool[idx++]);
    const scores=[];
    for(let p=0;p<players;p++){
      const hand = playerHands[p] && playerHands[p].length===2 ? playerHands[p] : [pool[idx++],pool[idx++]];
      scores.push(best5([...hand,...fullCommunity]));
    }
    // compare lexicographically
    const best = scores.slice().sort().reverse()[0];
    const winners = scores.map((s,i)=>s===best?i:-1).filter(i=>i>=0);
    if(winners.length===1) wins[winners[0]]++;
    else winners.forEach(i=>ties[i]++);
  }
  const results = players>0? Array.from({length:players},(_,i)=>({win: (wins[i]/trials)*100, tie:(ties[i]/trials)*100, loss: 100 - ((wins[i]+ties[i])/trials)*100 })) : [];
  return results;
}
