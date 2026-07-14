import type { SampledData } from '@finsim/engine'
import { useState, type ReactElement } from 'react'
import { headlineFor, type AuthoredCard } from '../authored'
import { pileRef, presetRef } from '../builtins'
import { Glyph } from '../icons'
import type { TableNode } from '../instances'
import { LIBRARY, type Blueprint } from '../library'
import { PRESETS, type HandPreset } from '../presets'
import { newUid } from '../uid'
import { Card } from './Card'

/**
 * The draw pile: a face-down deck in the corner of the table. Open it and
 * everything not in play spreads out in a grid — whole hands first (import
 * them as one, or take single cards), then your own designs, then the loose
 * cards. Click a card to draw it; it plays into whichever hand is open (the
 * main hand by default). Everything dealt is an INSTANCE of its canonical
 * card (a built-in or a design) — hands come out as fresh compositions.
 */
interface Props {
  open: boolean
  /** Name of the hand a drawn card will play into. */
  targetName: string
  /** The Workshop's authored cards, drawable like any other. */
  authored: AuthoredCard[]
  onOpen: () => void
  onClose: () => void
  /** Deal a fresh instance of a canonical card (built-in ref or design id). */
  onChooseRef: (ref: string) => void
  /** Deal a prebuilt node (a preset hand) with any series it wears. */
  onDealNode: (node: TableNode, series?: Record<string, SampledData>) => void
}

function DrawerCard({ bp, onChoose }: { bp: Blueprint; onChoose: (bp: Blueprint) => void }): ReactElement {
  return (
    <button className="drawer-slot" onClick={() => onChoose(bp)} title="Draw — joins the right end of the open hand">
      <Card
        size="hand"
        face={{
          kind: bp.card.kind,
          name: bp.name,
          glyph: bp.glyph,
          headline: bp.headline,
          headlineClass: bp.headline.startsWith('−') ? 'neg' : bp.card.kind === 'source' ? 'pos' : '',
          description: bp.description,
        }}
      />
    </button>
  )
}

function PresetTile({
  preset,
  onImportHand,
  onImportCard,
}: {
  preset: HandPreset
  onImportHand: (preset: HandPreset) => void
  onImportCard: (key: string) => void
}): ReactElement {
  const [openList, setOpenList] = useState(false)
  return (
    <div className="preset">
      <button className="preset-tile" onClick={() => onImportHand(preset)} title="Import the whole hand">
        <span className="preset-glyph">
          <Glyph name={preset.glyph} size={30} />
        </span>
        <span className="preset-name">{preset.name}</span>
        <span className="preset-count num">
          {preset.cards.length} card{preset.cards.length === 1 ? '' : 's'} · import all
        </span>
      </button>
      <button className="preset-open" onClick={() => setOpenList((o) => !o)}>
        {openList ? 'hide cards' : 'take single cards…'}
      </button>
      {openList && (
        <ul className="preset-cards">
          {preset.cards.map((card) => (
            <li key={card.key}>
              <button onClick={() => onImportCard(card.key)} title="Import just this card">
                <Glyph name={card.glyph} size={16} />
                <span className="preset-card-name">{card.name}</span>
                <span className="preset-card-headline num">{card.headline}</span>
              </button>
            </li>
          ))}
        </ul>
      )}
    </div>
  )
}

function AuthoredSlot({ authored, onChoose }: { authored: AuthoredCard; onChoose: (ref: string) => void }): ReactElement {
  return (
    <button className="drawer-slot" onClick={() => onChoose(authored.id)} title="Draw a copy — joins the right end of the open hand">
      <Card
        size="hand"
        face={{
          kind: authored.card.kind,
          name: authored.card.name ?? authored.id,
          glyph: authored.glyph,
          headline: headlineFor(authored.card),
          headlineClass: authored.card.kind === 'source' ? 'pos' : authored.card.kind === 'drain' ? 'neg' : '',
          ...(authored.description ? { description: authored.description } : {}),
        }}
      />
    </button>
  )
}

export function DrawPile({ open, targetName, authored, onOpen, onClose, onChooseRef, onDealNode }: Props): ReactElement {
  const chooseBlueprint = (bp: Blueprint): void => onChooseRef(pileRef(bp.id))

  return (
    <>
      <button className="pile" onClick={onOpen} title="Open the draw pile" aria-label="Open the draw pile">
        <span className="pile-card" />
        <span className="pile-card" />
        <span className="pile-card pile-top">
          <em>f(t)</em>
        </span>
        <span className="pile-label">Draw pile</span>
      </button>

      {open && (
        <div className="drawer" onClick={onClose} role="dialog" aria-label="Draw pile">
          <div className="drawer-panel" onClick={(e) => e.stopPropagation()}>
            <header className="drawer-bar">
              <h2>Draw pile</h2>
              <p className="drawer-hint">
                click to draw into <strong>{targetName}</strong> · order matters — a hand plays left to right
              </p>
              <button className="drawer-close" onClick={onClose} aria-label="Close">
                ×
              </button>
            </header>
            <h3 className="drawer-section">Hands</h3>
            <div className="preset-row">
              {PRESETS.map((preset) => (
                <PresetTile
                  key={preset.id}
                  preset={preset}
                  onImportHand={(p) => onDealNode(p.build(newUid()), p.series)}
                  onImportCard={(key) => onChooseRef(presetRef(key))}
                />
              ))}
            </div>
            {authored.length > 0 && (
              <>
                <h3 className="drawer-section">Your designs</h3>
                <div className="drawer-grid">
                  {authored.map((a) => (
                    <AuthoredSlot key={a.id} authored={a} onChoose={onChooseRef} />
                  ))}
                </div>
              </>
            )}
            <h3 className="drawer-section">Cards</h3>
            <div className="drawer-grid">
              {LIBRARY.map((bp) => (
                <DrawerCard key={bp.id} bp={bp} onChoose={chooseBlueprint} />
              ))}
            </div>
          </div>
        </div>
      )}
    </>
  )
}
