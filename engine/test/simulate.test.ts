import { describe, expect, it } from 'vitest'
import { setBundleEnabled, simulate, ym, type Series, type Table, type World } from '../src/index.js'

const g = Math.pow(1.07, 1 / 12)

const source = (id: string, value: number): Table['stacks'][number] => ({
  id,
  base: { id: `${id}-card`, kind: 'source', flow: { type: 'constant', value } },
})
const fund = (id: string, expected = 0.07): Table['stacks'][number] => ({
  id,
  base: { id: `${id}-card`, kind: 'asset', growth: { expected } },
})
const stackSeries = (result: { stacks: Series[] }, id: string): Series => {
  const s = result.stacks.find((x) => x.id === id)
  if (!s) throw new Error(`no series ${id}`)
  return s
}

describe('the monthly tick', () => {
  it('unrouted flow lands in cash — the model never leaks money', () => {
    const table: Table = { stacks: [source('salary', 30000), source('rent', -12000)], streams: [] }
    const r = simulate(table, {}, 0, 2)
    expect(r.cash.points).toEqual([18000, 36000, 54000])
    expect(r.netWorth.points).toEqual([18000, 36000, 54000])
    expect(stackSeries(r, 'salary').points).toEqual([30000, 30000, 30000])
  })

  it('balances grow first, then receive inflows (annuity convention)', () => {
    const table: Table = {
      stacks: [source('salary', 1000), fund('f')],
      streams: [{ id: 's', to: 'f', rule: { type: 'fixed', amountPerMonth: 1000 } }],
    }
    const r = simulate(table, {}, 0, 2)
    const f = stackSeries(r, 'f').points
    expect(f[0]).toBeCloseTo(1000, 9)
    expect(f[1]).toBeCloseTo(1000 * g + 1000, 9)
    expect(f[2]).toBeCloseTo(1000 * g * g + 1000 * g + 1000, 9)
    expect(r.cash.points).toEqual([0, 0, 0])
  })

  it('an initial balance appears on the start tick without growth', () => {
    const table: Table = { stacks: [{ ...fund('f'), base: { id: 'f-card', kind: 'asset', initialBalance: 10000, growth: { expected: 0.07 } } }], streams: [] }
    const r = simulate(table, {}, 0, 1)
    expect(stackSeries(r, 'f').points[0]).toBe(10000)
    expect(stackSeries(r, 'f').points[1]).toBeCloseTo(10000 * g, 9)
  })

  it('volatility is carried but ignored by the deterministic v1 engine', () => {
    const flat: Table = { stacks: [fund('f'), source('s', 1000)], streams: [{ id: 'x', to: 'f', rule: { type: 'fixed', amountPerMonth: 1000 } }] }
    const vol: Table = JSON.parse(JSON.stringify(flat)) as Table
    ;(vol.stacks[0]!.base as { growth?: { expected: number; volatility?: number } }).growth = { expected: 0.07, volatility: 0.15 }
    expect(simulate(vol, {}, 0, 24).netWorth.points).toEqual(simulate(flat, {}, 0, 24).netWorth.points)
  })

  it('percent streams cascade over what remains, in declared order', () => {
    const table: Table = {
      stacks: [source('salary', 1000), fund('a', 0), fund('b', 0)],
      streams: [
        { id: 's1', to: 'a', rule: { type: 'percent', percent: 0.5 } },
        { id: 's2', to: 'b', rule: { type: 'percent', percent: 0.5 } },
      ],
    }
    const r = simulate(table, {}, 0, 0)
    expect(stackSeries(r, 'a').points[0]).toBe(500)
    expect(stackSeries(r, 'b').points[0]).toBe(250)
    expect(r.cash.points[0]).toBe(250)
  })

  it('fixed streams overdraw honestly: cash can go negative, percent streams see an empty pool', () => {
    const table: Table = {
      stacks: [source('salary', 100), fund('a', 0), fund('b', 0)],
      streams: [
        { id: 's1', to: 'a', rule: { type: 'fixed', amountPerMonth: 300 } },
        { id: 's2', to: 'b', rule: { type: 'percent', percent: 0.5 } },
      ],
    }
    const r = simulate(table, {}, 0, 0)
    expect(stackSeries(r, 'a').points[0]).toBe(300)
    expect(stackSeries(r, 'b').points[0]).toBe(0) // 50% of max(0, -200)
    expect(r.cash.points[0]).toBe(-200)
    expect(r.netWorth.points[0]).toBe(100)
  })

  it('streams respect startMonth and endMonth', () => {
    const table: Table = {
      stacks: [source('salary', 1000), fund('f', 0)],
      streams: [{ id: 's', to: 'f', rule: { type: 'fixed', amountPerMonth: 1000 }, startMonth: 1, endMonth: 1 }],
    }
    const r = simulate(table, {}, 0, 2)
    expect(stackSeries(r, 'f').points).toEqual([0, 1000, 1000])
    expect(r.cash.points).toEqual([1000, 1000, 2000])
  })

  it('a stack that starts later contributes nothing before its start month', () => {
    const table: Table = {
      stacks: [
        { ...source('side-gig', 5000), startMonth: 2 },
        { ...fund('f', 0), base: { id: 'f-card', kind: 'asset', initialBalance: 700, growth: { expected: 0 } }, startMonth: 1 },
      ],
      streams: [],
    }
    const r = simulate(table, {}, 0, 3)
    expect(stackSeries(r, 'side-gig').points).toEqual([0, 0, 5000, 5000])
    expect(stackSeries(r, 'f').points).toEqual([0, 700, 700, 700])
    expect(r.netWorth.points).toEqual([0, 700, 5700, 10700])
    expect(() => simulate({ stacks: [{ ...fund('x'), startMonth: -1 }], streams: [] }, {}, 0, 1)).toThrow(/before the simulation start/)
  })

  it('debts accrue interest, absorb payments, refund overpayment and go inert at zero', () => {
    // 0% interest keeps the arithmetic bare: 3500 principal, 1000/mo payment.
    const table: Table = {
      stacks: [source('salary', 1000), { id: 'loan', base: { id: 'loan-card', kind: 'debt', principal: 3500, interest: { expected: 0 } } }],
      streams: [{ id: 'pay', to: 'loan', rule: { type: 'fixed', amountPerMonth: 1000 } }],
    }
    const r = simulate(table, {}, 0, 4)
    // start tick: 3500 - 1000; paid down 1000/mo; tick 3 needs only 500 → 500 refunded to cash; tick 4 stream inert.
    expect(stackSeries(r, 'loan').points).toEqual([-2500, -1500, -500, 0, 0])
    expect(r.cash.points).toEqual([0, 0, 0, 500, 1500])
    expect(r.netWorth.points).toEqual([-2500, -1500, -500, 500, 1500])
  })

  it('debt interest compounds monthly at the annual rate', () => {
    const table: Table = {
      stacks: [{ id: 'loan', base: { id: 'l', kind: 'debt', principal: 100000, interest: { expected: 0.06 } } }],
      streams: [],
    }
    const r = simulate(table, {}, 0, 12)
    const monthly = Math.pow(1.06, 1 / 12)
    expect(stackSeries(r, 'loan').points[0]).toBe(-100000)
    expect(stackSeries(r, 'loan').points[12]).toBeCloseTo(-100000 * Math.pow(monthly, 12), 6)
    expect(r.netWorth.points[12]).toBeCloseTo(-106000, 6)
  })

  it('priced assets buy units at the current price; value tracks the series', () => {
    const table: Table = {
      stacks: [
        source('salary', 1100),
        { id: 'msft', base: { id: 'm', kind: 'asset', price: { data: { startMonth: 0, values: [100, 110, 121] } }, tags: ['equity'] } },
      ],
      streams: [{ id: 'buy', to: 'msft', rule: { type: 'fixed', amountPerMonth: 1100 } }],
    }
    const r = simulate(table, {}, 0, 2)
    // tick 0: 11 units @100 → 1100. tick 1: +10 units @110, 21 units → 2310. tick 2: +1100/121 units → 30.0909… @121 → 3641.
    expect(stackSeries(r, 'msft').points[0]).toBeCloseTo(1100, 9)
    expect(stackSeries(r, 'msft').points[1]).toBeCloseTo(2310, 9)
    expect(stackSeries(r, 'msft').points[2]).toBeCloseTo(3641, 9)
  })

  it('priced assets can start from initial units and gain nothing but price', () => {
    const table: Table = {
      stacks: [{ id: 'msft', base: { id: 'm', kind: 'asset', price: { data: { startMonth: 0, values: [100, 90, 130] } }, initialUnits: 5 } }],
      streams: [],
    }
    const r = simulate(table, {}, 0, 2)
    expect(stackSeries(r, 'msft').points).toEqual([500, 450, 650])
  })

  it('simulating past the end of a price series is an error, not a guess', () => {
    const table: Table = {
      stacks: [{ id: 'msft', base: { id: 'm', kind: 'asset', price: { data: { startMonth: 0, values: [100] } }, initialUnits: 1 } }],
      streams: [],
    }
    expect(() => simulate(table, {}, 0, 1)).toThrow(/no data/)
  })

  it('cash can bear interest', () => {
    const table: Table = { stacks: [source('s', 1000)], streams: [], cash: { initialBalance: 12000, growth: { expected: 0.02 } } }
    const r = simulate(table, {}, 0, 1)
    expect(r.cash.points[0]).toBe(13000)
    expect(r.cash.points[1]).toBeCloseTo(13000 * Math.pow(1.02, 1 / 12) + 1000, 9)
  })

  it('rejects invalid tables and ranges', () => {
    expect(() => simulate({ stacks: [fund('cash')], streams: [] }, {}, 0, 1)).toThrow(/invalid table/)
    expect(() => simulate({ stacks: [], streams: [] }, {}, 5, 4)).toThrow(/invalid range/)
  })
})

describe('jurisdiction hooks (rules as data — no if(sweden) anywhere)', () => {
  it('a monthly flowTax rule taxes matching flows after their own modifiers', () => {
    const table: Table = {
      stacks: [{
        id: 'salary',
        base: { id: 's', kind: 'source', flow: { type: 'constant', value: 10000 }, tags: ['income'] },
        modifiers: [{ id: 'half', kind: 'modifier', target: 'flow', modifier: { type: 'flowScale', factor: 0.5 } }],
      }],
      streams: [],
    }
    const world: World = {
      rules: [{ id: 'income-tax', schedule: { kind: 'monthly' }, target: { tags: ['income'] }, effect: { type: 'flowTax', rate: 0.3 } }],
    }
    const r = simulate(table, world, 0, 0)
    expect(stackSeries(r, 'salary').points[0]).toBeCloseTo(10000 * 0.5 * 0.7, 9)
  })

  it('a yearly balanceTax rule models schablonskatt-style wealth taxes', () => {
    const from = ym(2026, 1)
    const table: Table = {
      stacks: [{ id: 'isk', base: { id: 'i', kind: 'asset', initialBalance: 12000, growth: { expected: 0 }, tags: ['isk'] } }],
      streams: [],
    }
    const world: World = {
      rules: [{ id: 'schablonskatt', schedule: { kind: 'yearly', monthOfYear: 12 }, target: { tags: ['isk'] }, effect: { type: 'balanceTax', rate: 0.01 } }],
    }
    const r = simulate(table, world, from, ym(2027, 1))
    const isk = stackSeries(r, 'isk').points
    expect(isk[10]).toBe(12000) // Nov 2026
    expect(isk[11]).toBeCloseTo(11880, 9) // Dec 2026: −1%
    expect(isk[12]).toBeCloseTo(11880, 9) // Jan 2027
  })

  it('a once balanceScale rule models a crash event hitting tagged assets only', () => {
    const table: Table = {
      stacks: [
        { id: 'stocks', base: { id: 's', kind: 'asset', initialBalance: 1000, growth: { expected: 0 }, tags: ['equity'] } },
        { id: 'savings', base: { id: 'b', kind: 'asset', initialBalance: 1000, growth: { expected: 0 } } },
      ],
      streams: [],
    }
    const world: World = {
      rules: [{ id: 'crash', schedule: { kind: 'once', atMonth: 1 }, target: { kinds: ['asset'], tags: ['equity'] }, effect: { type: 'balanceScale', factor: 0.7 } }],
    }
    const r = simulate(table, world, 0, 2)
    expect(stackSeries(r, 'stocks').points).toEqual([1000, 700, 700])
    expect(stackSeries(r, 'savings').points).toEqual([1000, 1000, 1000])
    expect(r.netWorth.points).toEqual([2000, 1700, 1700])
  })

  it('rules target cash only when addressed explicitly by id', () => {
    const table: Table = { stacks: [], streams: [], cash: { initialBalance: 1000 } }
    const world: World = {
      rules: [{ id: 'levy', schedule: { kind: 'once', atMonth: 0 }, target: { stackIds: ['cash'] }, effect: { type: 'balanceTax', rate: 0.1 } }],
    }
    expect(simulate(table, world, 0, 0).cash.points[0]).toBeCloseTo(900, 9)
    const untargeted: World = {
      rules: [{ id: 'levy', schedule: { kind: 'once', atMonth: 0 }, target: { kinds: ['asset'] }, effect: { type: 'balanceTax', rate: 0.1 } }],
    }
    expect(simulate(table, untargeted, 0, 0).cash.points[0]).toBe(1000)
  })
})

describe('decision bundles', () => {
  const table: Table = {
    stacks: [
      source('salary', 10000),
      { ...source('car-costs', -2000), bundleId: 'car' },
      { ...fund('car-value', -0.15), base: { id: 'cv', kind: 'asset', initialBalance: 100000, growth: { expected: -0.15 } }, bundleId: 'car' },
    ],
    streams: [],
    bundles: [{ id: 'car', enabled: true }],
  }

  it('disabled bundles remove their stacks and streams entirely', () => {
    const off = setBundleEnabled(table, 'car', false)
    const r = simulate(off, {}, 0, 1)
    expect(r.stacks.map((s) => s.id)).toEqual(['salary'])
    expect(r.netWorth.points).toEqual([10000, 20000])
  })

  it('enabled bundles participate fully', () => {
    const r = simulate(table, {}, 0, 0)
    expect(r.netWorth.points[0]).toBe(10000 - 2000 + 100000)
  })

  it('setBundleEnabled does not mutate and rejects unknown bundles', () => {
    const off = setBundleEnabled(table, 'car', false)
    expect(table.bundles![0]!.enabled).toBe(true)
    expect(off.bundles![0]!.enabled).toBe(false)
    expect(() => setBundleEnabled(table, 'nope', false)).toThrow(/unknown bundle/)
  })

  it('a stream into a disabled bundle target is inert; its money stays in the pool', () => {
    const t: Table = {
      stacks: [source('salary', 1000), { ...fund('boat', 0), bundleId: 'boat' }],
      streams: [{ id: 's', to: 'boat', rule: { type: 'fixed', amountPerMonth: 500 } }],
      bundles: [{ id: 'boat', enabled: false }],
    }
    const r = simulate(t, {}, 0, 0)
    expect(r.cash.points[0]).toBe(1000)
  })
})

describe('determinism', () => {
  it('the same inputs produce byte-identical output — no hidden state', () => {
    const table: Table = {
      stacks: [source('salary', 30000), fund('f')],
      streams: [{ id: 's', to: 'f', rule: { type: 'percent', percent: 0.4 } }],
    }
    const a = simulate(table, {}, 0, 600)
    const b = simulate(table, {}, 0, 600)
    expect(JSON.stringify(a)).toBe(JSON.stringify(b))
  })
})
