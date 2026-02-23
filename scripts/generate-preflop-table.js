import fs from 'fs'
import path from 'path'
import { fileURLToPath } from 'url'
import { bestHand, compareHands } from '../src/evaluator.js'

const __filename = fileURLToPath(import.meta.url)
const __dirname = path.dirname(__filename)

const SUITS = ['♠','♥','♦','♣']
const RANKS = ['A','K','Q','J','10','9','8','7','6','5','4','3','2']

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

function handKey(c1, c2){
  if(c1.rank === c2.rank) return c1.rank + c2.rank
  const ranks = [c1.rank, c2.rank]
  const sorted = ranks.sort((a,b)=> RANKS.indexOf(a) - RANKS.indexOf(b))
  const high = sorted[0], low = sorted[1]
  const suited = c1.suit === c2.suit ? 's' : 'o'
  return `${high}${low}${suited}`
}

function representativeCards(key){
  // use spades/hearts as representative
  if(key.length === 2){
    const r = key[0]
    return [{rank:r, suit:'♠', code:r+'♠'}, {rank:r, suit:'♥', code:r+'♥'}]
  }
  const r1 = key[0]
  const r2 = key[1] === '1' ? '10' : key[1]
  const suited = key.endsWith('s')
  if(suited){
    return [{rank:r1, suit:'♠', code:r1+'♠'}, {rank:r2, suit:'♠', code:r2+'♠'}]
  }
  return [{rank:r1, suit:'♠', code:r1+'♠'}, {rank:r2, suit:'♥', code:r2+'♥'}]
}

function generateKeys(){
  const keys = []
  for(let i=0;i<RANKS.length;i++){
    for(let j=i;j<RANKS.length;j++){
      if(i===j){
        keys.push(RANKS[i]+RANKS[j])
      } else {
        keys.push(RANKS[i]+RANKS[j]+'s')
        keys.push(RANKS[i]+RANKS[j]+'o')
      }
    }
  }
  return keys
}

function simulatePreflopStats(hole, iterations=8000){
  const deck = makeDeck()
  const used = hole
  const remaining = deck.filter(c => !used.find(u => u.code === c.code))

  const handCounts = {}
  let wins=0, ties=0, losses=0

  for(let t=0;t<iterations;t++){
    const draw = sampleN(remaining, 7) // 5 board + 2 opp
    const board = draw.slice(0,5)
    const opp = draw.slice(5)

    const playerBest = bestHand([...hole, ...board])
    const oppBest = bestHand([...opp, ...board])
    const cmp = compareHands(playerBest, oppBest)
    if(cmp>0) wins++
    else if(cmp===0) ties++
    else losses++

    handCounts[playerBest.name] = (handCounts[playerBest.name]||0) + 1
  }

  const total = wins+ties+losses
  return {
    total,
    winRate: total ? wins/total : 0,
    tieRate: total ? ties/total : 0,
    lossRate: total ? losses/total : 0,
    handCounts
  }
}

function main(){
  const keys = generateKeys()
  const table = {}
  for(const key of keys){
    const hole = representativeCards(key)
    const stats = simulatePreflopStats(hole, 8000)
    const handProbs = {}
    for(const name of HAND_ORDER){
      const count = stats.handCounts[name] || 0
      handProbs[name] = stats.total ? count / stats.total : 0
    }
    table[key] = {
      winRate: stats.winRate,
      tieRate: stats.tieRate,
      lossRate: stats.lossRate,
      handProbs,
      samples: stats.total
    }
    process.stdout.write(`\r${key} done`) 
  }
  process.stdout.write('\n')

  const outPath = path.join(__dirname, '..', 'public', 'preflop.json')
  fs.writeFileSync(outPath, JSON.stringify(table))
  console.log(`Wrote ${outPath}`)
}

main()
