import type { Card } from '@finsim/engine'
import type { GlyphName } from './icons'

/**
 * The card library: single-card blueprints you can play from the draw pile
 * (whole hands live in presets.ts). Every card is an engine card verbatim —
 * a tax is a % drain, a raise is the salary's own curve parameter, a fee is
 * an asset parameter. No modifiers, no targets: everything plays into the
 * pipeline.
 */
export interface Blueprint {
  id: string
  name: string
  kind: Card['kind']
  glyph: GlyphName
  /** Static headline shown on the card in the drawer, e.g. "+40 000 kr/mo". */
  headline: string
  description: string
  /** Instantiate a fresh engine card. */
  make: (uid: string) => Card
}

export const LIBRARY: Blueprint[] = [
  {
    id: 'salary',
    name: 'Salary',
    kind: 'source',
    glyph: 'coins',
    headline: '+40 000 kr/mo',
    description: 'Gross monthly pay. Play a tax below it — nobody keeps the gross.',
    make: (uid) => ({
      id: `salary-${uid}`,
      name: 'Salary',
      kind: 'source',
      flow: { type: 'compound', base: 40000, annualRate: { expected: 0 } },
      tags: ['income'],
    }),
  },
  {
    id: 'side-hustle',
    name: 'Side hustle',
    kind: 'source',
    glyph: 'briefcase',
    headline: '+6 000 kr/mo',
    description: 'Evenings and weekends, invoiced.',
    make: (uid) => ({
      id: `side-${uid}`,
      name: 'Side hustle',
      kind: 'source',
      flow: { type: 'compound', base: 6000, annualRate: { expected: 0 } },
      tags: ['income'],
    }),
  },
  {
    id: 'income-tax',
    name: 'Income tax',
    kind: 'drain',
    glyph: 'stamp',
    headline: '−30 %',
    description: 'Takes 30 % of whatever has flowed past so far. Position matters.',
    make: (uid) => ({ id: `tax-${uid}`, name: 'Income tax', kind: 'drain', percent: 0.3 }),
  },
  {
    id: 'rent',
    name: 'Rent',
    kind: 'drain',
    glyph: 'home',
    headline: '−12 000 kr/mo',
    description: 'A roof, monthly, first of the month.',
    make: (uid) => ({ id: `rent-${uid}`, name: 'Rent', kind: 'drain', amount: { type: 'constant', value: 12000 } }),
  },
  {
    id: 'expenses',
    name: 'Living expenses',
    kind: 'drain',
    glyph: 'receipt',
    headline: '−18 000 kr/mo',
    description: 'Food, phone, gym, the works.',
    make: (uid) => ({ id: `expenses-${uid}`, name: 'Living expenses', kind: 'drain', amount: { type: 'constant', value: 18000 } }),
  },
  {
    id: 'index-fund',
    name: 'Index fund',
    kind: 'asset',
    glyph: 'trend',
    headline: '7 % /yr · takes 10 %',
    description: 'Broad, boring, compounding. Takes 10 % of what remains at its position.',
    make: (uid) => ({
      id: `fund-${uid}`,
      name: 'Index fund',
      kind: 'asset',
      growth: { expected: 0.07, volatility: 0.15 },
      take: { type: 'percent', percent: 0.1 },
      tags: ['equity', 'fund'],
    }),
  },
  {
    id: 'savings',
    name: 'Savings account',
    kind: 'asset',
    glyph: 'vault',
    headline: '2,5 % /yr · 1 000 kr/mo',
    description: 'Sleeps well at night.',
    make: (uid) => ({
      id: `savings-${uid}`,
      name: 'Savings account',
      kind: 'asset',
      growth: { expected: 0.025 },
      take: { type: 'fixed', amountPerMonth: 1000 },
    }),
  },
  {
    id: 'empty-hand',
    name: 'New hand',
    kind: 'hand',
    glyph: 'bundle',
    headline: 'empty',
    description: 'A named, toggleable column of cards. Hands can hold hands.',
    make: (uid) => ({ id: `hand-${uid}`, name: 'New hand', kind: 'hand', children: [] }),
  },
]
