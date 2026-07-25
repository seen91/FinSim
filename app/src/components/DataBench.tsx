import { formatMonth, type SampledData } from '@finsim/engine'
import { useRef, useState, type ReactElement } from 'react'
import type { AuthoredCard } from '../authored'
import { mergeLibrary } from '../identity'
import { errorMessage } from '../format'
import { Glyph } from '../icons'
import type { Doc } from '../model'
import { mintPricedDesign, parseMonthText, parseSeriesText, seriesInUse } from '../seriesImport'
import type { WorkshopFocus } from './Workshop'

/**
 * The Workshop's data bench (DESIGN.md §0 "Backtesting"): paste or file-pick
 * a run of monthly values, name it, and it becomes a series on the table —
 * and, in the same motion, a priced-asset design in the library wearing it.
 * Below, the series already on the table, with their coverage; a series in
 * use cannot be burned.
 */

interface Props {
  doc: Doc
  update: (mutate: (doc: Doc) => void) => void
  library: AuthoredCard[]
  onLibraryChange: (next: AuthoredCard[]) => void
  /** Jump the Workshop to the freshly minted design. */
  onFocus: (focus: WorkshopFocus) => void
}

export function DataBench({ doc, update, library, onLibraryChange, onFocus }: Props): ReactElement {
  const [name, setName] = useState('')
  const [firstMonth, setFirstMonth] = useState('')
  const [text, setText] = useState('')
  const [mint, setMint] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const fileInput = useRef<HTMLInputElement>(null)

  const series = doc.world?.series ?? {}
  const entries = Object.entries(series)

  const handleFile = (file: File): void => {
    void file.text().then((content) => {
      setText(content)
      if (!name) setName(file.name.replace(/\.[^.]*$/, ''))
    })
  }

  const handleImport = (): void => {
    try {
      const trimmed = name.trim()
      if (!trimmed) throw new Error('give the series a name — cards reference it by name')
      const parsed = parseSeriesText(text)
      const startMonth = parsed.startMonth ?? parseMonthText(firstMonth)
      if (startMonth === null) throw new Error('set the first month — these values carry no dates of their own')
      if (series[trimmed] && !window.confirm(`“${trimmed}” already exists on this table — replace its data?`)) return
      const data: SampledData = { startMonth, values: parsed.values }
      update((d) => {
        d.world = { ...d.world, series: { ...d.world?.series, [trimmed]: data } }
      })
      setError(null)
      setName('')
      setFirstMonth('')
      setText('')
      if (mint) {
        // same name = same card: re-importing a series refreshes its design
        const design = mintPricedDesign(trimmed, data)
        onLibraryChange(mergeLibrary(library, [design]))
        onFocus({ where: 'library', id: design.id })
      }
    } catch (err) {
      setError(errorMessage(err))
    }
  }

  const handleBurn = (id: string): void => {
    update((d) => {
      if (d.world?.series) delete d.world.series[id]
    })
  }

  // bare values need a first month; rows that carry their own dates do not
  const wantsFirstMonth = !/^\s*\d{4}-\d{1,2}[\s,;]/m.test(text)

  return (
    <div className="data-bench">
      <section className="data-import">
        <h3>Import historical data</h3>
        <p className="drawer-hint">
          monthly values, oldest first — bare numbers split on spaces, commas or newlines, or “YYYY-MM, value” rows on consecutive months. Use a{' '}
          <strong>total-return</strong> series (price-only data understates returns by dividends), and mind that amounts stay in the series&rsquo; own
          currency — FX is not modeled.
        </p>
        <label className="param">
          <span className="param-label">Name</span>
          <input type="text" value={name} placeholder="e.g. SP500 total return" onChange={(e) => setName(e.target.value)} />
        </label>
        {wantsFirstMonth && (
          <label className="param">
            <span className="param-label">First month</span>
            <input type="month" value={firstMonth} onChange={(e) => setFirstMonth(e.target.value)} />
          </label>
        )}
        <label className="param">
          <span className="param-label">Values</span>
          <textarea rows={6} value={text} placeholder={'353.4, 356.1, 361.2 …\nor\n1990-01, 353.4\n1990-02, 356.1'} onChange={(e) => setText(e.target.value)} />
        </label>
        {error && <p className="param-error">{error}</p>}
        <div className="data-tools">
          <button className="sign" onClick={() => fileInput.current?.click()} title="Read the values from a CSV or text file">
            from a file…
          </button>
          <label className="data-mint">
            <input type="checkbox" checked={mint} onChange={(e) => setMint(e.target.checked)} />
            mint a card wearing it
          </label>
          <button className="sign data-add" onClick={handleImport} disabled={text.trim().length === 0} title="Add the series to this table's data">
            <Glyph name="import" size={12} /> import
          </button>
        </div>
        <input
          ref={fileInput}
          type="file"
          accept=".csv,.txt,.tsv,text/csv,text/plain"
          hidden
          onChange={(e) => {
            const file = e.target.files?.[0]
            if (file) handleFile(file)
            e.target.value = ''
          }}
        />
      </section>

      <section className="data-list">
        <h3>Series on this table</h3>
        {entries.length === 0 && <p className="drawer-hint">none yet — imported series and pack data land here</p>}
        {entries.map(([id, data]) => {
          const last = data.startMonth + data.values.length - 1
          const used = seriesInUse(id, doc.table, library)
          return (
            <div key={id} className="data-row">
              <span className="data-name">{id}</span>
              <span className="data-span num">
                {formatMonth(data.startMonth)} … {formatMonth(last)} · {data.values.length} points
              </span>
              <button
                className="work-burn"
                disabled={used}
                title={used ? 'a card on the table or in your designs is priced by this series' : 'Burn this series'}
                onClick={() => handleBurn(id)}
              >
                <Glyph name="flame" size={12} />
              </button>
            </div>
          )
        })}
      </section>
    </div>
  )
}
