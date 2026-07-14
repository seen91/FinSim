import type { Card, SampledData } from '@finsim/engine'
import { DEMO_SERIES_ID, demoSeriesData } from './demoSeries'
import type { GlyphName } from './icons'

/**
 * The card library: single-card blueprints you can play from the draw pile
 * (whole hands live in presets.ts). Every card is an engine card verbatim —
 * a tax is a % drain, a raise is the salary's own curve parameter, a fee is
 * an asset parameter, and an asset-class tax is a rule card that applies to
 * the cards below it in the hand it is played into. No modifiers: everything
 * plays into the pipeline.
 *
 * A blueprint is a built-in canonical card ("pile:<id>", builtins.ts): the
 * table holds instances of it, and its template here is the read-only math
 * they resolve to. `card.id` is a template placeholder — an instance keeps
 * its own id and the resolver rewrites the clone's.
 */
export interface Blueprint {
  id: string
  name: string
  glyph: GlyphName
  /** Static headline shown on the card in the drawer, e.g. "+40 000 /mo". */
  headline: string
  description: string
  /** The canonical engine card every dealt instance resolves to. */
  card: Card
  /** Series the card samples — merged into `world.series` when it is played (like a pack). */
  series?: Record<string, SampledData>
}

export const LIBRARY: Blueprint[] = [
  {
    id: 'salary',
    name: 'Salary',
    glyph: 'coins',
    headline: '+40 000 /mo',
    description: 'Gross monthly pay. Play a tax after it — nobody keeps the gross.',
    card: {
      id: 'salary',
      name: 'Salary',
      kind: 'source',
      flow: { type: 'compound', base: 40000, annualRate: { expected: 0 }, holdMonths: 12 },
      tags: ['income'],
    },
  },
  {
    id: 'side-hustle',
    name: 'Side hustle',
    glyph: 'briefcase',
    headline: '+6 000 /mo',
    description: 'Evenings and weekends, invoiced.',
    card: {
      id: 'side-hustle',
      name: 'Side hustle',
      kind: 'source',
      flow: { type: 'compound', base: 6000, annualRate: { expected: 0 }, holdMonths: 12 },
      tags: ['income'],
    },
  },
  {
    id: 'income-tax',
    name: 'Income tax',
    glyph: 'stamp',
    headline: '−30 %',
    description: 'Takes 30 % of whatever has flowed past so far. Position matters.',
    card: { id: 'income-tax', name: 'Income tax', kind: 'drain', percent: 0.3 },
  },
  {
    id: 'rent',
    name: 'Rent',
    glyph: 'home',
    headline: '−12 000 /mo',
    description: 'A roof, monthly, first of the month.',
    card: { id: 'rent', name: 'Rent', kind: 'drain', amount: { type: 'constant', value: 12000 } },
  },
  {
    id: 'expenses',
    name: 'Living expenses',
    glyph: 'receipt',
    headline: '−18 000 /mo',
    description: 'Food, phone, gym, the works.',
    card: { id: 'expenses', name: 'Living expenses', kind: 'drain', amount: { type: 'constant', value: 18000 } },
  },
  {
    id: 'index-fund',
    name: 'Index fund',
    glyph: 'trend',
    headline: '7 % /yr · takes 10 %',
    description:
      'Broad, boring, compounding. Takes 10 % of what remains at its position. 7 % CAGR ± 15 %/yr ≈ broad global equity over the long run; the fan on the chart shows what the ± does.',
    card: {
      id: 'index-fund',
      name: 'Index fund',
      kind: 'asset',
      growth: { expected: 0.07, volatility: 0.15 },
      take: { type: 'percent', percent: 0.1 },
      tags: ['equity', 'fund'],
    },
  },
  {
    id: 'demo-history',
    name: 'Demo index fund',
    glyph: 'trend',
    headline: 'priced 1970–2025 · 5 000 /mo',
    description:
      'A fund priced by 56 years of synthetic monthly history — deposits buy units at each month’s real price. Move the table’s start into the past to backtest through it; when the data ends, its generic 7 % ± 15 % takes over.',
    series: { [DEMO_SERIES_ID]: demoSeriesData() },
    card: {
      id: 'demo-history',
      name: 'Demo index fund',
      kind: 'asset',
      price: { seriesId: DEMO_SERIES_ID },
      growth: { expected: 0.07, volatility: 0.15 },
      take: { type: 'fixed', amountPerMonth: 5_000 },
      tags: ['equity', 'fund'],
    },
  },
  {
    id: 'isk-tax',
    name: 'ISK tax',
    glyph: 'percent',
    headline: '−0,89 % of funds /yr',
    description:
      'Swedish ISK schablonskatt as a card: every December it drains a deemed-yield tax from every fund below it in its hand. Swap the rate for your own regime — or model tax by lowering a fund’s growth instead.',
    card: {
      id: 'isk-tax',
      name: 'ISK tax',
      kind: 'rule',
      rule: {
        id: 'isk-tax-rule',
        schedule: { kind: 'yearly', monthOfYear: 12 },
        target: { tags: ['fund'] },
        // 30 % on a deemed yield of statslåneränta (1.96 % as of 2024-11-30) + 1 pp
        effect: { type: 'balanceTax', rate: 0.3 * (0.0196 + 0.01) },
      },
    },
  },
  {
    id: 'savings',
    name: 'Savings account',
    glyph: 'vault',
    headline: '2,5 % /yr · 1 000 /mo',
    description: 'Sleeps well at night.',
    card: {
      id: 'savings',
      name: 'Savings account',
      kind: 'asset',
      growth: { expected: 0.025 },
      take: { type: 'fixed', amountPerMonth: 1000 },
    },
  },
  {
    id: 'nest-egg',
    name: 'Nest egg',
    glyph: 'vault',
    headline: '100 000 up front',
    description: 'Money you already have. Starts on the table at full value — no waiting for deposits.',
    card: {
      id: 'nest-egg',
      name: 'Nest egg',
      kind: 'asset',
      initialBalance: 100_000,
      growth: { expected: 0.025 },
    },
  },
]
