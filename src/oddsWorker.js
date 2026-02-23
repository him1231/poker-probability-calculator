import { bestHand, compareHands } from './evaluator'

const SUITS = ['♠','♥','♦','♣']
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

function simulateWinRate({holeCards, communityCards, deck, iterations=5000}){
  const missingCommunity = 5 - communityCards.length
  if(missingCommunity < 0) return null

  const used = [...holeCards, ...communityCards]
  const remaining = deck.filter(c => !used.find(u => u.code === c.code))

  let wins = 0, ties = 0, losses = 0

  if(missingCommunity === 0){
    for(let i=0;i<remaining.length;i++){
      for(let j=i+1;j<remaining.length;j++){
        const oppHole = [remaining[i], remaining[j]]
        const playerBest = bestHand([...holeCards, ...communityCards])
        const oppBest = bestHand([...oppHole, ...communityCards])
        const cmp = compareHands(playerBest, oppBest)
        if(cmp > 0) wins++
        else if(cmp === 0) ties++
        else losses++
      }
    }
    const total = wins + ties + losses
    return { winRate: total ? wins/total : 0, tieRate: total ? ties/total : 0, lossRate: total ? losses/total : 0 }
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
  }

  const total = wins + ties + losses
  return { winRate: total ? wins/total : 0, tieRate: total ? ties/total : 0, lossRate: total ? losses/total : 0 }
}

function enumerateHandOdds({holeCards, communityCards, deck, mcIterations=8000}){
  const missingCommunity = 5 - communityCards.length
  if(missingCommunity < 0) return null

  const used = [...holeCards, ...communityCards]
  const remaining = deck.filter(c => !used.find(u => u.code === c.code))

  const handCounts = {}
  let total = 0
  let bestRankSeen = -1
  let bestExample = null

  const addHand = (name) => { handCounts[name] = (handCounts[name] || 0) + 1 }

  if(missingCommunity === 0){
    const playerBest = bestHand([...holeCards, ...communityCards])
    if(playerBest){
      addHand(playerBest.name)
      total = 1
      bestRankSeen = playerBest.rank
      bestExample = {name: playerBest.name, needed: []}
    }
    return { total, handCounts, bestExample }
  }

  if(missingCommunity <= 2){
    const comb = []
    function choose(start, depth){
      if(depth === missingCommunity){
        const finalCommunity = communityCards.concat(comb)
        const playerBest = bestHand([...holeCards, ...finalCommunity])
        addHand(playerBest.name)
        total++
        if(playerBest.rank > bestRankSeen){
          bestRankSeen = playerBest.rank
          bestExample = {name: playerBest.name, needed: comb.map(c => c.code)}
        }
        return
      }
      for(let i=start;i<=remaining.length - (missingCommunity - depth);i++){
        comb[depth] = remaining[i]
        choose(i+1, depth+1)
      }
    }
    choose(0, 0)
    return { total, handCounts, bestExample }
  }

  // fallback Monte Carlo (preflop or heavy cases)
  for(let t=0;t<mcIterations;t++){
    const draw = sampleN(remaining, missingCommunity)
    const finalCommunity = communityCards.concat(draw)
    const playerBest = bestHand([...holeCards, ...finalCommunity])
    addHand(playerBest.name)
    total++
    if(playerBest.rank > bestRankSeen){
      bestRankSeen = playerBest.rank
      bestExample = {name: playerBest.name, needed: draw.map(c => c.code)}
    }
  }
  return { total, handCounts, bestExample, approximate:true }
}

self.onmessage = (e) => {
  const { hole, community } = e.data
  const holeCards = hole || []
  const communityCards = community || []
  const deck = makeDeck()

  const odds = enumerateHandOdds({holeCards, communityCards, deck})
  const win = simulateWinRate({holeCards, communityCards, deck})
  self.postMessage({odds, win})
}
