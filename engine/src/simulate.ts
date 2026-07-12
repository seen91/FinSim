import { evalCurve, monthlyFactor, periodsPerMonth, resolveSampled, sampleAt } from './curves.js'
import { allCards } from './tree.js'
import type {
  AssetCard,
  Card,
  DebtCard,
  HandCard,
  RuleEffect,
  RuleSchedule,
  RuleTarget,
  SampledData,
  ScheduledRule,
  Series,
  SimResult,
  Table,
  Take,
  World,
} from './types.js'
import { CASH_ID, validateTable } from './validate.js'

/**
 * The monthly tick (DESIGN.md §7–8): play the root hand top to bottom.
 * Each card acts on a running monthly total —
 *
 *   - a source adds its curve — normalized from its cadence to kr/month —
 *     (after jurisdiction flow rules);
 *   - a drain subtracts a fixed curve (normalized the same way), or a share
 *     of the positive total;
 *   - an asset grows (net of fee), then takes its deposit from the total;
 *   - a debt accrues interest, then takes its payment, capped at payoff;
 *   - a nested hand computes its own subtotal — from zero, or from what its
 *     `take` draws out of the parent's running total — and contributes its
 *     net at its position — recursion is the scoping rule;
 *   - a rule card moves no money itself: its scheduled rule applies to
 *     matching cards *below* it in its hand (nested hands included) — a tax
 *     played as a card, positional like everything else.
 *
 * Whatever reaches the bottom of the root lands in cash. Then scheduled
 * balance rules (taxes, crashes) fire — world rules table-wide, rule-card
 * rules below their card. Conventions the closed-form tests rely on:
 *
 *   - Series point `i` is the state at the *end* of month `from + i`.
 *   - On a card's start month its initial balance appears and it takes its
 *     deposit/payment, but no growth/interest — nothing existed during that
 *     month.
 *   - Fixed drains/takes always draw in full (the running total may go
 *     negative: an honest overdraft, never leaked money). Percent cards read
 *     `max(0, total)` at their position.
 */

interface AssetState {
  card: AssetCard
  factor: number
  data: SampledData | null
  balance: number
  units: number
  start: number
}

interface DebtState {
  card: DebtCard
  monthlyRate: number
  balance: number
  start: number
}

function scheduleMatches(schedule: RuleSchedule, month: number): boolean {
  switch (schedule.kind) {
    case 'monthly':
      return true
    case 'yearly':
      return month % 12 === schedule.monthOfYear - 1
    case 'once':
      return month === schedule.atMonth
  }
}

function targetMatches(target: RuleTarget, card: Card): boolean {
  if (target.cardIds && !target.cardIds.includes(card.id)) return false
  if (target.kinds && !target.kinds.includes(card.kind)) return false
  if (target.tags) {
    const tags = card.tags ?? []
    if (!target.tags.some((t) => tags.includes(t))) return false
  }
  return true
}

/** The cash account is only ever targeted explicitly, by id. */
function targetsCash(target: RuleTarget): boolean {
  return target.cardIds?.includes(CASH_ID) ?? false
}

function applyFlowEffect(effect: RuleEffect, flow: number, ruleId: string): number {
  switch (effect.type) {
    case 'flowTax':
      return flow * (1 - effect.rate)
    case 'flowScale':
      return flow * effect.factor
    default:
      throw new Error(`Rule "${ruleId}": ${effect.type} is not a flow effect`)
  }
}

function applyBalanceEffect(effect: RuleEffect, balance: number, ruleId: string): number {
  switch (effect.type) {
    case 'balanceScale':
      return balance * effect.factor
    case 'balanceTax':
      return balance * (1 - effect.rate)
    default:
      throw new Error(`Rule "${ruleId}": ${effect.type} is not a balance effect`)
  }
}

function takeAmount(take: Take, total: number): number {
  return take.type === 'fixed' ? take.amountPerMonth : take.percent * Math.max(0, total)
}

/** Negate without ever emitting IEEE −0 into a series. */
function neg(x: number): number {
  return x === 0 ? 0 : -x
}

export function simulate(table: Table, world: World, from: number, to: number): SimResult {
  if (!Number.isInteger(from) || !Number.isInteger(to) || from > to) {
    throw new Error(`simulate: invalid range ${from}..${to}`)
  }
  const errors = validateTable(table)
  if (errors.length > 0) {
    throw new Error(`simulate: invalid table:\n- ${errors.join('\n- ')}`)
  }

  const cards = allCards(table.root)
  for (const card of cards) {
    const start = card.startMonth ?? from
    if (start < from) throw new Error(`Card "${card.id}" starts at ${start}, before the simulation start ${from}`)
  }

  // A rule in play: world rules see the whole table (scope null); a rule
  // card sees only the cards below it in its hand (nested hands included),
  // from the card's start — positional, like the rest of the pipeline.
  interface ActiveRule {
    rule: ScheduledRule
    scope: Set<string> | null
    start: number
  }
  const activeRules: ActiveRule[] = (world.rules ?? []).map((rule) => ({ rule, scope: null, start: from }))
  const collectRuleCards = (hand: HandCard): void => {
    for (const [index, child] of hand.children.entries()) {
      if (child.enabled === false) continue
      if (child.kind === 'rule') {
        const below = hand.children.slice(index + 1).flatMap((c) => (c.kind === 'hand' ? [c, ...allCards(c)] : [c]))
        activeRules.push({ rule: child.rule, scope: new Set(below.map((c) => c.id)), start: child.startMonth ?? from })
      } else if (child.kind === 'hand') {
        collectRuleCards(child)
      }
    }
  }
  collectRuleCards(table.root)
  const isFlow = (r: ActiveRule): boolean => r.rule.effect.type === 'flowTax' || r.rule.effect.type === 'flowScale'
  const flowRules = activeRules.filter(isFlow)
  const balanceRules = activeRules.filter((r) => !isFlow(r))
  const ruleApplies = (r: ActiveRule, card: Card, month: number): boolean =>
    month >= r.start && (r.scope === null || r.scope.has(card.id)) && targetMatches(r.rule.target, card)

  const assetStates = new Map<string, AssetState>()
  const debtStates = new Map<string, DebtState>()
  for (const card of cards) {
    if (card.kind === 'asset') {
      assetStates.set(card.id, {
        card,
        factor: monthlyFactor(card.growth?.expected ?? 0) * monthlyFactor(-(card.fee ?? 0)),
        data: card.price ? resolveSampled(card.price, world, `Asset "${card.id}" price`) : null,
        balance: 0,
        units: 0,
        start: card.startMonth ?? from,
      })
    } else if (card.kind === 'debt') {
      debtStates.set(card.id, {
        card,
        monthlyRate: monthlyFactor(card.interest.expected) - 1,
        balance: 0,
        start: card.startMonth ?? from,
      })
    }
  }

  const cashFactor = monthlyFactor(table.cash?.growth?.expected ?? 0)
  let cash = table.cash?.initialBalance ?? 0

  const n = to - from + 1
  const contributions = new Map<string, number[]>(cards.map((c) => [c.id, new Array<number>(n).fill(0)]))
  const balancePoints = new Map<string, number[]>(
    cards.filter((c) => c.kind === 'asset' || c.kind === 'debt').map((c) => [c.id, new Array<number>(n).fill(0)]),
  )
  const cashPoints = new Array<number>(n).fill(0)
  const netWorthPoints = new Array<number>(n).fill(0)

  const applyFlowRules = (card: Card, flow: number, month: number): number => {
    for (const r of flowRules) {
      if (scheduleMatches(r.rule.schedule, month) && ruleApplies(r, card, month)) {
        flow = applyFlowEffect(r.rule.effect, flow, r.rule.id)
      }
    }
    return flow
  }

  /** Play one hand for one month: children top to bottom, starting from what the hand took from its parent (zero without a take). */
  const playHand = (hand: HandCard, month: number, i: number, initial: number): number => {
    let total = initial
    for (const card of hand.children) {
      if (card.enabled === false) continue
      const start = card.startMonth ?? from
      if (month < start && card.kind !== 'hand') continue
      const t = month - start
      switch (card.kind) {
        case 'source': {
          const flow = applyFlowRules(card, evalCurve(card.flow, { t, month, world }) * periodsPerMonth(card.cadence), month)
          total += flow
          contributions.get(card.id)![i] = flow
          break
        }
        case 'drain': {
          const drawn =
            card.percent !== undefined
              ? card.percent * Math.max(0, total)
              : applyFlowRules(card, evalCurve(card.amount!, { t, month, world }) * periodsPerMonth(card.cadence), month)
          total -= drawn
          contributions.get(card.id)![i] = neg(drawn)
          break
        }
        case 'asset': {
          const state = assetStates.get(card.id)!
          if (state.data) {
            const price = sampleAt(state.data, month, `Asset "${card.id}" price`)
            if (month === state.start) state.units = card.initialUnits ?? (card.initialBalance ?? 0) / price
            const deposit = card.take ? takeAmount(card.take, total) : 0
            if (deposit !== 0) {
              if (price <= 0) throw new Error(`Asset "${card.id}": cannot buy at non-positive price ${price}`)
              state.units += deposit / price
            }
            total -= deposit
            contributions.get(card.id)![i] = neg(deposit)
            state.balance = state.units * price
          } else {
            if (month === state.start) state.balance = card.initialBalance ?? 0
            else state.balance *= state.factor
            const deposit = card.take ? takeAmount(card.take, total) : 0
            state.balance += deposit
            total -= deposit
            contributions.get(card.id)![i] = neg(deposit)
          }
          balancePoints.get(card.id)![i] = state.balance
          break
        }
        case 'debt': {
          const state = debtStates.get(card.id)!
          if (month === state.start) state.balance = card.principal
          else state.balance *= 1 + state.monthlyRate
          const payment = card.payment ? Math.min(takeAmount(card.payment, total), state.balance) : 0
          state.balance -= payment
          total -= payment
          contributions.get(card.id)![i] = neg(payment)
          balancePoints.get(card.id)![i] = state.balance === 0 ? 0 : -state.balance
          break
        }
        case 'hand': {
          const taken = card.take ? takeAmount(card.take, total) : 0
          total -= taken
          const leftover = playHand(card, month, i, taken)
          total += leftover
          // its net effect at this position: what came back minus what it took
          const net = leftover - taken
          contributions.get(card.id)![i] = net === 0 ? 0 : net
          break
        }
        case 'rule':
          break // moves no money — its rule fires with the balance rules
      }
    }
    return total
  }

  for (let month = from; month <= to; month++) {
    const i = month - from

    // 1.–2. Play the root hand; the remainder lands in cash.
    const remainder = playHand(table.root, month, i, 0)
    if (month > from) cash *= cashFactor
    cash += remainder

    // 3. Scheduled balance rules (taxes, crashes) at end of tick.
    for (const r of balanceRules) {
      const { rule } = r
      if (!scheduleMatches(rule.schedule, month)) continue
      for (const state of assetStates.values()) {
        if (month >= state.start && ruleApplies(r, state.card, month)) {
          if (state.data) {
            state.units = applyBalanceEffect(rule.effect, state.units, rule.id)
            state.balance = state.units * sampleAt(state.data, month, `Asset "${state.card.id}" price`)
          } else {
            state.balance = applyBalanceEffect(rule.effect, state.balance, rule.id)
          }
          balancePoints.get(state.card.id)![i] = state.balance
        }
      }
      for (const state of debtStates.values()) {
        if (month >= state.start && ruleApplies(r, state.card, month)) {
          state.balance = applyBalanceEffect(rule.effect, state.balance, rule.id)
          balancePoints.get(state.card.id)![i] = state.balance === 0 ? 0 : -state.balance
        }
      }
      // the cash vessel lives outside every hand — only world rules reach it
      if (r.scope === null && targetsCash(rule.target)) {
        cash = applyBalanceEffect(rule.effect, cash, rule.id)
      }
    }

    // 4. Net worth — but only what is actually in play this month.
    cashPoints[i] = cash
    let net = cash
    const sumEnabled = (hand: HandCard): void => {
      for (const card of hand.children) {
        if (card.enabled === false) continue
        if (card.kind === 'hand') {
          sumEnabled(card)
        } else if (card.kind === 'asset' || card.kind === 'debt') {
          net += balancePoints.get(card.id)![i]!
        }
      }
    }
    sumEnabled(table.root)
    netWorthPoints[i] = net
  }

  const contributionSeries: Series[] = cards.map((c) => ({
    id: c.id,
    role: c.kind === 'hand' ? ('net' as const) : ('flow' as const),
    startMonth: from,
    points: contributions.get(c.id)!,
  }))
  const balanceSeries: Series[] = cards
    .filter((c) => c.kind === 'asset' || c.kind === 'debt')
    .map((c) => ({ id: c.id, role: 'balance' as const, startMonth: from, points: balancePoints.get(c.id)! }))

  return {
    from,
    to,
    netWorth: { id: 'netWorth', role: 'netWorth', startMonth: from, points: netWorthPoints },
    cash: { id: CASH_ID, role: 'cash', startMonth: from, points: cashPoints },
    contributions: contributionSeries,
    balances: balanceSeries,
  }
}
