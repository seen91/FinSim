/**
 * The engine's data model. Everything here is plain serializable data —
 * tables, packs and scenarios are JSON, never code (DESIGN.md §3, §8).
 */

/** Card kinds. Kind alone determines what a card does in the pipeline (DESIGN.md §7). */
export type Kind = 'source' | 'drain' | 'asset' | 'debt' | 'hand' | 'rule'

/**
 * Growth is `(expected, volatility?)` from day one. The deterministic engine
 * uses only `expected`; Monte Carlo mode (DESIGN.md §13 M3) samples the rest.
 * Rates are annual, e.g. 0.07 = 7 %/yr.
 *
 * `expected` is a CAGR: the deterministic path is (approximately) the median
 * of the Monte Carlo paths, not their mean — volatility drag is real and the
 * fan is honest about it.
 *
 * `correlation` is the card's loading on the one shared market factor
 * (§14.5, decided 2026-07-12): each month every path draws one market shock
 * Z, and a card's own shock is ρ·Z + √(1−ρ²)·ε with ε private to the card,
 * so two cards co-move with correlation ρᵢ·ρⱼ. Default 1 — index funds
 * tracking overlapping markets move as one; independent draws would badly
 * understate risk. Authors lower it for true diversifiers.
 */
export interface GrowthParam {
  expected: number
  volatility?: number
  /** Correlation with the shared market factor, −1..1. Default 1. */
  correlation?: number
}

/** A real historical monthly series. `startMonth` is an absolute month index. */
export interface SampledData {
  startMonth: number
  values: number[]
}

/** A reference to sampled data: inline, or by id into `world.series`. */
export interface SampledRef {
  seriesId?: string
  data?: SampledData
}

/**
 * Curve primitives — every card is a curve f(t) built from these.
 * `t` below is months since the card's start; sampled data is indexed by
 * absolute month, because history has dates.
 *
 * `holdMonths` is a sample-and-hold on `t`: the curve re-evaluates only every
 * `holdMonths` months and holds in between (t quantized to ⌊t/hold⌋·hold), so
 * a 3.5 %/yr compound salary with holdMonths 12 pays flat for a year and
 * steps on its anniversary — a raise, not a monthly creep. Absent = smooth
 * (every tick). It separates *when the number changes* from cadence (*how
 * often it pays*) and from the engine tick, which stays monthly. Steps land
 * on card anniversaries (local t) — unless `holdAnchor` (a calendar month
 * 1..12, requires holdMonths) pins them: anchor 1 lands every January (every
 * month ≡ January mod holdMonths), and the anchor month is when the new
 * value first applies. Not on `step` (its schedule is already explicit) or
 * `sampled` (history has its own dates).
 */
export type Curve =
  | { type: 'constant'; value: number }
  | { type: 'linear'; base: number; slopePerMonth: number; holdMonths?: number; holdAnchor?: number }
  | { type: 'compound'; base: number; annualRate: GrowthParam; holdMonths?: number; holdAnchor?: number }
  | { type: 'step'; initial: number; steps: { atMonth: number; value: number }[] } // atMonth: months since card start
  | { type: 'sinusoidal'; base: number; amplitude: number; periodMonths: number; phaseMonths?: number; holdMonths?: number; holdAnchor?: number }
  | ({ type: 'sampled' } & SampledRef)
  | { type: 'expression'; expr: string; holdMonths?: number; holdAnchor?: number } // variables: t (local months), month (absolute)

export interface CardBase {
  id: string
  name?: string
  tags?: string[]
  /** Absolute month the card enters play. Defaults to the simulation start. */
  startMonth?: number
  /** Set aside (toggled off), the card — and everything under it — is skipped. Default true. */
  enabled?: boolean
}

/**
 * The period a flow amount is expressed in (DESIGN.md §0 "Card cadence").
 * The engine's base tick stays monthly: a cadence only states the unit of
 * the card's amount, which the tick normalizes to kr/month with a fixed
 * average factor (weekly ×52/12, biweekly ×26/12, quarterly ×1/3, yearly
 * ×1/12). A yearly amount is smoothed across the year — a lump landing in a
 * specific month is a step/expression curve or a rule, not a cadence.
 */
export const CADENCES = ['weekly', 'biweekly', 'monthly', 'quarterly', 'yearly'] as const
export type Cadence = (typeof CADENCES)[number]

/** Adds its flow to the running total. A raise is the curve's own growth. */
export interface SourceCard extends CardBase {
  kind: 'source'
  /** kr per cadence period (kr/month unless a cadence says otherwise). */
  flow: Curve
  cadence?: Cadence
}

/**
 * Subtracts from the running total: either a fixed curve (kr per cadence
 * period, stored positive), or a share of the positive running total at its
 * position — which is how income tax is a card.
 */
export interface DrainCard extends CardBase {
  kind: 'drain'
  amount?: Curve
  /** Period `amount` is expressed in. A percent drain is a per-tick share and carries no cadence. */
  cadence?: Cadence
  percent?: number
}

/** How an asset's deposit or a debt's payment draws from the running total. */
export type Take =
  | { type: 'fixed'; amountPerMonth: number }
  /** Share of the positive running total at this card's position. */
  | { type: 'percent'; percent: number }

/**
 * A balance with a growth curve. Either a growth-rate asset (funds, savings:
 * `initialBalance` + `growth`, with an optional annual `fee` drag) or a
 * priced asset (stocks, property: a price curve plus units; deposits buy
 * units at the current price). `take` is its monthly deposit. On a priced
 * asset, `growth` is the generic component that takes over when the price
 * data runs out: the price extrapolates at that rate from the last real
 * price — and only that simulated stretch may be shocked by Monte Carlo.
 * Without one the price freezes.
 */
export interface AssetCard extends CardBase {
  kind: 'asset'
  initialBalance?: number
  growth?: GrowthParam
  /** Annual fee drag, e.g. 0.004 = 0.40 %/yr. */
  fee?: number
  price?: SampledRef
  initialUnits?: number
  take?: Take
}

/**
 * A positive principal accruing interest; reported as a negative balance.
 * Its monthly `payment` draws from the running total, capped at payoff —
 * money never leaves the pipeline for a paid-off debt.
 */
export interface DebtCard extends CardBase {
  kind: 'debt'
  principal: number
  interest: GrowthParam
  payment?: Take
}

/**
 * A named, toggleable, nestable collection — the grouping AND scoping
 * construct. A hand computes its own subtotal top to bottom and contributes
 * its net at its position in the parent (DESIGN.md §7). The subtotal starts
 * from zero, or — with a `take` — from what the hand draws out of the
 * parent's running total at its position, so "invest the surplus" hands can
 * hold percent-take cards that keep reading real money.
 */
export interface HandCard extends CardBase {
  kind: 'hand'
  /** Drawn from the parent's running total as this hand's starting subtotal. */
  take?: Take
  children: Card[]
}

export type Card = SourceCard | DrainCard | AssetCard | DebtCard | HandCard | RuleCard

/**
 * A scheduled rule played as a card. Like every other card it acts on what
 * comes after it: its effect applies to matching cards *below* it in its
 * hand (nested hands included), so an asset-class tax like ISK sits on top
 * of its funds. Cards above it are out of reach — position is the scope,
 * same as the rest of the pipeline. Scenario events reuse the same shape
 * through world rules instead, which see the whole table.
 */
export interface RuleCard extends CardBase {
  kind: 'rule'
  rule: ScheduledRule
}

export type RuleSchedule =
  | { kind: 'monthly' }
  | { kind: 'yearly'; monthOfYear: number } // 1..12, calendar month it fires
  | { kind: 'once'; atMonth: number } // absolute month

export interface RuleTarget {
  kinds?: Kind[]
  tags?: string[]
  cardIds?: string[]
}

/**
 * Effects locale packs and rule cards can wire into the engine's hooks.
 * Flow effects apply to matching source/drain amounts; balance effects apply
 * at the end of the month's tick.
 */
export type RuleEffect =
  | { type: 'flowTax'; rate: number } // matching flows ×(1 − rate)
  | { type: 'flowScale'; factor: number }
  | { type: 'balanceScale'; factor: number } // e.g. a crash: equity ×0.7
  | { type: 'balanceTax'; rate: number } // e.g. ISK schablonskatt: balance −= balance×rate

/**
 * Jurisdiction as data: the engine knows no locales; packs wire rules like
 * these into the hooks (DESIGN.md §8). Never `if (sweden)` in engine code.
 */
export interface ScheduledRule {
  id: string
  schedule: RuleSchedule
  target: RuleTarget
  effect: RuleEffect
}

/** The permanent cash vessel that catches whatever reaches the bottom of the root. */
export interface CashConfig {
  initialBalance?: number
  growth?: GrowthParam
}

export interface Assumptions {
  /** Table-level inflation; used by the real-terms view, not by the tick. */
  inflation?: GrowthParam
}

/** The table (simulator) / ledger (game): one root hand, played top to bottom. */
export interface Table {
  root: HandCard
  cash?: CashConfig
  assumptions?: Assumptions
}

/** The world a table is simulated against: shared data series and rules. */
export interface World {
  /** Named historical series from data packs, referenced by curves/prices. */
  series?: Record<string, SampledData>
  /** Locale-pack rules and scenario events. */
  rules?: ScheduledRule[]
}

/** One output curve. `points[i]` is the state at the end of month `startMonth + i`. */
export interface Series {
  id: string
  role: 'netWorth' | 'cash' | 'flow' | 'balance' | 'net'
  startMonth: number
  points: number[]
}

export interface SimResult {
  from: number
  to: number
  netWorth: Series
  cash: Series
  /**
   * One series per card: what it did to the running total each month
   * (sources positive, drains/takes negative, hands their net). Set-aside
   * cards and subtrees are all zero.
   */
  contributions: Series[]
  /** One series per asset/debt: its balance (debts negative). */
  balances: Series[]
}
