import { monthlyFactor, resolveSampled, sampleAt } from './curves.js'
import { assetMonthlyGrowthFactor, evalFlowStack } from './stack.js'
import type {
  RuleEffect,
  RuleSchedule,
  RuleTarget,
  SampledData,
  ScheduledRule,
  Series,
  SimResult,
  Stack,
  Table,
  World,
} from './types.js'
import { CASH_ID, validateTable } from './validate.js'

/**
 * The monthly tick (DESIGN.md §8), in this exact order:
 *
 *   1. evaluate flow stacks bottom-up (then jurisdiction flow rules)
 *   2. pool the flows; resolve streams in declared order; remainder → cash
 *   3. update balances: growth/interest/fees first, then inflows
 *   4. apply scheduled balance rules (taxes, events)
 *
 * Conventions the closed-form tests rely on:
 *   - Series point `i` is the state at the *end* of month `from + i`.
 *   - On a stack's start month its initial balance appears and receives
 *     inflows, but no growth/interest — nothing existed during that month.
 *   - A fixed stream always draws its full amount (the cash remainder may go
 *     negative: an honest overdraft, never leaked money). A percent stream
 *     takes its share of what is non-negatively left at its turn.
 *   - A stream into a debt that was already fully paid draws nothing; an
 *     overpayment in the payoff month is refunded to cash.
 */

interface GrowthAssetState {
  type: 'growth'
  stack: Stack
  factor: number
  balance: number
  start: number
}

interface PricedAssetState {
  type: 'priced'
  stack: Stack
  data: SampledData
  units: number
  initialBalance: number | undefined
  start: number
}

interface DebtState {
  stack: Stack
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

function targetMatches(target: RuleTarget, stack: Stack): boolean {
  if (target.stackIds && !target.stackIds.includes(stack.id)) return false
  if (target.kinds && !target.kinds.includes(stack.base.kind)) return false
  if (target.tags) {
    const tags = stack.base.tags ?? []
    if (!target.tags.some((t) => tags.includes(t))) return false
  }
  return true
}

/** The cash account is only ever targeted explicitly, by stack id. */
function targetsCash(target: RuleTarget): boolean {
  return target.stackIds?.includes(CASH_ID) ?? false
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

export function simulate(table: Table, world: World, from: number, to: number): SimResult {
  if (!Number.isInteger(from) || !Number.isInteger(to) || from > to) {
    throw new Error(`simulate: invalid range ${from}..${to}`)
  }
  const errors = validateTable(table)
  if (errors.length > 0) {
    throw new Error(`simulate: invalid table:\n- ${errors.join('\n- ')}`)
  }

  const enabledBundles = new Set((table.bundles ?? []).filter((b) => b.enabled).map((b) => b.id))
  const isActive = (bundleId: string | undefined): boolean => bundleId === undefined || enabledBundles.has(bundleId)

  const stacks = table.stacks.filter((s) => isActive(s.bundleId))
  const streams = table.streams.filter((s) => isActive(s.bundleId))
  for (const stack of stacks) {
    const start = stack.startMonth ?? from
    if (start < from) throw new Error(`Stack "${stack.id}" starts at ${start}, before the simulation start ${from}`)
  }

  const rules = world.rules ?? []
  const flowRules = rules.filter((r) => r.effect.type === 'flowTax' || r.effect.type === 'flowScale')
  const balanceRules = rules.filter((r) => r.effect.type === 'balanceScale' || r.effect.type === 'balanceTax')

  const flowStacks = stacks.filter((s) => s.base.kind === 'source')
  const growthAssets: GrowthAssetState[] = []
  const pricedAssets: PricedAssetState[] = []
  const debts: DebtState[] = []
  for (const stack of stacks) {
    const start = stack.startMonth ?? from
    if (stack.base.kind === 'asset') {
      if (stack.base.price) {
        pricedAssets.push({
          type: 'priced',
          stack,
          data: resolveSampled(stack.base.price, world, `Asset "${stack.id}" price`),
          units: 0,
          initialBalance: stack.base.initialBalance,
          start,
        })
      } else {
        growthAssets.push({
          type: 'growth',
          stack,
          factor: assetMonthlyGrowthFactor(stack),
          balance: 0,
          start,
        })
      }
    } else if (stack.base.kind === 'debt') {
      debts.push({
        stack,
        monthlyRate: monthlyFactor(stack.base.interest.expected) - 1,
        balance: 0,
        start,
      })
    }
  }
  const debtById = new Map(debts.map((d) => [d.stack.id, d]))

  const cashFactor = monthlyFactor(table.cash?.growth?.expected ?? 0)
  let cash = table.cash?.initialBalance ?? 0

  const n = to - from + 1
  const points = new Map<string, number[]>(stacks.map((s) => [s.id, new Array<number>(n).fill(0)]))
  const cashPoints = new Array<number>(n).fill(0)
  const netWorthPoints = new Array<number>(n).fill(0)

  for (let month = from; month <= to; month++) {
    const i = month - from

    // 1. Flows.
    let pool = 0
    for (const stack of flowStacks) {
      const start = stack.startMonth ?? from
      if (month < start) continue
      let flow = evalFlowStack(stack, { t: month - start, month, world })
      for (const rule of flowRules) {
        if (scheduleMatches(rule.schedule, month) && targetMatches(rule.target, stack)) {
          flow = applyFlowEffect(rule.effect, flow, rule.id)
        }
      }
      points.get(stack.id)![i] = flow
      pool += flow
    }

    // 2. Streams, in declared order.
    const inflows = new Map<string, number>()
    for (const stream of streams) {
      if (month < (stream.startMonth ?? from)) continue
      if (stream.endMonth !== undefined && month > stream.endMonth) continue
      const targetStack = stream.to === CASH_ID ? undefined : stacks.find((s) => s.id === stream.to)
      if (stream.to !== CASH_ID) {
        if (!targetStack) continue // target belongs to a disabled bundle — stream is inert
        if (month < (targetStack.startMonth ?? from)) continue
        const debt = debtById.get(stream.to)
        if (debt && debt.start <= month - 1 && debt.balance === 0) continue // already paid off
      }
      const amount = stream.rule.type === 'fixed' ? stream.rule.amountPerMonth : stream.rule.percent * Math.max(0, pool)
      pool -= amount
      inflows.set(stream.to, (inflows.get(stream.to) ?? 0) + amount)
    }

    // 3. Balances: growth/interest first, then inflows.
    let assetTotal = 0
    let debtTotal = 0
    let refunds = 0

    for (const asset of growthAssets) {
      if (month < asset.start) continue
      if (month === asset.start) asset.balance = asset.stack.base.kind === 'asset' ? (asset.stack.base.initialBalance ?? 0) : 0
      else asset.balance *= asset.factor
      asset.balance += inflows.get(asset.stack.id) ?? 0
      points.get(asset.stack.id)![i] = asset.balance
      assetTotal += asset.balance
    }

    for (const asset of pricedAssets) {
      if (month < asset.start) continue
      const price = sampleAt(asset.data, month, `Asset "${asset.stack.id}" price`)
      if (month === asset.start) {
        const base = asset.stack.base
        asset.units = base.kind === 'asset' ? (base.initialUnits ?? (asset.initialBalance ?? 0) / price) : 0
      }
      const inflow = inflows.get(asset.stack.id) ?? 0
      if (inflow !== 0) {
        if (price <= 0) throw new Error(`Asset "${asset.stack.id}": cannot buy at non-positive price ${price}`)
        asset.units += inflow / price
      }
      const value = asset.units * price
      points.get(asset.stack.id)![i] = value
      assetTotal += value
    }

    for (const debt of debts) {
      if (month < debt.start) continue
      if (month === debt.start) debt.balance = debt.stack.base.kind === 'debt' ? debt.stack.base.principal : 0
      else debt.balance *= 1 + debt.monthlyRate
      const payment = inflows.get(debt.stack.id) ?? 0
      if (payment > debt.balance) {
        refunds += payment - debt.balance
        debt.balance = 0
      } else {
        debt.balance -= payment
      }
      points.get(debt.stack.id)![i] = debt.balance === 0 ? 0 : -debt.balance
      debtTotal += debt.balance
    }

    // Cash catches the remainder (and debt-overpayment refunds).
    if (month > from) cash *= cashFactor
    cash += pool + refunds + (inflows.get(CASH_ID) ?? 0)
    // `pool` already excludes explicit cash-stream draws, so adding both is exact.

    // 4. Scheduled balance rules (taxes, crashes) at end of tick.
    for (const rule of balanceRules) {
      if (!scheduleMatches(rule.schedule, month)) continue
      for (const asset of growthAssets) {
        if (month >= asset.start && targetMatches(rule.target, asset.stack)) {
          const before = asset.balance
          asset.balance = applyBalanceEffect(rule.effect, asset.balance, rule.id)
          assetTotal += asset.balance - before
          points.get(asset.stack.id)![i] = asset.balance
        }
      }
      for (const asset of pricedAssets) {
        if (month >= asset.start && targetMatches(rule.target, asset.stack)) {
          const price = sampleAt(asset.data, month, `Asset "${asset.stack.id}" price`)
          const before = asset.units * price
          asset.units = applyBalanceEffect(rule.effect, asset.units, rule.id)
          const after = asset.units * price
          assetTotal += after - before
          points.get(asset.stack.id)![i] = after
        }
      }
      for (const debt of debts) {
        if (month >= debt.start && targetMatches(rule.target, debt.stack)) {
          const before = debt.balance
          debt.balance = applyBalanceEffect(rule.effect, debt.balance, rule.id)
          debtTotal += debt.balance - before
          points.get(debt.stack.id)![i] = debt.balance === 0 ? 0 : -debt.balance
        }
      }
      if (targetsCash(rule.target)) {
        cash = applyBalanceEffect(rule.effect, cash, rule.id)
      }
    }

    cashPoints[i] = cash
    netWorthPoints[i] = assetTotal + cash - debtTotal
  }

  const stackSeries: Series[] = stacks.map((s) => ({
    id: s.id,
    role: s.base.kind === 'source' ? 'flow' : 'balance',
    startMonth: from,
    points: points.get(s.id)!,
  }))

  return {
    from,
    to,
    netWorth: { id: 'netWorth', role: 'netWorth', startMonth: from, points: netWorthPoints },
    cash: { id: CASH_ID, role: 'cash', startMonth: from, points: cashPoints },
    stacks: stackSeries,
  }
}

/** Returns a copy of the table with one bundle toggled — ghost compares are just two `simulate` calls. */
export function setBundleEnabled(table: Table, bundleId: string, enabled: boolean): Table {
  const bundles = table.bundles ?? []
  if (!bundles.some((b) => b.id === bundleId)) {
    throw new Error(`setBundleEnabled: unknown bundle "${bundleId}"`)
  }
  return {
    ...table,
    bundles: bundles.map((b) => (b.id === bundleId ? { ...b, enabled } : b)),
  }
}
