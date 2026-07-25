import { formatMonth } from '@finsim/engine'
import { useEffect, useRef, useState, type ReactElement } from 'react'
import { formatCompact, parseCompact } from '../format'
import { Glyph } from '../icons'
import { parseMonthText } from '../seriesImport'

/**
 * The top bar: the Workshop and Rulebook doors, and the Table sign whose menu
 * holds the plan's three numbers (goal, start, end — set seldom) above the
 * export/import/reset actions.
 */

/** The goal in compact money ("10 M", "250 k"); accepts "1,5m", "10M", "250k" or a plain number. */
function GoalInput({ goal, onCommit }: { goal: number; onCommit: (v: number) => void }): ReactElement {
  const [draft, setDraft] = useState(() => formatCompact(goal))
  useEffect(() => setDraft(formatCompact(goal)), [goal])
  const commit = (): void => {
    const parsed = parseCompact(draft)
    if (parsed !== null && parsed > 0) {
      onCommit(parsed)
      setDraft(formatCompact(parsed))
    } else {
      setDraft(formatCompact(goal))
    }
  }
  return (
    <input
      type="text"
      className="num"
      value={draft}
      onChange={(e) => setDraft(e.target.value)}
      onBlur={commit}
      onKeyDown={(e) => {
        if (e.key === 'Enter') e.currentTarget.blur()
        if (e.key === 'Escape') setDraft(formatCompact(goal))
      }}
    />
  )
}

export function TopBar({
  goal,
  from,
  to,
  onGoal,
  onStart,
  onEnd,
  onOpenWorkshop,
  onOpenRulebook,
  onExport,
  onImportFile,
  onReset,
}: {
  goal: number
  from: number
  /** The resolved last month — what the End field shows. */
  to: number
  onGoal: (goal: number) => void
  onStart: (month: number) => void
  /** A pinned end month, or null = follow the goal again. */
  onEnd: (month: number | null) => void
  onOpenWorkshop: () => void
  onOpenRulebook: () => void
  onExport: () => void
  onImportFile: (file: File) => void
  onReset: () => void
}): ReactElement {
  // the Table sign's little menu: export, import, reset under one board
  const [tableMenuOpen, setTableMenuOpen] = useState(false)
  const importInput = useRef<HTMLInputElement>(null)

  return (
    <header className="topbar">
      <div className="topbar-actions">
        {/* planked boards hanging from one wooden rail; the Workshop's
            signal-yellow board stays the one loud thing on the table */}
        <button className="workshop" onClick={onOpenWorkshop} title="The Workshop — author cards and tune the ones in play">
          <span className="workshop-board">
            <Glyph name="hammer" size={15} />
            Workshop
          </span>
        </button>
        <button className="sign" onClick={onOpenRulebook} title="how the table plays — the rules, written down">
          <Glyph name="book" size={14} />
          Rulebook
        </button>
        <div className="table-sign">
          <button
            className="sign"
            onClick={() => setTableMenuOpen((open) => !open)}
            title="the table's plan and file — goal, dates, export, import, reset"
          >
            <Glyph name="cog" size={13} />
            Table
          </button>
          {tableMenuOpen && (
            <>
              <div className="sign-veil" onClick={() => setTableMenuOpen(false)} aria-hidden="true" />
              <ul className="sign-menu" role="menu" aria-label="Table actions">
                <li className="menu-fields">
                  <label>
                    Goal
                    <GoalInput goal={goal} onCommit={onGoal} />
                  </label>
                  <label title="the table's first month — set it in the past to backtest against historical data">
                    Start
                    <input
                      type="month"
                      value={formatMonth(from)}
                      onChange={(e) => {
                        const month = parseMonthText(e.target.value)
                        if (month !== null) onStart(month)
                      }}
                    />
                  </label>
                  <label title="the table's last month — by default it follows the goal (a bit past the crossing — up to three years); set a month to pin it, clear the field to follow again">
                    End
                    <input type="month" value={formatMonth(to)} onChange={(e) => onEnd(parseMonthText(e.target.value))} />
                  </label>
                </li>
                <li className="menu-divide">
                  <button
                    role="menuitem"
                    title="download the whole table as a JSON file — the backup/share path"
                    onClick={() => {
                      setTableMenuOpen(false)
                      onExport()
                    }}
                  >
                    <Glyph name="export" size={13} />
                    Export
                  </button>
                </li>
                <li>
                  <button
                    role="menuitem"
                    title="replace the table with a previously exported JSON file"
                    onClick={() => {
                      setTableMenuOpen(false)
                      importInput.current?.click()
                    }}
                  >
                    <Glyph name="import" size={13} />
                    Import…
                  </button>
                </li>
                <li className="menu-divide">
                  <button
                    role="menuitem"
                    className="menu-burn menu-grave"
                    title="the clean slate — a lone salary card, authored cards and saved hands cleared"
                    onClick={() => {
                      setTableMenuOpen(false)
                      onReset()
                    }}
                  >
                    <Glyph name="skull" size={13} />
                    Reset…
                  </button>
                </li>
              </ul>
            </>
          )}
        </div>
        <input
          ref={importInput}
          type="file"
          accept="application/json,.json"
          hidden
          onChange={(e) => {
            const file = e.target.files?.[0]
            if (file) onImportFile(file)
            e.target.value = ''
          }}
        />
      </div>
    </header>
  )
}
