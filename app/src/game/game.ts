import { createRng, hashString, sampleAt, shuffle, ym } from '@finsim/engine'
import type { Instrument, Scenario } from './scenario1990'

/**
 * The M4 hot-seat game: a pure, serializable state machine for the round
 * loop DEAL → DRAFT → COMMIT → SIMULATE → INTERIM → FINAL (DESIGN.md §4).
 * No React, no clocks, no hidden state: every shuffle is seeded, every
 * decision is recorded, and a finished game is reproducible from
 * (scenario, seed, decisions). The UI on top is a thin view.
 *
 * Time: round r plays calendar year startYear + r. All trades execute at the
 * January close of that year (the commit month); the replay then walks
 * Jan → Dec. During round r nothing after the commit month is knowable — the
 * epistemic rule (§5) — so every card front reads trailing data only.
 */

/** A holding: fractional units plus its Swedish-style cost basis (buy courtage included). */
export interface Position {
  units: number
  cost: number
}

export interface Ledger {
  cash: number
  /** Instruments this player has drafted, ever — each is a standing option to buy. */
  unlocked: string[]
  positions: Record<string, Position>
}

export interface DraftState {
  /** hands[p] = instrument ids in front of player p right now. */
  hands: string[][]
  /** This cycle's simultaneous picks; hands pass once every player has picked. */
  pending: (string | null)[]
  /** Picks banked this round, per player. */
  taken: string[][]
  /** True: hands pass to the left (p → p+1); alternates each round. */
  passLeft: boolean
}

export interface CommitOrders {
  sells: { id: string; units: number }[]
  buys: { id: string; amount: number }[]
}

export interface YearResult {
  year: number
  /** Absolute month indices Jan..Dec. */
  months: number[]
  /** nw[p][i] = player p's net worth at months[i]. */
  nw: number[][]
  /** Jan (post-commit) → Dec return per player. */
  returns: number[]
  /** Winner(s) of the year bonus — ties all collect it; the bank is generous. */
  winners: number[]
}

export type Stage = 'draft' | 'commit' | 'replay' | 'interim' | 'final'

/** One player-decision, appended in order — the replayable record of the game. */
export type Decision =
  | { type: 'pick'; round: number; player: number; id: string }
  | { type: 'commit'; round: number; player: number; orders: CommitOrders }

export interface GameState {
  scenarioId: string
  seed: number
  players: string[]
  round: number
  stage: Stage
  draft: DraftState
  /** Face-up discards, all rounds — knowing what nobody took is information. */
  discards: string[]
  ledgers: Ledger[]
  commitDone: boolean[]
  /** Completed years, in order — the race chart across the decade. */
  history: YearResult[]
  decisions: Decision[]
}

// --- time & prices ---------------------------------------------------------

/** The month round r trades in: January of its year. */
export function commitMonth(scenario: Scenario, round: number): number {
  return ym(scenario.startYear + round, 1)
}

export function priceAt(scenario: Scenario, id: string, month: number): number {
  const data = scenario.series[id]
  if (!data) throw new Error(`no series for instrument "${id}"`)
  return sampleAt(data, month, id)
}

export function instrument(scenario: Scenario, id: string): Instrument {
  const inst = scenario.instruments.find((i) => i.id === id)
  if (!inst) throw new Error(`unknown instrument "${id}"`)
  return inst
}

/** Trailing closes up to and including `month` — the epistemic card front. */
export function trailing(scenario: Scenario, id: string, month: number, months = 36): number[] {
  const data = scenario.series[id]
  if (!data) return []
  const end = Math.min(month, data.startMonth + data.values.length - 1)
  const start = Math.max(data.startMonth, end - months + 1)
  return data.values.slice(start - data.startMonth, end - data.startMonth + 1)
}

/**
 * Risk grade from trailing 3-year monthly volatility, annualized:
 * A < 15 %, B < 25 %, C < 40 %, D beyond. '·' until 6 months of history exist.
 */
export function riskGrade(scenario: Scenario, id: string, month: number): string {
  const closes = trailing(scenario, id, month)
  if (closes.length < 7) return '·'
  const rets: number[] = []
  for (let i = 1; i < closes.length; i++) rets.push(Math.log(closes[i]! / closes[i - 1]!))
  const mean = rets.reduce((a, b) => a + b, 0) / rets.length
  const variance = rets.reduce((a, b) => a + (b - mean) ** 2, 0) / rets.length
  const annual = Math.sqrt(variance * 12)
  return annual < 0.15 ? 'A' : annual < 0.25 ? 'B' : annual < 0.4 ? 'C' : 'D'
}

// --- setup & dealing -------------------------------------------------------

function listedBy(scenario: Scenario, month: number): Instrument[] {
  return scenario.instruments.filter((i) => {
    const data = scenario.series[i.id]
    return data !== undefined && data.startMonth <= month
  })
}

/**
 * The era deck for a round: every listed instrument × its copies, shuffled —
 * except that anything newly listed since last round is guaranteed one dealt
 * copy (1997's IPOs appear in 1997, not eventually).
 */
function dealHands(scenario: Scenario, seed: number, round: number, players: number): string[][] {
  const rng = createRng((hashString(`deal:${seed}:${round}`) ^ seed) >>> 0)
  const month = commitMonth(scenario, round)
  const pool = listedBy(scenario, month)
  const fresh =
    round === 0 ? [] : pool.filter((i) => scenario.series[i.id]!.startMonth > commitMonth(scenario, round - 1)).map((i) => i.id)
  // each guaranteed fresh copy comes out of the instrument's copy budget
  const multiset = pool.flatMap((i) => Array<string>(i.copies - (fresh.includes(i.id) ? 1 : 0)).fill(i.id))
  const need = players * scenario.handSize
  let rest = shuffle(rng, multiset)
  while (fresh.length + rest.length < need) rest = rest.concat(shuffle(rng, multiset))
  const cards = shuffle(rng, fresh.slice(0, need).concat(rest.slice(0, Math.max(0, need - fresh.length))))
  return Array.from({ length: players }, (_, p) => cards.slice(p * scenario.handSize, (p + 1) * scenario.handSize))
}

function freshDraft(scenario: Scenario, seed: number, round: number, players: number): DraftState {
  return {
    hands: dealHands(scenario, seed, round, players),
    pending: Array<string | null>(players).fill(null),
    taken: Array.from({ length: players }, () => []),
    passLeft: round % 2 === 0,
  }
}

export function newGame(scenario: Scenario, seed: number, players: string[]): GameState {
  if (players.length < 2 || players.length > 6) throw new Error('2–6 players')
  return {
    scenarioId: scenario.id,
    seed,
    players,
    round: 0,
    stage: 'draft',
    draft: freshDraft(scenario, seed, 0, players.length),
    discards: [],
    ledgers: players.map(() => ({ cash: scenario.startingCash, unlocked: [], positions: {} })),
    commitDone: players.map(() => false),
    history: [],
    decisions: [],
  }
}

// --- draft -----------------------------------------------------------------

/** Player p picks a card from their current hand. Hands pass when everyone has. */
export function pick(state: GameState, player: number, id: string): void {
  if (state.stage !== 'draft') throw new Error('not drafting')
  const draft = state.draft
  if (draft.pending[player] !== null) throw new Error(`${state.players[player]} already picked`)
  const hand = draft.hands[player]!
  const at = hand.indexOf(id)
  if (at === -1) throw new Error(`${id} is not in ${state.players[player]}'s hand`)
  draft.pending[player] = id
  state.decisions.push({ type: 'pick', round: state.round, player, id })
  if (draft.pending.some((p) => p === null)) return

  // everyone has picked — bank the picks, pass the hands
  const n = state.players.length
  for (let p = 0; p < n; p++) {
    const picked = draft.pending[p]!
    const h = draft.hands[p]!
    h.splice(h.indexOf(picked), 1)
    draft.taken[p]!.push(picked)
    draft.pending[p] = null
  }
  const passed = draft.hands.map((_, p) => draft.hands[(n + p - (draft.passLeft ? 1 : -1)) % n]!)
  draft.hands = passed

  // one card left in each hand: it is discarded face-up and the draft ends
  if (draft.hands[0]!.length <= 1) {
    for (let p = 0; p < n; p++) {
      state.discards.push(...draft.hands[p]!)
      draft.hands[p] = []
      for (const taken of draft.taken[p]!) {
        const ledger = state.ledgers[p]!
        if (!ledger.unlocked.includes(taken)) ledger.unlocked.push(taken)
      }
    }
    state.stage = 'commit'
  }
}

// --- commit ----------------------------------------------------------------

export interface TradePreview {
  courtage: number
  tax: number
  /** Cash delta: negative for buys, positive for sells. */
  cash: number
  units: number
}

/** What a buy of `amount` kr does — courtage off the top, the rest buys units. */
export function previewBuy(scenario: Scenario, month: number, id: string, amount: number): TradePreview {
  const courtage = Math.max(scenario.courtage.min, amount * scenario.courtage.rate)
  const invested = amount - courtage
  if (invested <= 0) throw new Error(`${amount} does not cover the ${scenario.courtage.min} courtage`)
  return { courtage, tax: 0, cash: -amount, units: invested / priceAt(scenario, id, month) }
}

/**
 * What selling `units` does: courtage off the gross, then 30 % capital-gains
 * tax on any realized gain over the position's average cost (§14.1: courtage
 * + tax only, no sell cap — conviction is the draft's job).
 */
export function previewSell(scenario: Scenario, month: number, id: string, units: number, position: Position): TradePreview {
  if (units <= 0 || units > position.units + 1e-9) throw new Error(`cannot sell ${units} of ${id}`)
  const gross = units * priceAt(scenario, id, month)
  const courtage = Math.max(scenario.courtage.min, gross * scenario.courtage.rate)
  const costSold = position.cost * (units / position.units)
  const gain = gross - courtage - costSold
  const tax = Math.max(0, gain) * scenario.capitalGainsTax
  return { courtage, tax, cash: gross - courtage - tax, units: -units }
}

/** Apply player p's whole COMMIT atomically: sells free cash first, then buys. */
export function commit(state: GameState, scenario: Scenario, player: number, orders: CommitOrders): void {
  if (state.stage !== 'commit') throw new Error('not in commit')
  if (state.commitDone[player]) throw new Error(`${state.players[player]} already committed`)
  const month = commitMonth(scenario, state.round)
  const ledger = state.ledgers[player]!

  for (const sell of orders.sells) {
    const position = ledger.positions[sell.id]
    if (!position) throw new Error(`no position in ${sell.id}`)
    const t = previewSell(scenario, month, sell.id, sell.units, position)
    ledger.cash += t.cash
    const remaining = position.units - sell.units
    if (remaining < 1e-9) delete ledger.positions[sell.id]
    else {
      position.cost *= remaining / position.units
      position.units = remaining
    }
  }
  for (const buy of orders.buys) {
    if (!ledger.unlocked.includes(buy.id)) throw new Error(`${buy.id} was never drafted`)
    const t = previewBuy(scenario, month, buy.id, buy.amount)
    if (buy.amount > ledger.cash + 1e-6) throw new Error(`not enough cash for ${buy.id}`)
    ledger.cash -= buy.amount
    const position = (ledger.positions[buy.id] ??= { units: 0, cost: 0 })
    position.units += t.units
    position.cost += buy.amount
  }

  state.commitDone[player] = true
  state.decisions.push({ type: 'commit', round: state.round, player, orders })
  if (state.commitDone.every(Boolean)) {
    state.history.push(runYear(state, scenario))
    state.stage = 'replay'
  }
}

// --- simulate & score ------------------------------------------------------

export function netWorthAt(scenario: Scenario, ledger: Ledger, month: number): number {
  let nw = ledger.cash
  for (const [id, position] of Object.entries(ledger.positions)) nw += position.units * priceAt(scenario, id, month)
  return nw
}

/** The year month by month — the replay, the returns, the winner(s). */
function runYear(state: GameState, scenario: Scenario): YearResult {
  const year = scenario.startYear + state.round
  const months = Array.from({ length: 12 }, (_, i) => ym(year, i + 1))
  const nw = state.ledgers.map((ledger) => months.map((m) => netWorthAt(scenario, ledger, m)))
  const returns = nw.map((series) => series[11]! / series[0]! - 1)
  const best = Math.max(...returns)
  const winners = returns.flatMap((r, p) => (Math.abs(r - best) < 1e-12 ? [p] : []))
  // the bonus lands after the year is measured — cash from the bank, not zero-sum
  for (const p of winners) state.ledgers[p]!.cash += scenario.yearBonus
  return { year, months, nw, returns, winners }
}

/** Leave the replay for the standings screen. */
export function showInterim(state: GameState): void {
  if (state.stage !== 'replay') throw new Error('not replaying')
  state.stage = 'interim'
}

/** From the standings: deal the next year, or end the game after the last. */
export function nextRound(state: GameState, scenario: Scenario): void {
  if (state.stage !== 'interim') throw new Error('not at the interim')
  if (state.round + 1 >= scenario.rounds) {
    state.stage = 'final'
    return
  }
  state.round += 1
  state.stage = 'draft'
  state.draft = freshDraft(scenario, state.seed, state.round, state.players.length)
  state.commitDone = state.players.map(() => false)
}

/** Final standings by net worth at the last simulated month. */
export function finalStandings(state: GameState, scenario: Scenario): { player: number; nw: number }[] {
  const last = state.history[state.history.length - 1]
  if (!last) throw new Error('no completed year')
  const month = last.months[11]!
  return state.ledgers
    .map((ledger, player) => ({ player, nw: netWorthAt(scenario, ledger, month) }))
    .sort((a, b) => b.nw - a.nw)
}

/**
 * The epilogue (§5): everyone's final portfolio frozen, replayed monthly
 * through 2002. The dot-com lesson delivers itself.
 */
export function epilogue(state: GameState, scenario: Scenario): { months: number[]; nw: number[][] } {
  const start = ym(scenario.startYear + scenario.rounds, 1)
  const months: number[] = []
  for (let m = start; m <= scenario.epilogueThrough; m++) months.push(m)
  return { months, nw: state.ledgers.map((ledger) => months.map((m) => netWorthAt(scenario, ledger, m))) }
}
