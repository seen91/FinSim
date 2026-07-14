import type { Card, SampledData } from '@finsim/engine'
import type { GlyphName } from './icons'
import type { CardInstance, HandNode } from './instances'

/**
 * Preset hands: ready-made card collections you can import from the draw
 * pile — whole, or card by card. Each member card is a built-in canonical
 * ("preset:<key>", builtins.ts); importing deals INSTANCES of it, composed
 * into a fresh hand node with unique ids. Nested hands ("Financing" inside
 * "Buy the car") come out of the same mechanism — hands all the way down.
 *
 * Like a pack, a preset carries the series its cards wear (`series`):
 * importing the card lands the data in `world.series` too, so a priced
 * preset works on any table — fresh or long-saved.
 */
export interface PresetCard {
  key: string
  name: string
  glyph: GlyphName
  headline: string
  /** The canonical engine card every dealt instance resolves to. */
  card: Card
  /** Series this card samples — merged into `world.series` on import. */
  series?: Record<string, SampledData>
}

export interface HandPreset {
  id: string
  name: string
  glyph: GlyphName
  description: string
  cards: PresetCard[]
  build: (uid: string) => HandNode
  /** Series the hand's cards sample — merged into `world.series` on import. */
  series?: Record<string, SampledData>
}

/** A fresh instance of a preset member — type-local so presets stay import-light. */
function inst(key: string, uid: string): CardInstance {
  return { id: `${key}-${uid}`, ref: `preset:${key}` }
}

const salary: PresetCard = {
  key: 'salary',
  name: 'Salary',
  glyph: 'coins',
  headline: '+65 000 /mo gross',
  card: {
    id: 'salary',
    name: 'Salary',
    kind: 'source',
    flow: { type: 'compound', base: 65000, annualRate: { expected: 0 }, holdMonths: 12 },
    tags: ['income'],
  },
}

const incomeTax: PresetCard = {
  key: 'income-tax',
  name: 'Income tax',
  glyph: 'stamp',
  headline: '−30 %',
  card: { id: 'income-tax', name: 'Income tax', kind: 'drain', percent: 0.3 },
}

const expenses: PresetCard = {
  key: 'expenses',
  name: 'Living expenses',
  glyph: 'receipt',
  headline: '−20 500 /mo',
  card: { id: 'expenses', name: 'Living expenses', kind: 'drain', amount: { type: 'constant', value: 20500 } },
}

const FUND_NAMES = ['Index: Global', 'Index: Sverige', 'Index: USA', 'Index: Europa', 'Index: Asien']

function fundCard(index: number): PresetCard {
  const name = FUND_NAMES[index]!
  const key = `fund${index + 1}`
  return {
    key,
    name,
    glyph: 'trend',
    headline: '7 % /yr · takes 20 %',
    card: {
      id: key,
      name,
      kind: 'asset',
      growth: { expected: 0.07, volatility: 0.15 },
      take: { type: 'percent', percent: 0.2 },
      tags: ['equity', 'fund'],
    },
  }
}

const carValue: PresetCard = {
  key: 'car-value',
  name: 'Car',
  glyph: 'car',
  headline: '240 000 · −15 % /yr',
  card: { id: 'car-value', name: 'Car', kind: 'asset', initialBalance: 240000, growth: { expected: -0.15 } },
}

const carCosts: PresetCard = {
  key: 'car-costs',
  name: 'Running costs',
  glyph: 'receipt',
  headline: '−3 500 /mo',
  card: { id: 'car-costs', name: 'Running costs', kind: 'drain', amount: { type: 'constant', value: 3500 } },
}

const carLoan: PresetCard = {
  key: 'car-loan',
  name: 'Car loan',
  glyph: 'bank',
  headline: '240 000 @ 6 % · 4 300 /mo',
  card: {
    id: 'car-loan',
    name: 'Car loan',
    kind: 'debt',
    principal: 240000,
    interest: { expected: 0.06 },
    payment: { type: 'fixed', amountPerMonth: 4300 },
  },
}

const flatValue: PresetCard = {
  key: 'flat-value',
  name: 'Apartment',
  glyph: 'building',
  headline: '3,5 M · +3 % /yr',
  card: {
    id: 'flat-value',
    name: 'Apartment',
    kind: 'asset',
    initialBalance: 3_500_000,
    growth: { expected: 0.03 },
    tags: ['property'],
  },
}

const flatOutlay: PresetCard = {
  key: 'flat-outlay',
  name: 'Down payment',
  glyph: 'cash',
  headline: '−700 000, once',
  card: {
    id: 'flat-outlay',
    name: 'Down payment',
    kind: 'drain',
    amount: { type: 'step', initial: 700_000, steps: [{ atMonth: 1, value: 0 }] },
  },
}

const flatAvgift: PresetCard = {
  key: 'flat-avgift',
  name: 'Avgift & drift',
  glyph: 'home',
  headline: '−4 500 /mo',
  card: { id: 'flat-avgift', name: 'Avgift & drift', kind: 'drain', amount: { type: 'constant', value: 4500 } },
}

const mortgage: PresetCard = {
  key: 'mortgage',
  name: 'Mortgage',
  glyph: 'bank',
  headline: '2,8 M @ 4,5 % · 11 000 /mo',
  card: {
    id: 'mortgage',
    name: 'Mortgage',
    kind: 'debt',
    principal: 2_800_000,
    interest: { expected: 0.045 },
    payment: { type: 'fixed', amountPerMonth: 11000 },
  },
}

export const PRESETS: HandPreset[] = [
  {
    id: 'current-budget',
    name: 'Current budget',
    glyph: 'coins',
    description: 'Salary → tax → expenses → five index funds taking 20 % each, left to right.',
    cards: [salary, incomeTax, expenses, ...FUND_NAMES.map((_, i) => fundCard(i))],
    build: (uid) => ({
      id: `budget-${uid}`,
      name: 'Current budget',
      kind: 'hand',
      glyph: 'coins',
      children: [inst('salary', uid), inst('income-tax', uid), inst('expenses', uid), ...FUND_NAMES.map((_, i) => inst(`fund${i + 1}`, uid))],
    }),
  },
  {
    id: 'buy-the-car',
    name: 'Buy the car',
    glyph: 'car',
    description: 'Car and running costs, with a nested Financing hand holding the loan.',
    cards: [carValue, carCosts, carLoan],
    build: (uid) => ({
      id: `car-${uid}`,
      name: 'Buy the car',
      kind: 'hand',
      glyph: 'car',
      children: [
        inst('car-value', uid),
        inst('car-costs', uid),
        { id: `car-financing-${uid}`, name: 'Financing', kind: 'hand', children: [inst('car-loan', uid)] },
      ],
    }),
  },
  {
    id: 'buy-a-flat',
    name: 'Buy a flat',
    glyph: 'building',
    description: 'Apartment, down payment, avgift — and a nested Financing hand with the mortgage.',
    cards: [flatValue, flatOutlay, flatAvgift, mortgage],
    build: (uid) => ({
      id: `flat-${uid}`,
      name: 'Buy a flat',
      kind: 'hand',
      glyph: 'building',
      children: [
        inst('flat-value', uid),
        inst('flat-outlay', uid),
        inst('flat-avgift', uid),
        { id: `flat-financing-${uid}`, name: 'Financing', kind: 'hand', children: [inst('mortgage', uid)] },
      ],
    }),
  },
]
