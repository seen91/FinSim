import { formatMonth, formatMonthsDelta, fromMonthIndex, quantile } from '@finsim/engine'
import type { ReactElement } from 'react'
import { formatAmount, formatPercent } from '../format'
import { Glyph } from '../icons'
import { findNode } from '../instances'
import type { Mc } from '../mc'
import type { PlayedDoc } from '../model'
import { rangeVerdict, signedDelta } from '../verdict'

/**
 * The bundle report: one hand's range line, unfolded. The "+X – Y in 80 % of
 * futures" read a hand wears opens into the full distribution of what playing
 * that hand does to the goal — same drawer idiom, same Monte Carlo run as the
 * table's futures report, scoped to one decision. Nothing here re-rolls the
 * dice either.
 */
export function BundleReport({ handId, mc, doc, onClose }: { handId: string | null; mc: Mc | null; doc: PlayedDoc; onClose: () => void }): ReactElement | null {
  if (!handId || !mc) return null
  const range = mc.ranges.get(handId)
  if (!range) return null
  const node = findNode(doc.table.root, handId)
  const name = node && 'name' in node ? (node.name ?? node.id) : handId
  const pct = (v: number): string => formatPercent(v, 0)
  const { deltas } = range

  // the one picture: how the shift is dealt — per-path deltas, bucketed to
  // readable month spans (zero always sits on a bucket boundary)
  let width = 1
  let hist: { start: number; share: number }[] = []
  if (deltas.length > 0) {
    const min = deltas[0]!
    const max = deltas[deltas.length - 1]!
    width = [1, 3, 6, 12, 24, 60, 120].find((w) => Math.floor(max / w) - Math.floor(min / w) < 14) ?? 240
    const first = Math.floor(min / width)
    const counts = new Array<number>(Math.floor(max / width) - first + 1).fill(0)
    for (const d of deltas) counts[Math.floor(d / width) - first]!++
    hist = counts.map((count, i) => ({ start: (first + i) * width, share: count / deltas.length }))
  }
  const maxShare = Math.max(...hist.map((h) => h.share), 1e-9)
  const labelEvery = Math.ceil(hist.length / 6)

  const spanRows: [string, number][] =
    deltas.length > 0
      ? [
          ['best tenth (P10)', range.d10],
          ['median (P50)', quantile(deltas, 0.5)],
          ['worst tenth (P90)', range.d90],
        ]
      : []

  const lo = Math.round(range.d10)
  const hi = Math.round(range.d90)

  // the goal with the hand off the table vs on it — odds, and when it lands
  const reachedWith = mc.crossings.filter((m): m is number => m !== null).sort((a, b) => a - b)
  const reachedWithout = range.crossingsWithout.filter((m): m is number => m !== null).sort((a, b) => a - b)

  return (
    <div className="drawer" role="dialog" aria-label={`Futures report for ${name}`} onClick={onClose}>
      <div className="drawer-panel rulebook report" onClick={(e) => e.stopPropagation()}>
        <header className="drawer-bar">
          <Glyph name="bundle" size={22} />
          <h2>{name}, across futures</h2>
          <p className="drawer-hint">one hand&rsquo;s range, unfolded — press Esc or click outside to close</p>
          <button className="drawer-close" onClick={onClose} aria-label="Close the hand's futures report">
            ×
          </button>
        </header>

        <div className="rulebook-body report-body">
          <section>
            <p className="report-headline">
              {deltas.length > 0 ? (
                <>
                  Playing <strong>{name}</strong> moves the goal by{' '}
                  <strong className="num">{lo === hi ? signedDelta(lo) : `${signedDelta(lo)} – ${signedDelta(hi)}`}</strong> in the middle 80 % of
                  futures — judged on the <span className="num">{pct(range.comparable)}</span> of futures where the goal lands both with and without
                  it.
                </>
              ) : (
                <>
                  Playing <strong>{name}</strong> shifts the odds of reaching <strong className="num">{formatAmount(doc.goal)}</strong>:{' '}
                  <span className="num">{pct(range.probWithout)}</span> of futures get there without it,{' '}
                  <span className="num">{pct(range.probWith)}</span> with it. Too few futures reach the goal both ways for a time shift to mean
                  anything.
                </>
              )}
            </p>
          </section>

          {deltas.length > 0 && (
            <section>
              <h3>How the shift is dealt</h3>
              {hist.length > 1 && (
                <div className="report-hist" role="img" aria-label="Share of comparable futures, per size of the time-to-goal shift">
                  {hist.map(({ start, share }, i) => (
                    <div
                      key={start}
                      className="report-hist-col"
                      title={`${signedDelta(start)} to ${signedDelta(start + width)} to goal: ${pct(share)} of comparable futures`}
                    >
                      <div className="report-hist-bar" style={{ height: `${String(Math.round((share / maxShare) * 100))}%` }} />
                      <span className={`report-hist-year num${i % labelEvery === 0 ? '' : ' quiet'}`}>
                        {i % labelEvery === 0 ? (start === 0 ? '0' : signedDelta(start)) : ''}
                      </span>
                    </div>
                  ))}
                </div>
              )}
              <table className="report-table">
                <tbody>
                  {spanRows.map(([label, months]) => (
                    <tr key={label}>
                      <td>{label}</td>
                      <td className={`num ${Math.round(months) > 0 ? 'neg' : 'pos'}`}>{signedDelta(Math.round(months))}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
              <p className="report-note">a negative shift brings the goal closer, a positive one pushes it away.</p>
            </section>
          )}

          <section>
            <h3>What it does to the odds</h3>
            <table className="report-table">
              <tbody>
                <tr>
                  <td />
                  <td className="num quiet">without</td>
                  <td className="num quiet">with</td>
                </tr>
                <tr>
                  <td>futures that reach the goal</td>
                  <td className="num">{pct(range.probWithout)}</td>
                  <td className="num">{pct(range.probWith)}</td>
                </tr>
                {reachedWithout.length > 0 && reachedWith.length > 0 && (
                  <tr>
                    <td>median time to goal</td>
                    <td className="num">{formatMonthsDelta(Math.round(quantile(reachedWithout, 0.5)) - doc.from)}</td>
                    <td className="num">{formatMonthsDelta(Math.round(quantile(reachedWith, 0.5)) - doc.from)}</td>
                  </tr>
                )}
              </tbody>
            </table>
            <p className="report-note">&ldquo;without&rdquo; replays the very same futures with this hand set aside — the rest of the table unchanged.</p>
          </section>

          <section>
            <h3>How the futures are dealt</h3>
            <p>
              All {mc.run.paths} futures replay the table under one fixed seed, with and without this hand, under identical market draws — so the
              range is the decision&rsquo;s, not the dice&rsquo;s. The full read of the whole table lives in the futures report behind the
              chart&rsquo;s &ldquo;in NN % of futures&rdquo; line.
            </p>
          </section>
        </div>
      </div>
    </div>
  )
}

/**
 * The futures report: the fan, unfolded. The chart's "in NN % of futures"
 * one-liner opens into the full read of the Monte Carlo run — when the goal
 * tends to land, how the horizon can end, what each decision bundle costs
 * across futures — in the same drawer idiom as the Rulebook. It only reads
 * what runMc already computed; nothing here re-rolls the dice.
 */
export function FuturesReport({ open, mc, doc, onClose }: { open: boolean; mc: Mc | null; doc: PlayedDoc; onClose: () => void }): ReactElement | null {
  if (!open || !mc) return null

  const { run, crossings } = mc
  const to = doc.from + doc.horizonMonths - 1
  const pct = (v: number): string => formatPercent(v, 0)

  // time to goal, among the futures that get there
  const reached = crossings.filter((m): m is number => m !== null).sort((a, b) => a - b)
  const neverShare = 1 - reached.length / run.paths

  // where the goal lands, by calendar year — the report's one picture
  const fromYear = fromMonthIndex(doc.from).year
  const toYear = fromMonthIndex(to).year
  const byYear = new Map<number, number>()
  for (const m of reached) {
    const { year } = fromMonthIndex(m)
    byYear.set(year, (byYear.get(year) ?? 0) + 1)
  }
  const years = Array.from({ length: toYear - fromYear + 1 }, (_, i) => {
    const year = fromYear + i
    return { year, share: (byYear.get(year) ?? 0) / run.paths }
  })
  const maxShare = Math.max(...years.map((y) => y.share), 1 / run.paths)

  // net worth when the horizon closes, across all futures
  const ending = run.netWorth.map((points) => points[points.length - 1]!).sort((a, b) => a - b)
  const endingRows: [string, number][] = [
    ['unlucky tenth (P10)', quantile(ending, 0.1)],
    ['lower quartile (P25)', quantile(ending, 0.25)],
    ['median (P50)', quantile(ending, 0.5)],
    ['upper quartile (P75)', quantile(ending, 0.75)],
    ['lucky tenth (P90)', quantile(ending, 0.9)],
  ]

  const ttgRows: [string, number][] =
    reached.length > 0
      ? [
          ['fastest tenth (P10)', quantile(reached, 0.1)],
          ['median (P50)', quantile(reached, 0.5)],
          ['slowest tenth (P90)', quantile(reached, 0.9)],
        ]
      : []

  // one row per decision bundle in play, in table order
  const bundles = Array.from(mc.ranges.values())
    .map((range) => {
      // ranges exist only for hands, and hands keep their name on the node
      const node = findNode(doc.table.root, range.cardId)
      const name = node && 'name' in node ? (node.name ?? node.id) : node?.id
      const verdict = rangeVerdict(range)
      return name !== undefined && verdict ? { name, range, verdict } : null
    })
    .filter((b) => b !== null)

  return (
    <div className="drawer" role="dialog" aria-label="Futures report" onClick={onClose}>
      <div className="drawer-panel rulebook report" onClick={(e) => e.stopPropagation()}>
        <header className="drawer-bar">
          <Glyph name="trend" size={22} />
          <h2>Futures report</h2>
          <p className="drawer-hint">the fan, unfolded — press Esc or click outside to close</p>
          <button className="drawer-close" onClick={onClose} aria-label="Close the futures report">
            ×
          </button>
        </header>

        <div className="rulebook-body report-body">
          <section>
            <p className="report-headline">
              The table reaches <strong className="num">{formatAmount(doc.goal)}</strong> in{' '}
              <strong className="num">{pct(reached.length / run.paths)}</strong> of {run.paths} simulated futures
              {neverShare > 0 ? (
                <>
                  {' '}
                  — the other <span className="num">{pct(neverShare)}</span> never get there within the {formatMonthsDelta(doc.horizonMonths)} horizon.
                </>
              ) : (
                <> — every future gets there within the {formatMonthsDelta(doc.horizonMonths)} horizon.</>
              )}
            </p>
          </section>

          {reached.length > 0 && (
            <section>
              <h3>When the goal lands</h3>
              <div className="report-hist" role="img" aria-label="Share of futures first reaching the goal, per calendar year">
                {years.map(({ year, share }) => (
                  <div
                    key={year}
                    className="report-hist-col"
                    title={`${String(year)}: the goal first lands this year in ${pct(share)} of futures`}
                  >
                    <div className="report-hist-bar" style={{ height: `${String(Math.round((share / maxShare) * 100))}%` }} />
                    <span className={`report-hist-year num${year % 5 === 0 ? '' : ' quiet'}`}>{year % 5 === 0 ? `’${String(year % 100).padStart(2, '0')}` : ''}</span>
                  </div>
                ))}
              </div>
              <table className="report-table">
                <tbody>
                  {ttgRows.map(([label, month]) => (
                    <tr key={label}>
                      <td>{label}</td>
                      <td className="num">{formatMonthsDelta(Math.round(month) - doc.from)}</td>
                      <td className="num quiet">{formatMonth(Math.round(month))}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
              <p className="report-note">among the futures that reach the goal at all — a crossing must be sustained, a lucky spike does not count.</p>
            </section>
          )}

          <section>
            <h3>Net worth when the horizon closes ({formatMonth(to)})</h3>
            <table className="report-table">
              <tbody>
                {endingRows.map(([label, value]) => (
                  <tr key={label}>
                    <td>{label}</td>
                    <td className="num">{formatAmount(value)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
            <p className="report-note">
              the drawn line on the chart ≈ the median row; the mean sits above it — a few lucky futures pull the average up (volatility drag).
            </p>
          </section>

          {bundles.length > 0 && (
            <section>
              <h3>What each bundle costs, across futures</h3>
              <table className="report-table">
                <tbody>
                  {bundles.map(({ name, range, verdict }) => (
                    <tr key={range.cardId}>
                      <td>{name}</td>
                      <td className={`num ${verdict.cls}`} title={verdict.tooltip}>
                        {verdict.text}
                      </td>
                      {/* the odds shift, unless the verdict already fell back to saying exactly that */}
                      <td className="num quiet" title="share of simulated futures that reach the goal: without this hand → with it">
                        {range.comparable >= 0.5 ? `odds ${pct(range.probWithout)} → ${pct(range.probWith)}` : ''}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
              <p className="report-note">measured under identical market draws with and without the hand, so the range is the decision’s, not the dice’s.</p>
            </section>
          )}

          <section>
            <h3>How the futures are dealt</h3>
            <p>
              All {run.paths} futures replay the same table under one fixed seed — the report never flickers, and rival tables are judged under the same
              futures. Each month every future draws one shared market shock; an asset’s own shock is its &ldquo;moves with market&rdquo; blend of that
              draw and its private one. Only assets with a volatility are sampled — flows, debts and cash stay deterministic. Growth numbers are CAGRs:
              the deterministic line is (almost exactly) the median future, never the average.
            </p>
          </section>
        </div>
      </div>
    </div>
  )
}
