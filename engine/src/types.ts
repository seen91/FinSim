/**
 * The engine's data model. Everything here is plain serializable data —
 * tables, packs and scenarios are JSON, never code (DESIGN.md §3, §8).
 */

/** Card kinds. Kind alone determines where a card can be played (DESIGN.md §7). */
export type Kind = 'source' | 'asset' | 'debt' | 'modifier' | 'event'

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
 * `t` below is months since the stack's start; sampled data is indexed by
 * absolute month, because history has dates.
 */
export type Curve =
  | { type: 'constant'; value: number }
  | { type: 'linear'; base: number; slopePerMonth: number }
  | { type: 'compound'; base: number; annualRate: GrowthParam }
  | { type: 'step'; initial: number; steps: { atMonth: number; value: number }[] } // atMonth: months since stack start
  | { type: 'sinusoidal'; base: number; amplitude: number; periodMonths: number; phaseMonths?: number }
  | { type: 'sampled'; seriesId?: string; data?: SampledData }
  | { type: 'expression'; expr: string } // variables: t (local months), month (absolute)

export interface CardBase {
  id: string
  name?: string
  tags?: string[]
}

/** Produces a flow in kr/month. Positive = income, negative = expense. */
export interface SourceCard extends CardBase {
  kind: 'source'
  flow: Curve
}

/**
 * A balance with a growth curve. Either a growth-rate asset (funds, savings:
 * `initialBalance` + `growth`) or a priced asset (stocks, property: a price
 * curve plus units; inflows buy units at the current price).
 */
export interface AssetCard extends CardBase {
  kind: 'asset'
  initialBalance?: number
  growth?: GrowthParam
  price?: { seriesId?: string; data?: SampledData }
  initialUnits?: number
}

/** A positive principal accruing interest; reported as a negative balance. */
export interface DebtCard extends CardBase {
  kind: 'debt'
  principal: number
  interest: GrowthParam
}

/** Transforms applied to the stack below, composed bottom-up (DESIGN.md §7). */
export type ModifierSpec =
  | { type: 'taxRate'; rate: number } // flow ×(1 − rate)
  | { type: 'flowScale'; factor: number } // flow × factor
  | { type: 'flowOffset'; amountPerMonth: number } // flow + amount
  | { type: 'annualRaise'; rate: number } // flow ×(1 + rate)^floor(t/12) — yearly steps
  | { type: 'annualFee'; rate: number } // balance growth ×(1 − rate)^(1/12) per month
  | { type: 'expression'; expr: string } // flow transform; variables: f (input flow), t, month

export interface ModifierCard extends CardBase {
  kind: 'modifier'
  target: 'flow' | 'balance'
  modifier: ModifierSpec
}

/**
 * A scripted world change. Events are scenario-dealt, never drafted; the
 * engine applies them through the same scheduled-rule hooks as locale packs.
 */
export interface EventCard extends CardBase {
  kind: 'event'
  rule: ScheduledRule
}

/**
 * A stack: one base card (source/asset/debt) plus modifiers, one level deep.
 * `modifiers[0]` is closest to the base — `raise(tax(salary))` is
 * `modifiers: [tax, raise]`.
 */
export interface Stack {
  id: string
  name?: string
  base: SourceCard | AssetCard | DebtCard
  modifiers?: ModifierCard[]
  /** Absolute month the stack enters play. Defaults to the simulation start. */
  startMonth?: number
  /** Membership in a decision bundle; the whole bundle toggles as one unit. */
  bundleId?: string
}

export type StreamRule =
  | { type: 'fixed'; amountPerMonth: number }
  /**
   * Share of the surplus pool *remaining when this stream resolves* (streams
   * resolve in declared order, so "20 % of what's left after the mortgage"
   * is expressible and allocations can never exceed the pool).
   */
  | { type: 'percent'; percent: number }

/**
 * Cross-stack routing. All flow-stack output pools each month; streams draw
 * from the pool in declared order; the remainder lands in the cash account,
 * so the model never leaks money (DESIGN.md §2, §8).
 */
export interface Stream {
  id: string
  /** Target stack id (asset or debt), or 'cash'. */
  to: string
  rule: StreamRule
  bundleId?: string
  startMonth?: number
  /** Last month (inclusive) the stream runs. */
  endMonth?: number
}

/** A decision bundle: cards + streams played together that toggle as one. */
export interface Bundle {
  id: string
  name?: string
  enabled: boolean
}

export type RuleSchedule =
  | { kind: 'monthly' }
  | { kind: 'yearly'; monthOfYear: number } // 1..12, calendar month it fires
  | { kind: 'once'; atMonth: number } // absolute month

export interface RuleTarget {
  kinds?: Kind[]
  tags?: string[]
  stackIds?: string[]
}

/**
 * Effects locale packs and events can wire into the engine's hooks.
 * Flow effects apply after the stack's own modifiers; balance effects apply
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

/** The permanent cash vessel that catches all unrouted flow. */
export interface CashConfig {
  initialBalance?: number
  growth?: GrowthParam
}

export interface Assumptions {
  /** Table-level inflation; used by the real-terms view, not by the tick. */
  inflation?: GrowthParam
}

/** The table (simulator) / ledger (game): the full state of a financial life. */
export interface Table {
  stacks: Stack[]
  /** Declared order is resolution order. */
  streams: Stream[]
  bundles?: Bundle[]
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
  role: 'netWorth' | 'balance' | 'flow' | 'cash'
  startMonth: number
  points: number[]
}

export interface SimResult {
  from: number
  to: number
  netWorth: Series
  cash: Series
  /** One series per stack: balances for assets/debts (debts negative), net flow for sources. */
  stacks: Series[]
}
