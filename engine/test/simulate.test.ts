import { describe, expect, it } from 'vitest'
import { setCardEnabled, simulate, ym, type Card, type Series, type Table, type Take, type World } from '../src/index.js'

const g = Math.pow(1.07, 1 / 12)

const source = (id: string, value: number): Card => ({ id, kind: 'source', flow: { type: 'constant', value } })
const drain = (id: string, value: number): Card => ({ id, kind: 'drain', amount: { type: 'constant', value } })
const taxDrain = (id: string, percent: number): Card => ({ id, kind: 'drain', percent })
const fund = (id: string, expected = 0.07, take?: Take): Card => ({
  id,
  kind: 'asset',
  growth: { expected },
  ...(take ? { take } : {}),
})
const hand = (id: string, children: Card[], enabled?: boolean): Card => ({
  id,
  kind: 'hand',
  children,
  ...(enabled === undefined ? {} : { enabled }),
})
const table = (children: Card[]): Table => ({ root: { id: 'root', kind: 'hand', children } })

const contribution = (r: { contributions: Series[] }, id: string): number[] => r.contributions.find((s) => s.id === id)!.points
const balance = (r: { balances: Series[] }, id: string): number[] => r.balances.find((s) => s.id === id)!.points

describe('the pipeline: a hand is played top to bottom', () => {
  it('whatever reaches the bottom lands in cash — the model never leaks money', () => {
    const r = simulate(table([source('salary', 30000), drain('rent', 12000)]), {}, 0, 2)
    expect(r.cash.points).toEqual([18000, 36000, 54000])
    expect(r.netWorth.points).toEqual([18000, 36000, 54000])
    expect(contribution(r, 'salary')).toEqual([30000, 30000, 30000])
    expect(contribution(r, 'rent')).toEqual([-12000, -12000, -12000])
  })

  it('a percent drain reads the running total at its position — order is load-bearing', () => {
    const taxed = simulate(table([source('salary', 10000), taxDrain('tax', 0.3)]), {}, 0, 0)
    expect(taxed.cash.points[0]).toBeCloseTo(7000, 9)
    // tax above the salary sees nothing — the column is the calculation
    const mislaid = simulate(table([taxDrain('tax', 0.3), source('salary', 10000)]), {}, 0, 0)
    expect(mislaid.cash.points[0]).toBe(10000)
    expect(contribution(mislaid, 'tax')[0]).toBe(0)
  })

  it('a percent drain reads max(0, total): no negative tax', () => {
    const r = simulate(table([source('salary', 1000), drain('rent', 3000), taxDrain('tax', 0.5)]), {}, 0, 0)
    expect(contribution(r, 'tax')[0]).toBe(0)
    expect(r.cash.points[0]).toBe(-2000)
  })

  it('asset takes cascade over what remains, in order', () => {
    const r = simulate(
      table([
        source('salary', 1000),
        fund('a', 0, { type: 'percent', percent: 0.5 }),
        fund('b', 0, { type: 'percent', percent: 0.5 }),
      ]),
      {},
      0,
      0,
    )
    expect(balance(r, 'a')[0]).toBe(500)
    expect(balance(r, 'b')[0]).toBe(250)
    expect(r.cash.points[0]).toBe(250)
  })

  it('fixed drains and takes draw in full: the total may go honestly negative', () => {
    const r = simulate(
      table([
        source('salary', 100),
        fund('a', 0, { type: 'fixed', amountPerMonth: 300 }),
        fund('b', 0, { type: 'percent', percent: 0.5 }),
      ]),
      {},
      0,
      0,
    )
    expect(balance(r, 'a')[0]).toBe(300)
    expect(balance(r, 'b')[0]).toBe(0) // 50 % of max(0, −200)
    expect(r.cash.points[0]).toBe(-200)
    expect(r.netWorth.points[0]).toBe(100)
  })

  it('balances grow first, then take their deposit (annuity convention)', () => {
    const r = simulate(table([source('salary', 1000), fund('f', 0.07, { type: 'fixed', amountPerMonth: 1000 })]), {}, 0, 2)
    const f = balance(r, 'f')
    expect(f[0]).toBeCloseTo(1000, 9)
    expect(f[1]).toBeCloseTo(1000 * g + 1000, 9)
    expect(f[2]).toBeCloseTo(1000 * g * g + 1000 * g + 1000, 9)
    expect(r.cash.points).toEqual([0, 0, 0])
  })

  it('an initial balance appears on the start tick without growth; fees drag growth', () => {
    const r = simulate(table([{ id: 'f', kind: 'asset', initialBalance: 10000, growth: { expected: 0.07 }, fee: 0.004 }]), {}, 0, 12)
    const f = balance(r, 'f')
    expect(f[0]).toBe(10000)
    expect(f[12]).toBeCloseTo(10000 * 1.07 * (1 - 0.004), 6)
  })

  it('volatility is carried but ignored by the deterministic v1 engine', () => {
    const flat = table([source('s', 1000), fund('f', 0.07, { type: 'fixed', amountPerMonth: 1000 })])
    const vol = JSON.parse(JSON.stringify(flat)) as Table
    ;(vol.root.children[1] as { growth: { expected: number; volatility?: number } }).growth = { expected: 0.07, volatility: 0.15 }
    expect(simulate(vol, {}, 0, 24).netWorth.points).toEqual(simulate(flat, {}, 0, 24).netWorth.points)
  })

  it('debts accrue interest, cap their payment at payoff, and go inert', () => {
    // 0 % interest keeps the arithmetic bare: 3 500 principal, 1 000/mo payment.
    const r = simulate(
      table([source('salary', 1000), { id: 'loan', kind: 'debt', principal: 3500, interest: { expected: 0 }, payment: { type: 'fixed', amountPerMonth: 1000 } }]),
      {},
      0,
      4,
    )
    // start tick: 3 500 − 1 000; then 1 000/mo; tick 3 takes only the 500 left; tick 4 nothing.
    expect(balance(r, 'loan')).toEqual([-2500, -1500, -500, 0, 0])
    expect(contribution(r, 'loan')).toEqual([-1000, -1000, -1000, -500, 0])
    expect(r.cash.points).toEqual([0, 0, 0, 500, 1500])
    expect(r.netWorth.points).toEqual([-2500, -1500, -500, 500, 1500])
  })

  it('debt interest compounds monthly at the annual rate', () => {
    const r = simulate(table([{ id: 'loan', kind: 'debt', principal: 100000, interest: { expected: 0.06 } }]), {}, 0, 12)
    expect(balance(r, 'loan')[0]).toBe(-100000)
    expect(balance(r, 'loan')[12]).toBeCloseTo(-106000, 6)
  })

  it('priced assets buy units at the current price; value tracks the series', () => {
    const r = simulate(
      table([
        source('salary', 1100),
        { id: 'msft', kind: 'asset', price: { data: { startMonth: 0, values: [100, 110, 121] } }, take: { type: 'fixed', amountPerMonth: 1100 }, tags: ['equity'] },
      ]),
      {},
      0,
      2,
    )
    expect(balance(r, 'msft')[0]).toBeCloseTo(1100, 9)
    expect(balance(r, 'msft')[1]).toBeCloseTo(2310, 9)
    expect(balance(r, 'msft')[2]).toBeCloseTo(3641, 9)
  })

  it('priced assets can start from initial units; out-of-range data is an error', () => {
    const r = simulate(
      table([{ id: 'msft', kind: 'asset', price: { data: { startMonth: 0, values: [100, 90, 130] } }, initialUnits: 5 }]),
      {},
      0,
      2,
    )
    expect(balance(r, 'msft')).toEqual([500, 450, 650])
    expect(() =>
      simulate(table([{ id: 'x', kind: 'asset', price: { data: { startMonth: 0, values: [100] } }, initialUnits: 1 }]), {}, 0, 1),
    ).toThrow(/no data/)
  })

  it('cards respect their start month', () => {
    const r = simulate(
      table([
        { ...source('gig', 5000), startMonth: 2 },
        { id: 'f', kind: 'asset', initialBalance: 700, growth: { expected: 0 }, startMonth: 1 },
      ]),
      {},
      0,
      3,
    )
    expect(contribution(r, 'gig')).toEqual([0, 0, 5000, 5000])
    expect(balance(r, 'f')).toEqual([0, 700, 700, 700])
    expect(r.netWorth.points).toEqual([0, 700, 5700, 10700])
    expect(() => simulate(table([{ ...source('x', 1), startMonth: -1 }]), {}, 0, 1)).toThrow(/before the simulation start/)
  })

  it('cash can bear interest', () => {
    const t: Table = { ...table([source('s', 1000)]), cash: { initialBalance: 12000, growth: { expected: 0.02 } } }
    const r = simulate(t, {}, 0, 1)
    expect(r.cash.points[0]).toBe(13000)
    expect(r.cash.points[1]).toBeCloseTo(13000 * Math.pow(1.02, 1 / 12) + 1000, 9)
  })

  it('rejects invalid tables and ranges', () => {
    expect(() => simulate(table([{ id: 'x', kind: 'drain' }]), {}, 0, 1)).toThrow(/invalid table/)
    expect(() => simulate(table([]), {}, 5, 4)).toThrow(/invalid range/)
  })
})

describe('hands scope: a nested hand computes its own subtotal', () => {
  it('two salaries carry different taxes without interference', () => {
    const r = simulate(
      table([
        hand('job', [source('salary', 40000), taxDrain('tax1', 0.3)]),
        hand('consulting', [source('invoices', 20000), taxDrain('tax2', 0.5)]),
      ]),
      {},
      0,
      0,
    )
    expect(contribution(r, 'job')[0]).toBeCloseTo(28000, 9)
    expect(contribution(r, 'consulting')[0]).toBeCloseTo(10000, 9)
    expect(r.cash.points[0]).toBeCloseTo(38000, 9)
  })

  it("a percent card at the root reads the hands' nets above it", () => {
    const r = simulate(
      table([
        hand('a', [source('s1', 6000), taxDrain('t1', 0.5)]), // net 3 000
        hand('b', [source('s2', 2000)]), // net 2 000
        fund('f', 0, { type: 'percent', percent: 0.2 }), // 20 % of 5 000
      ]),
      {},
      0,
      0,
    )
    expect(balance(r, 'f')[0]).toBeCloseTo(1000, 9)
    expect(r.cash.points[0]).toBeCloseTo(4000, 9)
  })

  it('hands nest recursively; a disabled hand is set aside entirely', () => {
    const t = table([
      hand('outer', [source('s', 1000), hand('inner', [drain('d', 400), hand('innermost', [source('tiny', 100)])])]),
    ])
    const r = simulate(t, {}, 0, 0)
    expect(contribution(r, 'innermost')[0]).toBe(100)
    expect(contribution(r, 'inner')[0]).toBe(-300)
    expect(contribution(r, 'outer')[0]).toBe(700)
    expect(r.cash.points[0]).toBe(700)

    const off = setCardEnabled(t, 'inner', false)
    const r2 = simulate(off, {}, 0, 0)
    expect(contribution(r2, 'inner')[0]).toBe(0)
    expect(contribution(r2, 'innermost')[0]).toBe(0)
    expect(r2.cash.points[0]).toBe(1000)
  })

  it("a disabled hand's balances leave net worth", () => {
    const t = table([hand('h', [{ id: 'f', kind: 'asset', initialBalance: 5000, growth: { expected: 0 } }])])
    expect(simulate(t, {}, 0, 0).netWorth.points[0]).toBe(5000)
    expect(simulate(setCardEnabled(t, 'h', false), {}, 0, 0).netWorth.points[0]).toBe(0)
  })

  it('any card can be set aside: it moves no money, holds nothing, contributes zero', () => {
    const t = table([source('salary', 10000), drain('rent', 3000), fund('f', 0, { type: 'percent', percent: 0.5 })])
    expect(simulate(t, {}, 0, 0).cash.points[0]).toBe(3500)

    const noRent = simulate(setCardEnabled(t, 'rent', false), {}, 0, 0)
    expect(contribution(noRent, 'rent')[0]).toBe(0)
    expect(noRent.cash.points[0]).toBe(5000)

    const noFund = simulate(setCardEnabled(t, 'f', false), {}, 0, 0)
    expect(balance(noFund, 'f')[0]).toBe(0)
    expect(noFund.cash.points[0]).toBe(7000)
    expect(noFund.netWorth.points[0]).toBe(7000)
  })

  it("a set-aside asset's initial balance leaves net worth", () => {
    const t = table([{ id: 'f', kind: 'asset', initialBalance: 5000, growth: { expected: 0 } } as Card])
    expect(simulate(setCardEnabled(t, 'f', false), {}, 0, 0).netWorth.points[0]).toBe(0)
  })

  it('setCardEnabled does not mutate and rejects unknown cards', () => {
    const t = table([hand('h', [source('s', 1)])])
    const off = setCardEnabled(t, 'h', false)
    expect((t.root.children[0] as { enabled?: boolean }).enabled).toBeUndefined()
    expect((off.root.children[0] as { enabled?: boolean }).enabled).toBe(false)
    expect(() => setCardEnabled(t, 'nope', false)).toThrow(/unknown card/)
    expect(simulate(setCardEnabled(t, 's', false), {}, 0, 0).cash.points[0]).toBe(0)
  })
})

describe('jurisdiction hooks (rules as data — no if(sweden) anywhere)', () => {
  it('a monthly flowTax rule taxes matching flows', () => {
    const world: World = {
      rules: [{ id: 'income-tax', schedule: { kind: 'monthly' }, target: { tags: ['income'] }, effect: { type: 'flowTax', rate: 0.3 } }],
    }
    const t = table([{ id: 'salary', kind: 'source', flow: { type: 'constant', value: 10000 }, tags: ['income'] }])
    const r = simulate(t, world, 0, 0)
    expect(contribution(r, 'salary')[0]).toBeCloseTo(7000, 9)
  })

  it('a yearly balanceTax rule models schablonskatt-style wealth taxes', () => {
    const from = ym(2026, 1)
    const t = table([{ id: 'isk', kind: 'asset', initialBalance: 12000, growth: { expected: 0 }, tags: ['isk'] }])
    const world: World = {
      rules: [{ id: 'schablonskatt', schedule: { kind: 'yearly', monthOfYear: 12 }, target: { tags: ['isk'] }, effect: { type: 'balanceTax', rate: 0.01 } }],
    }
    const r = simulate(t, world, from, ym(2027, 1))
    const isk = balance(r, 'isk')
    expect(isk[10]).toBe(12000)
    expect(isk[11]).toBeCloseTo(11880, 9)
    expect(isk[12]).toBeCloseTo(11880, 9)
  })

  it('a once balanceScale rule models a crash hitting tagged assets only', () => {
    const t = table([
      { id: 'stocks', kind: 'asset', initialBalance: 1000, growth: { expected: 0 }, tags: ['equity'] },
      { id: 'savings', kind: 'asset', initialBalance: 1000, growth: { expected: 0 } },
    ])
    const world: World = {
      rules: [{ id: 'crash', schedule: { kind: 'once', atMonth: 1 }, target: { kinds: ['asset'], tags: ['equity'] }, effect: { type: 'balanceScale', factor: 0.7 } }],
    }
    const r = simulate(t, world, 0, 2)
    expect(balance(r, 'stocks')).toEqual([1000, 700, 700])
    expect(balance(r, 'savings')).toEqual([1000, 1000, 1000])
    expect(r.netWorth.points).toEqual([2000, 1700, 1700])
  })

  it('rules target cash only when addressed explicitly by id', () => {
    const t: Table = { ...table([]), cash: { initialBalance: 1000 } }
    const levy = (cardIds?: string[]): World => ({
      rules: [{ id: 'levy', schedule: { kind: 'once', atMonth: 0 }, target: cardIds ? { cardIds } : { kinds: ['asset'] }, effect: { type: 'balanceTax', rate: 0.1 } }],
    })
    expect(simulate(t, levy(['cash']), 0, 0).cash.points[0]).toBeCloseTo(900, 9)
    expect(simulate(t, levy(), 0, 0).cash.points[0]).toBe(1000)
  })
})

describe('rule cards: a tax played as a card, applying to the cards below it in its hand', () => {
  const iskCard = (id: string, rate = 0.01, startMonth?: number): Card => ({
    id,
    kind: 'rule',
    ...(startMonth === undefined ? {} : { startMonth }),
    rule: {
      id: `${id}-rule`,
      schedule: { kind: 'yearly', monthOfYear: 12 },
      target: { tags: ['fund'] },
      effect: { type: 'balanceTax', rate },
    },
  })
  const taggedFund = (id: string, initialBalance: number): Card => ({
    id,
    kind: 'asset',
    initialBalance,
    growth: { expected: 0 },
    tags: ['fund'],
  })

  it('a yearly balanceTax rule drains tagged fund balances below it, and moves no money itself', () => {
    const from = ym(2026, 1)
    const r = simulate(table([iskCard('isk'), taggedFund('f', 12000)]), {}, from, ym(2027, 1))
    const f = balance(r, 'f')
    expect(f[10]).toBe(12000)
    expect(f[11]).toBeCloseTo(11880, 9)
    expect(f[12]).toBeCloseTo(11880, 9)
    expect(contribution(r, 'isk').every((v) => v === 0)).toBe(true)
    expect(r.cash.points.every((v) => v === 0)).toBe(true)
  })

  it('position is the scope: a matching fund above the rule card is untouched', () => {
    const from = ym(2026, 1)
    const r = simulate(table([taggedFund('above', 1000), iskCard('isk'), taggedFund('below', 1000)]), {}, from, ym(2026, 12))
    expect(balance(r, 'above')[11]).toBe(1000)
    expect(balance(r, 'below')[11]).toBeCloseTo(990, 9)
  })

  it('the hand bounds the scope: a sibling fund outside the rule card’s hand is untouched', () => {
    const from = ym(2026, 1)
    const t = table([hand('isk-hand', [iskCard('isk'), taggedFund('inside', 1000)]), taggedFund('outside', 1000)])
    const r = simulate(t, {}, from, ym(2026, 12))
    expect(balance(r, 'inside')[11]).toBeCloseTo(990, 9)
    expect(balance(r, 'outside')[11]).toBe(1000)
  })

  it('a rule card reaches into nested hands below it — scope is the subtree underneath', () => {
    const from = ym(2026, 1)
    const t = table([iskCard('isk'), hand('funds', [taggedFund('nested', 1000)])])
    const r = simulate(t, {}, from, ym(2026, 12))
    expect(balance(r, 'nested')[11]).toBeCloseTo(990, 9)
  })

  it('a disabled hand takes its rule card off the table with it', () => {
    const from = ym(2026, 1)
    const t = table([hand('paused', [iskCard('isk')], false), taggedFund('f', 1000)])
    const r = simulate(t, {}, from, ym(2026, 12))
    expect(balance(r, 'f')[11]).toBe(1000)
  })

  it('a set-aside rule card stops firing', () => {
    const from = ym(2026, 1)
    const t = setCardEnabled(table([iskCard('isk'), taggedFund('f', 1000)]), 'isk', false)
    const r = simulate(t, {}, from, ym(2026, 12))
    expect(balance(r, 'f')[11]).toBe(1000)
  })

  it('startMonth gates the rule: no tax before the card enters play', () => {
    const from = ym(2026, 1)
    const t = table([iskCard('isk', 0.01, ym(2027, 1)), taggedFund('f', 1000)])
    const r = simulate(t, {}, from, ym(2027, 12))
    expect(balance(r, 'f')[11]).toBe(1000) // December 2026: card not in play yet
    expect(balance(r, 'f')[23]).toBeCloseTo(990, 9) // December 2027: it is
  })

  it('a rule card never reaches the cash vessel — cash lives outside every hand', () => {
    const t: Table = { ...table([]), cash: { initialBalance: 1000 } }
    t.root.children.push({
      id: 'levy',
      kind: 'rule',
      rule: { id: 'levy-rule', schedule: { kind: 'once', atMonth: 0 }, target: { cardIds: ['cash'] }, effect: { type: 'balanceTax', rate: 0.1 } },
    })
    expect(simulate(t, {}, 0, 0).cash.points[0]).toBe(1000)
  })

  it('a scoped flowTax rule taxes only the flows below it in its hand', () => {
    const gig: Card = { id: 'gig', kind: 'source', flow: { type: 'constant', value: 1000 }, tags: ['income'] }
    const salary: Card = { id: 'salary', kind: 'source', flow: { type: 'constant', value: 1000 }, tags: ['income'] }
    const flowTax: Card = {
      id: 'gig-tax',
      kind: 'rule',
      rule: { id: 'gig-tax-rule', schedule: { kind: 'monthly' }, target: { tags: ['income'] }, effect: { type: 'flowTax', rate: 0.5 } },
    }
    const r = simulate(table([salary, hand('side', [flowTax, gig])]), {}, 0, 0)
    expect(contribution(r, 'salary')[0]).toBe(1000)
    expect(contribution(r, 'gig')[0]).toBeCloseTo(500, 9)
  })
})

describe('hand takes: a hand may draw its starting subtotal from its parent', () => {
  const pctFund = (id: string, percent: number): Card => fund(id, 0, { type: 'percent', percent })

  it('a 100 % take is numerically identical to playing the same cards flat', () => {
    const budget = (): Card[] => [source('salary', 65000), taxDrain('tax', 0.3), drain('expenses', 20500)]
    const funds = (): Card[] => [1, 2, 3, 4, 5].map((i) => fund(`f${i}`, 0.07, { type: 'percent', percent: 0.2 }))
    const flat = simulate(table([...budget(), ...funds()]), {}, 0, 120)
    const nested = simulate(
      table([...budget(), { id: 'invest', kind: 'hand', take: { type: 'percent', percent: 1 }, children: funds() }]),
      {},
      0,
      120,
    )
    expect(nested.cash.points).toEqual(flat.cash.points)
    expect(nested.netWorth.points).toEqual(flat.netWorth.points)
    for (let i = 1; i <= 5; i++) expect(balance(nested, `f${i}`)).toEqual(balance(flat, `f${i}`))
  })

  it('a fixed take draws in full; the hand contributes leftover minus taken', () => {
    const t = table([
      source('salary', 10000),
      { id: 'invest', kind: 'hand', take: { type: 'fixed', amountPerMonth: 4000 }, children: [pctFund('f', 0.5)] },
    ])
    const r = simulate(t, {}, 0, 0)
    expect(balance(r, 'f')[0]).toBe(2000) // 50 % of the 4 000 the hand took
    expect(contribution(r, 'invest')[0]).toBe(-2000) // took 4 000, returned 2 000
    expect(r.cash.points[0]).toBe(8000)
  })

  it('a percent take reads max(0, parent total): nothing to sweep from an overdraft', () => {
    const t = table([
      drain('bill', 500),
      { id: 'invest', kind: 'hand', take: { type: 'percent', percent: 1 }, children: [pctFund('f', 1)] },
    ])
    const r = simulate(t, {}, 0, 0)
    expect(balance(r, 'f')[0]).toBe(0)
    expect(r.cash.points[0]).toBe(-500)
  })

  it('a take-less hand still starts from zero — recursion stays the scoping rule', () => {
    const r = simulate(table([source('salary', 10000), hand('scoped', [pctFund('f', 0.5)])]), {}, 0, 0)
    expect(balance(r, 'f')[0]).toBe(0)
    expect(r.cash.points[0]).toBe(10000)
  })
})

describe('determinism', () => {
  it('the same inputs produce byte-identical output — no hidden state', () => {
    const t = table([
      source('salary', 30000),
      taxDrain('tax', 0.3),
      fund('f', 0.07, { type: 'percent', percent: 0.4 }),
      hand('side', [source('gig', 2000), taxDrain('gig-tax', 0.5)]),
    ])
    const a = simulate(t, {}, 0, 600)
    const b = simulate(t, {}, 0, 600)
    expect(JSON.stringify(a)).toBe(JSON.stringify(b))
  })
})
