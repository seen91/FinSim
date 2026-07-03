import { valueAt, type Stack, type Stream, type Table } from '@finsim/engine'
import type { ReactElement } from 'react'
import { streamEditor } from '../editors'
import { formatKr } from '../format'
import type { Sim } from '../model'
import { StackCard } from './StackCard'

/**
 * The table: card stacks, decision-bundle groups with their on/off toggles,
 * the stream routing panel, and the permanent cash vessel that catches all
 * unrouted flow.
 */
interface Props {
  table: Table
  sim: Sim
  scrub: number
  onEditStack: (label: string, stackId: string, mutate: (stack: Stack) => void) => void
  onEditStream: (label: string, streamId: string, mutate: (stream: Stream) => void) => void
  onToggleBundle: (bundleId: string, enabled: boolean) => void
  onCommit: () => void
}

export function TableView({ table, sim, scrub, onEditStack, onEditStream, onToggleBundle, onCommit }: Props): ReactElement {
  const bundles = table.bundles ?? []
  const stackValue = (stack: Stack): number => {
    const series = sim.active.stacks.find((s) => s.id === stack.id)
    return series ? valueAt(series, scrub) : 0
  }
  const stackName = (id: string): string => table.stacks.find((s) => s.id === id)?.name ?? id

  const renderCard = (stack: Stack, muted = false): ReactElement => (
    <StackCard
      key={stack.id}
      stack={stack}
      value={stackValue(stack)}
      muted={muted}
      onEdit={(label, mutate) => onEditStack(label, stack.id, mutate)}
      onCommit={onCommit}
    />
  )

  return (
    <div className="table-view">
      <section className="table-main">
        <div className="card-grid">
          {table.stacks.filter((s) => s.bundleId === undefined).map((s) => renderCard(s))}
          <article className="card kind-asset cash-card">
            <header className="card-band">
              <span className="card-kind">vessel</span>
            </header>
            <h3 className="card-name">Cash</h3>
            <p className="card-headline num">{formatKr(valueAt(sim.active.cash, scrub))}</p>
            <p className="card-note">catches all unrouted flow</p>
          </article>
        </div>

        {bundles.map((bundle) => {
          const members = table.stacks.filter((s) => s.bundleId === bundle.id)
          return (
            <fieldset key={bundle.id} className={`bundle${bundle.enabled ? '' : ' off'}`}>
              <legend>
                <label className="bundle-toggle">
                  <input
                    type="checkbox"
                    checked={bundle.enabled}
                    onChange={(e) => onToggleBundle(bundle.id, e.target.checked)}
                  />
                  <span>{bundle.name ?? bundle.id}</span>
                </label>
              </legend>
              <div className="card-grid">{members.map((s) => renderCard(s, !bundle.enabled))}</div>
            </fieldset>
          )
        })}
      </section>

      <aside className="streams">
        <h2>Streams</h2>
        <p className="streams-note">Resolved top to bottom, each month. What remains lands in Cash.</p>
        <ol>
          {table.streams.map((stream) => {
            const editor = streamEditor(stream)
            const bundle = bundles.find((b) => b.id === stream.bundleId)
            const muted = bundle !== undefined && !bundle.enabled
            return (
              <li key={stream.id} className={muted ? 'muted' : ''}>
                <span className="stream-target">→ {stream.to === 'cash' ? 'Cash' : stackName(stream.to)}</span>
                <span className="stream-value num">{editor.format(editor.value)}</span>
                <input
                  type="range"
                  min={editor.min}
                  max={editor.max}
                  step={editor.step}
                  value={editor.value}
                  disabled={muted}
                  onChange={(e) => {
                    const v = Number(e.target.value)
                    onEditStream(`stream:${stream.id}`, stream.id, (s) => editor.set(s, v))
                  }}
                  onPointerUp={onCommit}
                  onBlur={onCommit}
                />
              </li>
            )
          })}
        </ol>
      </aside>
    </div>
  )
}
