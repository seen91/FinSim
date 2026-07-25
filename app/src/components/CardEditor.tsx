import type { Card as EngineCard } from '@finsim/engine'
import type { ReactElement } from 'react'
import type { AuthoredCard } from '../authored'
import { CARD_GLYPHS } from '../glyph'
import { Glyph } from '../icons'
import { Row, Text } from './fields'
import { AssetEditor, DebtEditor, DrainEditor, MarginEditor, RuleEditor, SourceEditor, TakeField, withOptional } from './kindEditors'

/**
 * The back of the card is the card creator (DESIGN.md §3): every parameter a
 * live field, edits committed on every change so the chart (or the face)
 * answers immediately. Here the written numbers ARE the design — the
 * −100..+100 % what-if dials belong to cards in play (TuneDials), not the
 * Workshop bench.
 *
 * Amounts and rates carry their unit in the text itself: type "5000/w",
 * "480000/yr" or "1 %/m" and the field understands — no cadence dropdown.
 */

/**
 * The math side of the back: name, tags, and every parameter of the kind.
 * Emits a whole new card on each change — callers decide where it lands
 * (the table document or a library template).
 */
export function CardMathEditor({ card, onChange, from }: { card: EngineCard; onChange: (next: EngineCard) => void; from: number }): ReactElement {
  return (
    <div className="card-editor">
      <Text label="Name" value={card.name ?? ''} onCommit={(name) => onChange({ ...card, name })} />
      {card.kind === 'source' && <SourceEditor card={card} onChange={onChange} />}
      {card.kind === 'drain' && <DrainEditor card={card} onChange={onChange} />}
      {card.kind === 'asset' && <AssetEditor card={card} onChange={onChange} />}
      {card.kind === 'debt' && <DebtEditor card={card} onChange={onChange} />}
      {card.kind === 'margin' && <MarginEditor card={card} onChange={onChange} />}
      {card.kind === 'rule' && <RuleEditor card={card} onChange={onChange} from={from} />}
      {card.kind === 'hand' && <TakeField label="Takes" take={card.take} onCommit={(take) => onChange(withOptional(card, 'take', take))} />}
      <Text
        label="Tags"
        value={card.tags?.join(', ') ?? ''}
        placeholder="fund, equity — what rules aim at"
        onCommit={(text) => {
          const tags = text.split(',').map((t) => t.trim()).filter(Boolean)
          onChange(withOptional(card, 'tags', tags.length > 0 ? tags : undefined))
        }}
      />
    </div>
  )
}

/** The front matter of an authored card: sigil and the one description field. */
export function FrontMatterEditor({ authored, onChange }: { authored: AuthoredCard; onChange: (next: AuthoredCard) => void }): ReactElement {
  return (
    <div className="card-editor">
      <Row label="Sigil">
        <div className="glyph-pick">
          {CARD_GLYPHS.map((g) => (
            <button key={g} className={g === authored.glyph ? 'on' : ''} onClick={() => onChange({ ...authored, glyph: g })} aria-label={g} title={g}>
              <Glyph name={g} size={17} />
            </button>
          ))}
        </div>
      </Row>
      <Row label="Description">
        <textarea
          rows={3}
          value={authored.description ?? ''}
          placeholder="what it is — and the assumptions behind the numbers (source, year, fees…)"
          onChange={(e) => onChange({ ...authored, description: e.target.value })}
        />
      </Row>
    </div>
  )
}
