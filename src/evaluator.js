// Simple poker hand evaluator for up to 7 cards.
// Returns {rank: number, name: string, cards: [codes], tiebreak: [numbers]}

const RANK_ORDER = {'2':2,'3':3,'4':4,'5':5,'6':6,'7':7,'8':8,'9':9,'10':10,'J':11,'Q':12,'K':13,'A':14}
const HAND_NAMES = ['High Card','One Pair','Two Pair','Three of a Kind','Straight','Flush','Full House','Four of a Kind','Straight Flush']

function combinations(arr, k){
  const res = []
  function go(start, combo){
    if(combo.length===k){ res.push(combo.slice()); return }
    for(let i=start;i<arr.length;i++){ combo.push(arr[i]); go(i+1, combo); combo.pop() }
  }
  go(0,[])
  return res
}

function rankCounts(cards){
  const counts = {}
  for(const c of cards){ const r=c.rank; counts[r] = (counts[r]||0)+1 }
  return counts
}

function isFlush(cards){
  const suits = cards.map(c=>c.suit)
  return suits.every(s=>s===suits[0])
}

function isStraight(cards){
  const vals = Array.from(new Set(cards.map(c=>RANK_ORDER[c.rank]))).sort((a,b)=>a-b)
  // handle wheel A-2-3-4-5
  if(vals.includes(14)) vals.unshift(1)
  let maxRun=1, run=1
  for(let i=1;i<vals.length;i++){
    if(vals[i]===vals[i-1]+1) run++
    else run=1
    if(run>maxRun) maxRun=run
  }
  return maxRun>=5
}

function straightTop(cards){
  const vals = Array.from(new Set(cards.map(c=>RANK_ORDER[c.rank]))).sort((a,b)=>a-b)
  if(vals.includes(14)) vals.unshift(1)
  let run=1, best = vals[vals.length-1]
  for(let i=1;i<vals.length;i++){
    if(vals[i]===vals[i-1]+1) run++
    else run=1
    if(run>=5) best = vals[i]
  }
  if(best===1) best=5
  return best
}

function evaluate5(cards){
  // cards: array of 5 card objects
  const counts = rankCounts(cards)
  const groups = Object.entries(counts).map(([r,c])=>({rank:r,count:c, val:RANK_ORDER[r]})).sort((a,b)=>{
    if(b.count!==a.count) return b.count-a.count
    return b.val - a.val
  })

  const flush = isFlush(cards)
  const straight = isStraight(cards)
  const straightTopVal = straight ? straightTop(cards) : null

  // Straight flush
  if(flush && straight) return {rank:8,name:'Straight Flush', tiebreak:[straightTopVal], cards:cards.map(c=>c.code)}

  // Four of a kind
  if(groups[0].count===4) return {rank:7, name:'Four of a Kind', tiebreak:[groups[0].val, groups[1].val], cards:cards.map(c=>c.code)}

  // Full house
  if(groups[0].count===3 && groups[1].count>=2) return {rank:6, name:'Full House', tiebreak:[groups[0].val, groups[1].val], cards:cards.map(c=>c.code)}

  // Flush
  if(flush) return {rank:5, name:'Flush', tiebreak:cards.map(c=>RANK_ORDER[c.rank]).sort((a,b)=>b-a), cards:cards.map(c=>c.code)}

  // Straight
  if(straight) return {rank:4, name:'Straight', tiebreak:[straightTopVal], cards:cards.map(c=>c.code)}

  // Three of a kind
  if(groups[0].count===3) return {rank:3, name:'Three of a Kind', tiebreak:[groups[0].val, groups[1].val, groups[2].val], cards:cards.map(c=>c.code)}

  // Two pair
  if(groups[0].count===2 && groups[1].count===2) return {rank:2, name:'Two Pair', tiebreak:[groups[0].val, groups[1].val, groups[2].val], cards:cards.map(c=>c.code)}

  // One pair
  if(groups[0].count===2) return {rank:1, name:'One Pair', tiebreak:[groups[0].val, groups[1].val, groups[2].val, groups[3].val], cards:cards.map(c=>c.code)}

  // High card
  const vals = cards.map(c=>RANK_ORDER[c.rank]).sort((a,b)=>b-a)
  return {rank:0, name:'High Card', tiebreak:vals, cards:cards.map(c=>c.code)}
}

export function bestHand(allCards){
  // allCards: array of card objects (up to 7)
  const combos = combinations(allCards,5)
  let best = null
  for(const comb of combos){
    const ev = evaluate5(comb)
    if(!best) best = ev
    else {
      if(ev.rank > best.rank) best = ev
      else if(ev.rank === best.rank){
        // compare tiebreak arrays
        const a = ev.tiebreak, b = best.tiebreak
        let better = false, worse = false
        for(let i=0;i<Math.max(a.length,b.length);i++){
          const av = a[i]||0, bv = b[i]||0
          if(av>bv){ better=true; break }
          if(av<bv){ worse=true; break }
        }
        if(better) best = ev
      }
    }
  }
  return best
}
