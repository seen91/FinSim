import { formatMonth, ym } from '@finsim/engine'
import { describe, expect, it } from 'vitest'
import {
  commit,
  commitMonth,
  epilogue,
  finalStandings,
  netWorthAt,
  newGame,
  nextRound,
  pick,
  previewBuy,
  previewSell,
  priceAt,
  riskGrade,
  showInterim,
  trailing,
  type CommitOrders,
  type GameState,
} from '../src/game/game'
import { SCENARIO_1990 } from '../src/game/scenario1990'

const S = SCENARIO_1990
const NONE: CommitOrders = { sells: [], buys: [] }

/** Draft a full round with everyone picking their first card mechanically. */
function draftRound(state: GameState): void {
  while (state.stage === 'draft') {
    for (let p = 0; p < state.players.length; p++) pick(state, p, state.draft.hands[p]![0]!)
  }
}

describe('scenario pack', () => {
  it('holds 41 instruments, each with a series covering the epilogue', () => {
    expect(S.instruments).toHaveLength(41)
    for (const inst of S.instruments) {
      const data = S.series[inst.id]
      expect(data, inst.id).toBeDefined()
      const end = data!.startMonth + data!.values.length - 1
      expect(end, `${inst.id} ends ${formatMonth(end)}`).toBe(S.epilogueThrough)
      expect(Math.min(...data!.values), inst.id).toBeGreaterThan(0)
    }
  })

  it('every 1990 instrument has data at the first commit month', () => {
    const month = commitMonth(S, 0)
    for (const inst of S.instruments) {
      if (S.series[inst.id]!.startMonth <= month) expect(priceAt(S, inst.id, month), inst.id).toBeGreaterThan(0)
    }
  })

  it('the epistemic rule: IPOs are not in the pool before they list', () => {
    // Cisco IPO'd Feb 1990 — the January 1990 draft cannot know it
    expect(S.series['CSCO']!.startMonth).toBe(ym(1990, 2))
    expect(S.series['AMZN']!.startMonth).toBe(ym(1997, 5))
    expect(S.series['EBAY']!.startMonth).toBe(ym(1998, 9))
  })

  it('trailing() never reads past the in-game month', () => {
    const t = trailing(S, 'MSFT', ym(1990, 1))
    expect(t).toHaveLength(36) // 1987-02..1990-01
    const all = S.series['MSFT']!
    expect(t[t.length - 1]).toBe(all.values[ym(1990, 1) - all.startMonth])
  })

  it('risk grades: savings is calm, a young dot-com is not', () => {
    expect(riskGrade(S, 'SAVINGS', ym(1995, 1))).toBe('A')
    expect(riskGrade(S, 'AMZN', ym(1999, 1))).toBe('D')
  })
})

describe('deal & draft', () => {
  it('is deterministic from (seed, players)', () => {
    const a = newGame(S, 42, ['Anna', 'Bo', 'Cleo'])
    const b = newGame(S, 42, ['Anna', 'Bo', 'Cleo'])
    expect(a.draft.hands).toEqual(b.draft.hands)
    expect(newGame(S, 43, ['Anna', 'Bo', 'Cleo']).draft.hands).not.toEqual(a.draft.hands)
  })

  it('deals handSize cards each, all listed by the commit month', () => {
    const state = newGame(S, 1, ['A', 'B', 'C', 'D'])
    const month = commitMonth(S, 0)
    for (const hand of state.draft.hands) {
      expect(hand).toHaveLength(S.handSize)
      for (const id of hand) expect(S.series[id]!.startMonth, id).toBeLessThanOrEqual(month)
    }
  })

  it('picks pass simultaneously; 6 picks each; last card discarded face-up', () => {
    const state = newGame(S, 7, ['A', 'B'])
    const firstHandOfA = [...state.draft.hands[0]!]
    pick(state, 0, firstHandOfA[0]!)
    expect(state.draft.hands[0]).toHaveLength(7) // nothing moves until B picks
    pick(state, 1, state.draft.hands[1]![0]!)
    expect(state.draft.hands.every((h) => h.length === 6)).toBe(true)
    draftRound(state)
    expect(state.stage).toBe('commit')
    expect(state.draft.taken[0]).toHaveLength(6)
    expect(state.discards).toHaveLength(2)
    // every pick is now a standing option
    for (const id of state.draft.taken[0]!) expect(state.ledgers[0]!.unlocked).toContain(id)
  })

  it('rejects picking a card not in hand, or picking twice', () => {
    const state = newGame(S, 7, ['A', 'B'])
    expect(() => pick(state, 0, 'NOT_A_CARD')).toThrow()
    pick(state, 0, state.draft.hands[0]![0]!)
    expect(() => pick(state, 0, state.draft.hands[0]![1]!)).toThrow(/already picked/)
  })

  it('alternates passing direction between rounds', () => {
    expect(newGame(S, 1, ['A', 'B']).draft.passLeft).toBe(true)
    const state = newGame(S, 1, ['A', 'B'])
    draftRound(state)
    commit(state, S, 0, NONE)
    commit(state, S, 1, NONE)
    showInterim(state)
    nextRound(state, S)
    expect(state.round).toBe(1)
    expect(state.draft.passLeft).toBe(false)
  })

  it('guarantees newly listed instruments a dealt copy in their listing round', () => {
    // Cisco lists Feb 1990 → must be dealt in the 1991 round (first commit that can buy it)
    for (const seed of [1, 2, 3, 99]) {
      const state = newGame(S, seed, ['A', 'B'])
      draftRound(state)
      commit(state, S, 0, NONE)
      commit(state, S, 1, NONE)
      showInterim(state)
      nextRound(state, S)
      expect(state.draft.hands.flat()).toContain('CSCO')
    }
  })
})

describe('trades (§14.1: courtage + capital-gains tax, no sell cap)', () => {
  it('buys take courtage off the top and record full cost basis', () => {
    const month = commitMonth(S, 0)
    const t = previewBuy(S, month, 'MSFT', 10_000)
    expect(t.courtage).toBe(100) // 0.5 % above the 100 minimum? 10 000 × 0.005 = 50 → min 100 applies
    expect(t.units).toBeCloseTo(9_900 / priceAt(S, 'MSFT', month))
    expect(() => previewBuy(S, month, 'MSFT', 80)).toThrow(/courtage/)
  })

  it('sells pay courtage and 30 % tax on the realized gain (average cost)', () => {
    const position = { units: 100, cost: 10_000 } // cost 100/unit
    const month = ym(1995, 1)
    const price = priceAt(S, 'SAVINGS', month)
    const t = previewSell(S, month, 'SAVINGS', 50, position)
    const gross = 50 * price
    const courtage = Math.max(100, gross * 0.005)
    const gain = gross - courtage - 5_000
    expect(t.tax).toBeCloseTo(Math.max(0, gain) * 0.3)
    expect(t.cash).toBeCloseTo(gross - courtage - Math.max(0, gain) * 0.3)
  })

  it('a loss is taxed zero, not refunded', () => {
    const position = { units: 100, cost: 1_000_000 }
    const t = previewSell(S, ym(1995, 1), 'INDEX', 100, position)
    expect(t.tax).toBe(0)
  })

  it('commit applies sells before buys and refuses overdrafts and undrafted buys', () => {
    const state = newGame(S, 11, ['A', 'B'])
    draftRound(state)
    const anna = state.ledgers[0]!
    const id = anna.unlocked[0]!
    expect(() => commit(state, S, 0, { sells: [], buys: [{ id: 'ZZZ', amount: 1_000 }] })).toThrow(/never drafted/)
    expect(() => commit(state, S, 0, { sells: [], buys: [{ id, amount: 200_000 }] })).toThrow(/not enough cash/)
    commit(state, S, 0, { sells: [], buys: [{ id, amount: 50_000 }] })
    expect(anna.cash).toBeCloseTo(50_000)
    expect(anna.positions[id]!.cost).toBe(50_000)
    expect(anna.positions[id]!.units).toBeGreaterThan(0)
  })
})

describe('the year, the bonus, the decade', () => {
  function playRound(state: GameState, orders: (p: number) => CommitOrders): void {
    draftRound(state)
    for (let p = 0; p < state.players.length; p++) commit(state, S, p, orders(p))
    showInterim(state)
  }

  it('replays 12 months and pays the year-winner bonus from the bank', () => {
    const state = newGame(S, 5, ['A', 'B'])
    draftRound(state)
    // A goes all-in on her first pick, B stays in cash
    const id = state.ledgers[0]!.unlocked[0]!
    commit(state, S, 0, { sells: [], buys: [{ id, amount: 99_000 }] })
    const cashBeforeB = state.ledgers[1]!.cash
    commit(state, S, 1, NONE)
    expect(state.stage).toBe('replay')
    const year = state.history[0]!
    expect(year.year).toBe(1990)
    expect(year.months).toHaveLength(12)
    expect(year.nw[1]!.every((v) => v === cashBeforeB || v === cashBeforeB + S.yearBonus)).toBe(true)
    // exactly the winners got the bonus
    const bonusHolders = state.ledgers.filter((l, p) => year.winners.includes(p) && l.cash >= S.yearBonus)
    expect(bonusHolders).toHaveLength(year.winners.length)
    // all-cash B earned exactly 0 % that year
    expect(year.returns[1]).toBeCloseTo(0)
  })

  it('plays all 10 rounds to the final and reads honest standings', () => {
    const state = newGame(S, 1990, ['Anna', 'Bo', 'Cleo'])
    // Anna buys the index every January; Bo sits in cash; Cleo buys her first tech pick in 1995+
    for (let r = 0; r < S.rounds; r++) {
      playRound(state, (p) => {
        if (p === 0 && state.ledgers[0]!.unlocked.includes('INDEX') && state.ledgers[0]!.cash > 1_000)
          return { sells: [], buys: [{ id: 'INDEX', amount: state.ledgers[0]!.cash }] }
        return NONE
      })
      if (r < S.rounds - 1) nextRound(state, S)
    }
    nextRound(state, S)
    expect(state.stage).toBe('final')
    const standings = finalStandings(state, S)
    expect(standings).toHaveLength(3)
    // the index quintupled over the decade: an all-in indexer beats cash
    const anna = standings.find((s) => s.player === 0)!
    const bo = standings.find((s) => s.player === 1)!
    expect(anna.nw).toBeGreaterThan(bo.nw)
    expect(anna.nw).toBeGreaterThan(300_000)
    // cash Bo = 100k + any year bonuses, exactly
    expect((bo.nw - 100_000) % S.yearBonus).toBeCloseTo(0)

    const epi = epilogue(state, S)
    expect(epi.months[0]).toBe(ym(2000, 1))
    expect(epi.months[epi.months.length - 1]).toBe(ym(2002, 12))
    // Bo's frozen cash does not move through the crash
    expect(new Set(epi.nw[1]!).size).toBe(1)
  })

  it('is reproducible: same seed + same decisions → same final standings', () => {
    const run = (): number[] => {
      const state = newGame(S, 77, ['A', 'B'])
      for (let r = 0; r < S.rounds; r++) {
        draftRound(state)
        for (let p = 0; p < 2; p++) {
          const l = state.ledgers[p]!
          const id = l.unlocked[p % l.unlocked.length]!
          commit(state, S, p, l.cash > 5_000 ? { sells: [], buys: [{ id, amount: l.cash / 2 }] } : NONE)
        }
        showInterim(state)
        nextRound(state, S)
      }
      return finalStandings(state, S).map((s) => s.nw)
    }
    expect(run()).toEqual(run())
  })

  it('net worth is cash plus positions at the sampled price', () => {
    const ledger = { cash: 1_000, unlocked: ['MSFT'], positions: { MSFT: { units: 10, cost: 500 } } }
    const m = ym(1999, 12)
    expect(netWorthAt(S, ledger, m)).toBeCloseTo(1_000 + 10 * priceAt(S, 'MSFT', m))
  })
})
