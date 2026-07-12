/**
 * The engine's data model. Everything here is plain serializable data —
 * tables, packs and scenarios are JSON, never code (DESIGN.md §3, §8).
 */

/** Card kinds. Kind alone determines what a card does in the pipeline (DESIGN.md §7). */
export type Kind = 'source' | 'drain' | 'asset' | 'debt' | 'hand' | 'rule'

/**
 * Growth is `(expected, volatility?)` from day one. The deterministic v1
 * engine uses only `expected`; volatility is carried for the later Monte
 * Carlo mode (DESIGN.md §8). Rates are annual, e.g. 0.07 = 7 %/yr.
 */
export interface GrowthParam {
  expected: number
  volatility?: number
}

/** A real historical monthly series. `startMonth` is an absolute month index. */
export interface SampledData {
  startMonth: number
  values: number[]
}

/**
 * Curve primitives — every card is a curve f(t) built from these.
 * `t` below is months since the card's start; sampled data is indexed by
 * absolute month, because history has dates.
 */
export type Curve =
  | { type: 'constant'; value: number }
  | { type: 'linear'; base: number; slopePerMonth: number }
  | { type: 'compound'; base: number; annualRate: GrowthParam }
  | { type: 'step'; initial: number; steps: { atMonth: number; value: number }[] } // atMonth: months since card start
  | { type: 'sinusoidal'; base: number; amplitude: number; periodMonths: number; phaseMonths?: number }
  | { type: 'sampled'; seriesId?: string; data?: SampledData }
  | { type: 'expression'; expr: string } // variables: t (local months), month (absolute)

export interface CardBase {
  id: string
  name?: string
  tags?: string[]
  /** Absolute month the card enters play. Defaults to the simulation start. */
  startMonth?: number
  /** Set aside (toggled off), the card — and everything under it — is skipped. Default true. */
  enabled?: boolean
}

/** Adds its flow (kr/month) to the running total. A raise is the curve's own growth. */
export interface SourceCard extends CardBase {
  kind: 'source'
  flow: Curve
}

/**
 * Subtracts from the running total: either a fixed curve (kr/month, stored
 * positive), or a share of the positive running total at its position —
 * which is how income tax is a card.
 */
export interface DrainCard extends CardBase {
  kind: 'drain'
  amount?: Curve
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
 * units at the current price). `take` is its monthly deposit.
 */
export interface AssetCard extends CardBase {
  kind: 'asset'
  initialBalance?: number
  growth?: GrowthParam
  /** Annual fee drag, e.g. 0.004 = 0.40 %/yr. */
  fee?: number
  price?: { seriesId?: string; data?: SampledData }
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
