import type { Card as EngineCard } from '@finsim/engine'
import type { ReactElement } from 'react'
import type { Mc } from '../mc'
import type { Sim } from '../model'
import { CardView } from './CardView'
import { HandStack } from './HandStack'

/**
 * One fan item — a resting hand stack, or a single card face — dressed with
 * its sim numbers: the one renderer the main strip and the opened ring share.
 */
export function TableCard({
  card,
  sim,
  mc,
  scrub,
  from,
  size,
  flippedId,
  onRemoveCard,
  onToggleCard,
  onDuplicateCard,
  onTuneCard,
  onWorkshopCard,
  onOpenHandReport,
}: {
  card: EngineCard
  sim: Sim
  mc: Mc | null
  scrub: number
  from: number
  /** The opened ring shrinks its cards when the arena is short; the strip always deals full size. */
  size?: 'hand' | 'table'
  flippedId: string | null
  onRemoveCard: (cardId: string) => void
  onToggleCard: (cardId: string) => void
  onDuplicateCard: (cardId: string) => void
  onTuneCard: (next: EngineCard) => void
  onWorkshopCard: (cardId: string) => void
  onOpenHandReport: (handId: string) => void
}): ReactElement {
  const compare = sim.compares.find((c) => c.cardId === card.id)
  return card.kind === 'hand' ? (
    <HandStack
      hand={card}
      sim={sim}
      scrub={scrub}
      from={from}
      compare={compare}
      range={mc?.ranges.get(card.id)}
      onRemove={onRemoveCard}
      onToggle={onToggleCard}
      onDuplicate={onDuplicateCard}
      onReport={onOpenHandReport}
    />
  ) : (
    <CardView
      card={card}
      sim={sim}
      scrub={scrub}
      from={from}
      compare={compare}
      {...(size ? { size } : {})}
      flipped={flippedId === card.id}
      onRemove={onRemoveCard}
      onToggle={onToggleCard}
      onDuplicate={onDuplicateCard}
      onTune={onTuneCard}
      onWorkshop={onWorkshopCard}
    />
  )
}
