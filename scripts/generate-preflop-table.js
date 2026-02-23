import fs from 'fs'
import path from 'path'
import { fileURLToPath } from 'url'
import PokerEvaluator from 'poker-evaluator'

const __filename = fileURLToPath(import.meta.url)
const __dirname = path.dirname(__filename)

const SUITS = ['s','h','d','c']
const RANKS = ['A','K','Q','J','T','9','8','7','6','5','4','3','2']

const HAND_ORDER = ['High Card','One Pair','Two Pair','Three of a Kind','Straight','Flush','Full House','Four of a Kind','Straight Flush']
const HAND_NAME_MAP = {
  'high card': 'High Card',
  'one pair': 'One Pair',
  'two pair': 'Two Pair',
  'two pairs': 'Two Pair',
  'three of a kind': 'Three of a Kind',
  'straight': 'Straight',
  'flush': 'Flush',
  'full house': 'Full House',
  'four of a kind': 'Four of a Kind',
  'straight flush': 'Straight Flush'
}

function makeDeck(){
  const deck = []
  for(const r of RANKS){
    for(const s of SUITS){
      deck.push(r + s)
    }
  }
  return deck
}

function handKey(c1, c2){
  const r1 = c1.slice(0, -1), r2 = c2.slice(0, -1)
  const s1 = c1.slice(-1), s2 = c2.slice(-1)
  if(r1 === r2) return r1 + r2
  const order = (r) => RANKS.indexOf(r)
  const [high, low] = [r1, r2].sort((a,b)=> order(a) - order(b))
  const suited = s1 === s2 ? 's' : 'o'
  return `${high}${low}${suited}`
}

function representativeCards(key){
  // use spades/hearts as representative
  if(key.length === 2){
    const r = key[0] === '1' ? 'T' : key[0]
    return [r+'s', r+'h']
  }
  const r1 = key[0] === '1' ? 'T' : key[0]
  const r2 = key[1] === '1' ? 'T' : key[1]
  const suited = key.endsWith('s')
  if(suited){
    return [r1+'s', r2+'s']
  }
  return [r1+'s', r2+'h']
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

function evalHandName(cards){
  const res = PokerEvaluator.evalHand(cards)
  return HAND_NAME_MAP[res.handName] || res.handName
}

function exactPreflopOddsForHand(hole){
  const deck = makeDeck()
  const used = new Set(hole)
  const remaining = deck.filter(c => !used.has(c))

  const counts = {}
  let total = 0

  const n = remaining.length // 50
  for(let a=0;a<n-4;a++){
    const ca = remaining[a]
    for(let b=a+1;b<n-3;b++){
      const cb = remaining[b]
      for(let c=b+1;c<n-2;c++){
        const cc = remaining[c]
        for(let d=c+1;d<n-1;d++){
          const cd = remaining[d]
          for(let e=d+1;e<n;e++){
            const ce = remaining[e]
            const handName = evalHandName([hole[0], hole[1], ca, cb, cc, cd, ce])
            counts[handName] = (counts[handName] || 0) + 1
            total++
          }
        }
      }
    }
  }

  const probs = {}
  for(const name of HAND_ORDER){
    probs[name] = total ? (counts[name] || 0) / total : 0
  }
  return { probs, total }
}

function main(){
  const keys = generateKeys()
  const table = {}
  let idx = 0
  const start = Date.now()
  for(const key of keys){
    idx++
    const hole = representativeCards(key)
    const {probs, total} = exactPreflopOddsForHand(hole)
    table[key] = { handProbs: probs, samples: total }
    const elapsed = ((Date.now() - start)/1000).toFixed(1)
    process.stdout.write(`\r${idx}/${keys.length} ${key} done (${elapsed}s)`)
  }
  process.stdout.write('\n')

  const outPath = path.join(__dirname, '..', 'public', 'preflop.json')
  fs.writeFileSync(outPath, JSON.stringify(table))
  console.log(`Wrote ${outPath}`)
}

main()
