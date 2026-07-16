import type { SampledData } from '@finsim/engine'
import { useEffect, useState, type ReactElement } from 'react'
import { headlineFor, type AuthoredCard } from '../authored'
import { pileRef, presetRef } from '../builtins'
import { Glyph } from '../icons'
import type { TableNode } from '../instances'
import { LIBRARY, type Blueprint } from '../library'
import { PRESETS, type HandPreset } from '../presets'
import { countLeaves, type SavedHand } from '../savedHands'
import { newUid } from '../uid'
import { Card } from './Card'

/**
 * The draw pile: a face-down deck in the corner of the table. Open it and
 * everything not in play spreads out in a grid — whole hands first (import
 * them as one, or take single cards), then your own designs, then the loose
 * cards. Click a card to draw it; it plays into whichever hand is open (the
 * main hand by default). The pile stays open so you can draw several — close
 * it by clicking outside or with the ×. Everything dealt is an INSTANCE of
 * its canonical card (a built-in or a design) — hands come out as fresh
 * compositions.
 */
interface Props {
  open: boolean
  /** Name of the hand a drawn card will play into. */
  targetName: string
  /** The Workshop's authored cards, drawable like any other. */
  authored: AuthoredCard[]
  /** Whole hands snapshotted to the pile — dealt back as fresh copies. */
  savedHands: SavedHand[]
  onOpen: () => void
  onClose: () => void
  /** Deal a fresh instance of a canonical card (built-in ref or design id). */
  onChooseRef: (ref: string) => void
  /** Deal a prebuilt node (a preset hand) with any series it wears. */
  onDealNode: (node: TableNode, series?: Record<string, SampledData>) => void
  /** Snapshot the hand the pile currently deals into (the whole plan when none is open). */
  onSaveTarget: () => void
  /** Deal a saved hand back — unpacked, fresh ids, fully editable. */
  onDealSaved: (saved: SavedHand) => void
  /** Burn a saved hand off the pile (dealt copies stay on the table). */
  onBurnSaved: (savedId: string) => void
}

/** A gold ring flashed over whatever was clicked — the pile stays open, so
 *  the click itself has to say "dealt". Keyed per click so a rapid same-card
 *  click restarts it, and animated with transform/opacity only so the sim
 *  recompute the deal triggers can't freeze it mid-flight. */
function usePulse(): [ReactElement | null, () => void] {
  const [n, setN] = useState(0)
  const ring = n > 0 ? <span key={n} className="deal-ring" aria-hidden="true" /> : null
  return [ring, () => setN((x) => x + 1)]
}

function DrawerCard({ bp, onChoose }: { bp: Blueprint; onChoose: (bp: Blueprint) => void }): ReactElement {
  const [ring, fire] = usePulse()
  return (
    <button
      className="drawer-slot"
      onClick={() => {
        fire()
        onChoose(bp)
      }}
      title="Draw — joins the right end of the open hand"
    >
      {ring}
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
  const [ring, fire] = usePulse()
  return (
    <div className="preset">
      <button
        className="preset-tile"
        onClick={() => {
          fire()
          onImportHand(preset)
        }}
        title="Import the whole hand"
      >
        {ring}
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
            <PresetCardRow key={card.key} card={card} onImportCard={onImportCard} />
          ))}
        </ul>
      )}
    </div>
  )
}

function PresetCardRow({
  card,
  onImportCard,
}: {
  card: HandPreset['cards'][number]
  onImportCard: (key: string) => void
}): ReactElement {
  const [ring, fire] = usePulse()
  return (
    <li>
      <button
        onClick={() => {
          fire()
          onImportCard(card.key)
        }}
        title="Import just this card"
      >
        {ring}
        <Glyph name={card.glyph} size={16} />
        <span className="preset-card-name">{card.name}</span>
        <span className="preset-card-headline num">{card.headline}</span>
      </button>
    </li>
  )
}

function SavedHandTile({ saved, onDeal, onBurn }: { saved: SavedHand; onDeal: (saved: SavedHand) => void; onBurn: (savedId: string) => void }): ReactElement {
  const cards = countLeaves(saved.hand)
  const [ring, fire] = usePulse()
  return (
    <div className="preset">
      <button
        className="preset-tile"
        onClick={() => {
          fire()
          onDeal(saved)
        }}
        title="Deal a fresh copy of this saved hand — unpacked, every card editable"
      >
        {ring}
        <span className="preset-glyph">
          <Glyph name={saved.hand.glyph ?? 'bundle'} size={30} />
        </span>
        <span className="preset-name">{saved.name}</span>
        <span className="preset-count num">
          {cards} card{cards === 1 ? '' : 's'} · deal a copy
        </span>
      </button>
      <button className="preset-open" onClick={() => onBurn(saved.id)} title="Burn this saved hand — copies already dealt stay on the table">
        burn…
      </button>
    </div>
  )
}

function AuthoredSlot({ authored, onChoose }: { authored: AuthoredCard; onChoose: (ref: string) => void }): ReactElement {
  const [ring, fire] = usePulse()
  return (
    <button
      className="drawer-slot"
      onClick={() => {
        fire()
        onChoose(authored.id)
      }}
      title="Draw a copy — joins the right end of the open hand"
    >
      {ring}
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

export function DrawPile({ open, targetName, authored, savedHands, onOpen, onClose, onChooseRef, onDealNode, onSaveTarget, onDealSaved, onBurnSaved }: Props): ReactElement {
  // the last thing dealt, echoed in the bar as "✓ Salary → Main hand"; n keys
  // the element so the fade replays on every deal, and reopening starts blank
  const [dealt, setDealt] = useState<{ label: string; n: number } | null>(null)
  useEffect(() => {
    if (open) setDealt(null)
  }, [open])
  const note = (label: string): void => setDealt((d) => ({ label, n: (d?.n ?? 0) + 1 }))

  const chooseBlueprint = (bp: Blueprint): void => {
    note(bp.name)
    onChooseRef(pileRef(bp.id))
  }

  return (
    <>
      <button className="pile" onClick={onOpen} title="Open the draw pile" aria-label="Open the draw pile">
        <span className="pile-card" />
        <span className="pile-card" />
        <span className="pile-card pile-top">
          <span className="pile-word">Draw</span>
        </span>
      </button>

      {open && (
        <div className="drawer" onClick={onClose} role="dialog" aria-label="Draw pile">
          <div className="drawer-panel" onClick={(e) => e.stopPropagation()}>
            <header className="drawer-bar">
              <h2>Draw pile</h2>
              <p className="drawer-hint">
                click to draw into <strong>{targetName}</strong> — draw as many as you like · order matters — a hand plays left to right
              </p>
              <button className="drawer-close" onClick={onClose} aria-label="Close">
                ×
              </button>
              {dealt && (
                <span className="drawer-dealt" key={dealt.n} aria-live="polite">
                  ✓ {dealt.label} → {targetName}
                </span>
              )}
            </header>
            {/* one shelf of hands — saved ones and presets alike; whose they are doesn't matter */}
            <h3 className="drawer-section">Hands</h3>
            <div className="preset-row">
              {savedHands.map((saved) => (
                <SavedHandTile
                  key={saved.id}
                  saved={saved}
                  onDeal={(s) => {
                    note(`${s.name} · whole hand`)
                    onDealSaved(s)
                  }}
                  onBurn={onBurnSaved}
                />
              ))}
              {PRESETS.map((preset) => (
                <PresetTile
                  key={preset.id}
                  preset={preset}
                  onImportHand={(p) => {
                    note(`${p.name} · whole hand`)
                    onDealNode(p.build(newUid()), p.series)
                  }}
                  onImportCard={(key) => {
                    note(preset.cards.find((c) => c.key === key)?.name ?? preset.name)
                    onChooseRef(presetRef(key))
                  }}
                />
              ))}
              <button
                className="preset-tile save-target"
                onClick={onSaveTarget}
                title="Snapshot the hand the pile deals into — cards, dials and nested hands, dealt back whole whenever you like"
              >
                <span className="preset-glyph">
                  <Glyph name="save" size={30} />
                </span>
                <span className="preset-name">save {targetName}</span>
                <span className="preset-count">a copy of the whole hand, kept on the pile</span>
              </button>
            </div>
            {authored.length > 0 && (
              <>
                <h3 className="drawer-section">Your designs</h3>
                <div className="drawer-grid">
                  {authored.map((a) => (
                    <AuthoredSlot
                      key={a.id}
                      authored={a}
                      onChoose={(ref) => {
                        note(a.card.name ?? a.id)
                        onChooseRef(ref)
                      }}
                    />
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
