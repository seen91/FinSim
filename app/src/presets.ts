import type { Card, HandCard } from '@finsim/engine'
import type { GlyphName } from './icons'

/**
 * Preset hands: ready-made card collections you can import from the draw
 * pile — whole, or card by card. A preset builds fresh engine cards with
 * unique ids on every import. Nested hands ("Financing" inside "Buy the
 * car") come out of the same mechanism — hands all the way down.
 */
export interface PresetCard {
  key: string
  name: string
  glyph: GlyphName
  headline: string
  make: (uid: string) => Card
}

export interface HandPreset {
  id: string
  name: string
  glyph: GlyphName
  description: string
  cards: PresetCard[]
  build: (uid: string) => HandCard
}

const salary: PresetCard = {
  key: 'salary',
  name: 'Salary',
  glyph: 'coins',
  headline: '+65 000 /mo gross',
  make: (uid) => ({
    id: `salary-${uid}`,
    name: 'Salary',
    kind: 'source',
    flow: { type: 'compound', base: 65000, annualRate: { expected: 0 } },
    tags: ['income'],
  }),
}

const incomeTax: PresetCard = {
  key: 'income-tax',
  name: 'Income tax',
  glyph: 'stamp',
  headline: '−30 %',
  make: (uid) => ({ id: `tax-${uid}`, name: 'Income tax', kind: 'drain', percent: 0.3 }),
}

const expenses: PresetCard = {
  key: 'expenses',
  name: 'Living expenses',
  glyph: 'receipt',
  headline: '−20 500 /mo',
  make: (uid) => ({ id: `expenses-${uid}`, name: 'Living expenses', kind: 'drain', amount: { type: 'constant', value: 20500 } }),
}

const FUND_NAMES = ['Index: Global', 'Index: Sverige', 'Index: USA', 'Index: Europa', 'Index: Asien']

function fundCard(index: number): PresetCard {
  const name = FUND_NAMES[index]!
  return {
    key: `fund${index + 1}`,
    name,
    glyph: 'trend',
    headline: '7 % /yr · takes 20 %',
    make: (uid) => ({
      id: `fund${index + 1}-${uid}`,
      name,
      kind: 'asset',
      growth: { expected: 0.07, volatility: 0.15 },
      take: { type: 'percent', percent: 0.2 },
      tags: ['equity', 'fund'],
    }),
  }
}

const carValue: PresetCard = {
  key: 'car-value',
  name: 'Car',
  glyph: 'car',
  headline: '240 000 · −15 % /yr',
  make: (uid) => ({ id: `car-value-${uid}`, name: 'Car', kind: 'asset', initialBalance: 240000, growth: { expected: -0.15 } }),
}

const carCosts: PresetCard = {
  key: 'car-costs',
  name: 'Running costs',
  glyph: 'receipt',
  headline: '−3 500 /mo',
  make: (uid) => ({ id: `car-costs-${uid}`, name: 'Running costs', kind: 'drain', amount: { type: 'constant', value: 3500 } }),
}

const carLoan: PresetCard = {
  key: 'car-loan',
  name: 'Car loan',
  glyph: 'bank',
  headline: '240 000 @ 6 % · 4 300 /mo',
  make: (uid) => ({
    id: `car-loan-${uid}`,
    name: 'Car loan',
    kind: 'debt',
    principal: 240000,
    interest: { expected: 0.06 },
    payment: { type: 'fixed', amountPerMonth: 4300 },
  }),
}

const flatValue: PresetCard = {
  key: 'flat-value',
  name: 'Apartment',
  glyph: 'building',
  headline: '3,5 M · +3 % /yr',
  make: (uid) => ({
    id: `flat-value-${uid}`,
    name: 'Apartment',
    kind: 'asset',
    initialBalance: 3_500_000,
    growth: { expected: 0.03 },
    tags: ['property'],
  }),
}

const flatOutlay: PresetCard = {
  key: 'flat-outlay',
  name: 'Down payment',
  glyph: 'cash',
  headline: '−700 000, once',
  make: (uid) => ({
    id: `flat-outlay-${uid}`,
    name: 'Down payment',
    kind: 'drain',
    amount: { type: 'step', initial: 700_000, steps: [{ atMonth: 1, value: 0 }] },
  }),
}

const flatAvgift: PresetCard = {
  key: 'flat-avgift',
  name: 'Avgift & drift',
  glyph: 'home',
  headline: '−4 500 /mo',
  make: (uid) => ({ id: `flat-avgift-${uid}`, name: 'Avgift & drift', kind: 'drain', amount: { type: 'constant', value: 4500 } }),
}

const mortgage: PresetCard = {
  key: 'mortgage',
  name: 'Mortgage',
  glyph: 'bank',
  headline: '2,8 M @ 4,5 % · 11 000 /mo',
  make: (uid) => ({
    id: `flat-loan-${uid}`,
    name: 'Mortgage',
    kind: 'debt',
    principal: 2_800_000,
    interest: { expected: 0.045 },
    payment: { type: 'fixed', amountPerMonth: 11000 },
  }),
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
      children: [salary.make(uid), incomeTax.make(uid), expenses.make(uid), ...FUND_NAMES.map((_, i) => fundCard(i).make(uid))],
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
      children: [
        carValue.make(uid),
        carCosts.make(uid),
        { id: `car-financing-${uid}`, name: 'Financing', kind: 'hand', children: [carLoan.make(uid)] },
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
      children: [
        flatValue.make(uid),
        flatOutlay.make(uid),
        flatAvgift.make(uid),
        { id: `flat-financing-${uid}`, name: 'Financing', kind: 'hand', children: [mortgage.make(uid)] },
      ],
    }),
  },
]
