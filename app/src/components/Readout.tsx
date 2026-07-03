import { formatMonth, formatMonthsDelta } from '@finsim/engine'
import type { ReactElement } from 'react'
import { GHOST_DASHES, type HandCompare, type Sim } from '../model'

/**
 * The legend: one swatch per curve — your table, then each hand compared.
 * Names only; the dates live on the chart's goal line and the details on
 * the cards themselves.
 */
interface Props {
  sim: Sim
}

/** The time-to-goal delta, one hover away: "2045-06 → 2048-03 · costs 2 yr 9 mo". */
function deltaTooltip(c: HandCompare): string {
  const { baseMonth, variantMonth, deltaMonths } = c.delta
  if (baseMonth !== null && variantMonth !== null && deltaMonths !== null) {
    const verdict = deltaMonths > 0 ? `costs ${formatMonthsDelta(deltaMonths)}` : deltaMonths < 0 ? `saves ${formatMonthsDelta(-deltaMonths)}` : 'no difference'
    return `${formatMonth(baseMonth)} → ${formatMonth(variantMonth)} · ${verdict}`
  }
  if (baseMonth !== null) return `goal ${formatMonth(baseMonth)} without — never with`
  if (variantMonth !== null) return `goal never without — ${formatMonth(variantMonth)} with`
  return 'goal not reached either way'
}

function Swatch({ dash }: { dash?: string }): ReactElement {
  return (
    <svg className="swatch" width="26" height="9" aria-hidden>
      <line x1="1" y1="4.5" x2="25" y2="4.5" strokeDasharray={dash} />
    </svg>
  )
}

export function Readout({ sim }: Props): ReactElement {
  return (
    <section className="readout">
      <p>
        <Swatch />
        <span className="readout-name">Your table</span>
      </p>
      {sim.compares.map((c, i) => (
        <p key={c.handId} className={c.enabled ? '' : 'muted'} title={deltaTooltip(c)}>
          <Swatch dash={GHOST_DASHES[i % GHOST_DASHES.length]} />
          <span className="readout-name">{c.name}</span>
        </p>
      ))}
    </section>
  )
}
