import { valueAt } from '@finsim/engine'
import { useEffect, useRef, useState, type ReactElement } from 'react'
import { formatAmount, formatPercent, formatPerMonth } from '../format'
import { Glyph } from '../icons'
import type { Doc, Sim } from '../model'
import { Sparkline } from './Sparkline'

/**
 * The pipeline's mouth, pinned bottom-left: not a card (it can't be drafted,
 * held, or discarded) but a fixture of the table, like the draw pile it
 * mirrors. One brass plaque shows the vessel (accumulated cash) over the
 * spout (this month's remainder); clicking it opens a small parchment panel
 * to set the starting balance and the account's interest.
 */
export function CashDock({
  doc,
  sim,
  scrub,
  onEdit,
}: {
  doc: Doc
  sim: Sim
  scrub: number
  /** Doc update, same contract as DocStore.update. */
  onEdit: (mutate: (doc: Doc) => void) => void
}): ReactElement {
  const [open, setOpen] = useState(false)
  const dock = useRef<HTMLElement>(null)

  useEffect(() => {
    if (!open) return
    const onDown = (e: PointerEvent): void => {
      if (!dock.current?.contains(e.target as Node)) setOpen(false)
    }
    document.addEventListener('pointerdown', onDown)
    return () => document.removeEventListener('pointerdown', onDown)
  }, [open])

  const initial = doc.table.cash?.initialBalance ?? 0
  const interest = doc.table.cash?.growth?.expected ?? 0
  const cash = valueAt(sim.active.cash, scrub)
  const flow = valueAt(sim.remainder, scrub)

  return (
    <aside className="cash-dock" ref={dock}>
      {open && (
        <div className="dock-panel">
          <h3 className="dock-panel-title">Cash</h3>
          <p className="dock-panel-hint">whatever reaches the bottom of the table lands here</p>
          <label className="param">
            <span className="param-label">
              Starting balance <span className="param-value num">{formatAmount(initial)}</span>
            </span>
            <input
              type="range"
              min={0}
              max={2_000_000}
              step={10_000}
              value={initial}
              onChange={(e) => {
                const v = Number(e.target.value)
                onEdit((d) => {
                  d.table.cash = { ...d.table.cash, initialBalance: v }
                })
              }}
            />
          </label>
          <label className="param">
            <span className="param-label">
              Interest /yr <span className="param-value num">{formatPercent(interest)}</span>
            </span>
            <input
              type="range"
              min={0}
              max={0.05}
              step={0.0025}
              value={interest}
              onChange={(e) => {
                const v = Number(e.target.value)
                onEdit((d) => {
                  d.table.cash = { ...d.table.cash, growth: { ...d.table.cash?.growth, expected: v } }
                })
              }}
            />
          </label>
          <div className="dock-panel-spark">
            <Sparkline points={sim.active.cash.points} width={196} height={26} />
          </div>
        </div>
      )}
      <button
        className="dock-plaque"
        onClick={() => setOpen((o) => !o)}
        title="Cash — whatever is left each month lands here. Click to set starting balance and interest."
        aria-expanded={open}
      >
        <Glyph name="cash" size={22} />
        <span className="dock-rows">
          <span className="dock-row">
            <span className="dock-label">cash</span>
            <span className="dock-value num">{formatAmount(cash)}</span>
          </span>
          <span className="dock-row">
            <span className="dock-label">monthly</span>
            {/* engraved ink like the cash figure; red only when the month runs negative */}
            <span className={`dock-value num${flow < 0 ? ' neg' : ''}`}>{formatPerMonth(flow)}</span>
          </span>
        </span>
      </button>
    </aside>
  )
}
