import { formatMonth, formatMonthsDelta } from '@finsim/engine'
import type { ReactElement } from 'react'
import type { Sim } from '../model'

/**
 * The killer feature, in words (DESIGN.md §2): the time-to-goal delta per
 * decision bundle — "10 MSEK: 2034-06 → 2036-11. The car costs you 2 yr 5 mo."
 */
interface Props {
  sim: Sim
  goal: number
}

function goalLabel(goal: number): string {
  if (goal >= 1_000_000 && goal % 100_000 === 0) {
    return `${(goal / 1_000_000).toLocaleString('sv-SE')} MSEK`
  }
  return `${goal.toLocaleString('sv-SE')} kr`
}

export function Readout({ sim, goal }: Props): ReactElement | null {
  if (sim.compares.length === 0) return null
  return (
    <section className="readout">
      {sim.compares.map((c) => {
        const { baseMonth, variantMonth, deltaMonths } = c.delta
        let sentence: string
        if (baseMonth !== null && variantMonth !== null && deltaMonths !== null) {
          const verdict =
            deltaMonths > 0
              ? `${c.name} costs you ${formatMonthsDelta(deltaMonths)}.`
              : deltaMonths < 0
                ? `${c.name} saves you ${formatMonthsDelta(-deltaMonths)}.`
                : `${c.name} makes no difference.`
          sentence = `${goalLabel(goal)}: ${formatMonth(baseMonth)} → ${formatMonth(variantMonth)}. ${verdict}`
        } else if (baseMonth !== null) {
          sentence = `${goalLabel(goal)}: reached ${formatMonth(baseMonth)} without ${c.name} — never within the horizon with it.`
        } else if (variantMonth !== null) {
          sentence = `${goalLabel(goal)}: never reached within the horizon without ${c.name} — ${formatMonth(variantMonth)} with it.`
        } else {
          sentence = `${goalLabel(goal)}: not reached within the horizon, with or without ${c.name}.`
        }
        return (
          <p key={c.bundleId} className={c.enabled ? '' : 'muted'}>
            {sentence}
            {!c.enabled && ' (bundle is off — the ghost shows it on)'}
          </p>
        )
      })}
    </section>
  )
}
