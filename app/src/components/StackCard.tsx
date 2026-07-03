import type { Stack } from '@finsim/engine'
import { useState, type ReactElement } from 'react'
import { stackEditors } from '../editors'
import { formatKr, formatKrPerMonth } from '../format'

/**
 * A card. Front = meaning: kind band, name, headline number, modifier chips.
 * Back = math: each parameter as a slider that live-updates the chart while
 * dragging (DESIGN.md §2 "flip to edit" — no modals).
 */
interface Props {
  stack: Stack
  /** Value at the scrub month: flow in kr/mo for sources, balance for assets/debts. */
  value: number
  muted?: boolean
  onEdit: (label: string, mutate: (stack: Stack) => void) => void
  onCommit: () => void
}

export function StackCard({ stack, value, muted, onEdit, onCommit }: Props): ReactElement {
  const [flipped, setFlipped] = useState(false)
  const kind = stack.base.kind
  const isFlow = kind === 'source'
  const headline = isFlow ? formatKrPerMonth(value) : formatKr(value)
  const direction = isFlow || kind === 'debt' ? (value > 0 ? 'pos' : value < 0 ? 'neg' : '') : ''
  const editors = stackEditors(stack)

  return (
    <article
      className={`card kind-${kind}${muted ? ' muted' : ''}${flipped ? ' flipped' : ''}`}
      onClick={() => setFlipped((f) => !f)}
    >
      <header className="card-band">
        <span className="card-kind">{kind}</span>
      </header>
      <h3 className="card-name">{stack.name ?? stack.id}</h3>
      {!flipped && (
        <>
          <p className={`card-headline num ${direction}`}>{headline}</p>
          {(stack.modifiers ?? []).length > 0 && (
            <ul className="card-chips">
              {(stack.modifiers ?? []).map((m) => (
                <li key={m.id} className="chip">
                  {m.name ?? m.id}
                </li>
              ))}
            </ul>
          )}
        </>
      )}
      {flipped && (
        <div className="card-back" onClick={(e) => e.stopPropagation()}>
          {editors.length === 0 && <p className="card-note">No editable parameters yet.</p>}
          {editors.map((editor) => (
            <label key={editor.key} className="param">
              <span className="param-label">
                {editor.label}
                <span className="param-value num">{editor.format(editor.value)}</span>
              </span>
              <input
                type="range"
                min={editor.min}
                max={editor.max}
                step={editor.step}
                value={editor.value}
                onChange={(e) => {
                  const v = Number(e.target.value)
                  onEdit(`${stack.id}:${editor.key}`, (s) => editor.set(s, v))
                }}
                onPointerUp={onCommit}
                onBlur={onCommit}
              />
            </label>
          ))}
        </div>
      )}
    </article>
  )
}
