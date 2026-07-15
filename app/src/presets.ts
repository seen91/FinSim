import type { Card, Curve, SampledData } from '@finsim/engine'
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
  /** What it is and the assumptions behind the numbers — the card's footnote. */
  description?: string
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
  headline: '+40 000 /mo gross',
  description: 'Gross monthly pay, around the Swedish full-time median, with a 3 % raise landing every January. Flip it in the Workshop and make it your own gross and your own raise.',
  card: {
    id: 'salary',
    name: 'Salary',
    kind: 'source',
    flow: { type: 'compound', base: 40000, annualRate: { expected: 0.03 }, holdMonths: 12, holdAnchor: 1 },
    tags: ['income'],
  },
}

const incomeTax: PresetCard = {
  key: 'income-tax',
  name: 'Income tax',
  glyph: 'stamp',
  headline: '−30 %',
  description: 'A flat 30 % — close to a typical kommunalskatt. It takes 30 % of whatever flowed past above it, so its position in the hand matters.',
  card: { id: 'income-tax', name: 'Income tax', kind: 'drain', percent: 0.3 },
}

/**
 * Brytpunkten for statlig inkomstskatt, monthly (~643 100 kr/yr in 2025),
 * stepping every January like the salary's raise — skiktgränsen is
 * recalculated yearly at CPI + 2 percentage points, so 4 % stands in for a
 * 2 % inflation world. The shelter drain and its return source wear this
 * same curve: together they make the statlig drain between them see only
 * the part of the month above the threshold, because a percent drain never
 * taxes a negative subtotal. No bracket primitive in the engine — the
 * pipeline IS the bracket.
 */
const BRYTPUNKT: Curve = { type: 'compound', base: 53_600, annualRate: { expected: 0.04 }, holdMonths: 12, holdAnchor: 1 }

const brytShelter: PresetCard = {
  key: 'brytpunkt-shelter',
  name: 'Brytpunkten · shelter',
  glyph: 'vault',
  headline: '−53 600 /mo · hides the base',
  description:
    'Half of the bracket trick: hides everything below brytpunkten (~643 100 kr/yr, stepping 4 % each January — skiktgränsen follows CPI + 2 pp) so the statlig drain below only sees what is above it. Its twin gives the money back — edit the two as a pair.',
  card: { id: 'brytpunkt-shelter', name: 'Brytpunkten · shelter', kind: 'drain', amount: BRYTPUNKT },
}

const statligSkatt: PresetCard = {
  key: 'statlig-skatt',
  name: 'Statlig skatt',
  glyph: 'percent',
  headline: '−20 % above brytpunkten',
  description:
    'A plain 20 % drain — but the shelter above has already hidden the first 53 600 kr, and a percent drain never taxes a negative subtotal, so it bites only the part of the month above brytpunkten.',
  card: { id: 'statlig-skatt', name: 'Statlig skatt', kind: 'drain', percent: 0.2 },
}

const brytReturn: PresetCard = {
  key: 'brytpunkt-return',
  name: 'Brytpunkten · return',
  glyph: 'cash',
  headline: '+53 600 /mo · gives it back',
  description: 'The shelter’s twin: hands back exactly what the shelter hid, statlig skatt now paid. Keep its curve identical to the shelter’s.',
  card: { id: 'brytpunkt-return', name: 'Brytpunkten · return', kind: 'source', flow: BRYTPUNKT },
}

const kommunalskatt: PresetCard = {
  key: 'kommunalskatt',
  name: 'Kommunalskatt',
  glyph: 'stamp',
  headline: '−30 %',
  description:
    'The same flat 30 % as the Income tax card — a typical kommunalskatt with jobbskatteavdrag folded in — taking the rest of the month after the statlig steps above.',
  card: { id: 'kommunalskatt', name: 'Kommunalskatt', kind: 'drain', percent: 0.3 },
}

const expenses: PresetCard = {
  key: 'expenses',
  name: 'Living expenses',
  glyph: 'receipt',
  headline: '−20 500 /mo',
  description: 'Rent, food, phone, gym — the whole monthly burn in one card. Set it to yours, or split it into cards of its own.',
  card: { id: 'expenses', name: 'Living expenses', kind: 'drain', amount: { type: 'constant', value: 20500 } },
}

const buffer: PresetCard = {
  key: 'buffer',
  name: 'Savings buffer',
  glyph: 'vault',
  headline: '2,5 % /yr · 2 000 /mo',
  description: 'An emergency buffer on a savings account, filled with 2 000 kr a month before anything gets invested.',
  card: {
    id: 'buffer',
    name: 'Savings buffer',
    kind: 'asset',
    growth: { expected: 0.025 },
    take: { type: 'fixed', amountPerMonth: 2000 },
  },
}

const fund: PresetCard = {
  key: 'fund',
  name: 'Index fund: Global',
  glyph: 'trend',
  headline: '7 % /yr · takes 80 %',
  description: 'Broad global equity: 7 % CAGR ± 15 %/yr over the long run. Takes 80 % of the surplus that reaches it — the rest lands as cash.',
  card: {
    id: 'fund',
    name: 'Index fund: Global',
    kind: 'asset',
    growth: { expected: 0.07, volatility: 0.15 },
    take: { type: 'percent', percent: 0.8 },
    tags: ['equity', 'fund'],
  },
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
    description: 'Salary → tax → expenses → a savings buffer, then a global index fund taking 80 % of the surplus.',
    cards: [salary, incomeTax, expenses, buffer, fund],
    build: (uid) => ({
      id: `budget-${uid}`,
      name: 'Current budget',
      kind: 'hand',
      glyph: 'coins',
      children: [inst('salary', uid), inst('income-tax', uid), inst('expenses', uid), inst('buffer', uid), inst('fund', uid)],
    }),
  },
  {
    id: 'progressive-tax',
    name: 'Progressive income tax',
    glyph: 'stamp',
    description:
      'Kommunalskatt on everything, plus 20 % statlig skatt only on the part of the month above brytpunkten. Swap it in for the flat Income tax, right under your gross pay — its take reads whatever flowed past above it.',
    cards: [brytShelter, statligSkatt, brytReturn, kommunalskatt],
    build: (uid) => ({
      id: `tax-${uid}`,
      name: 'Progressive income tax',
      kind: 'hand',
      glyph: 'stamp',
      take: { type: 'percent', percent: 1 },
      children: [inst('brytpunkt-shelter', uid), inst('statlig-skatt', uid), inst('brytpunkt-return', uid), inst('kommunalskatt', uid)],
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
