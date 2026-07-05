import type { Card as EngineCard, HandCard } from '@finsim/engine'
import { useRef, useState, type PointerEvent as ReactPointerEvent, type ReactElement, type ReactNode, type WheelEvent } from 'react'

/**
 * A hand fanned around a virtual circle. The same component draws the main
 * hand at the bottom of the screen (large radius — a gentle arc) and an opened
 * hand in the arena (small radius — cards around the top of a visible circle).
 * The circle is virtually complete so a hand can hold any number of cards:
 * angles beyond `visibleTo` are off-stage and the wheel spins them into view.
 *
 * Reordering is plain pointer math — the pointer's angle about the circle
 * center picks the target slot; no drag-and-drop library.
 */
export interface FanGeometry {
  /** Distance from the circle center up to the top edge of each card, px. */
  radius: number
  /** Angular step between adjacent cards, degrees — shrinks when crowded. */
  maxStep: number
  /** The whole hand never spreads wider than this, degrees. */
  maxSpread: number
  /** Cards further than this from 12 o'clock are hidden (the dotted rest of the circle). */
  visibleTo: number
  cardWidth: number
}

interface Props {
  hand: HandCard
  geometry: FanGeometry
  renderItem: (card: EngineCard) => ReactNode
  onReorder: (cardId: string, toIndex: number) => void
  /** A tap (pointer travelled < 6px) — used to open a nested hand. */
  onItemClick?: (card: EngineCard) => void
}

interface Drag {
  id: string
  startX: number
  startY: number
  angle: number
  active: boolean
}

const clamp = (v: number, lo: number, hi: number): number => Math.max(lo, Math.min(hi, v))

export function Fan({ hand, geometry, renderItem, onReorder, onItemClick }: Props): ReactElement {
  const anchor = useRef<HTMLDivElement | null>(null)
  const [drag, setDrag] = useState<Drag | null>(null)
  const [spin, setSpin] = useState(0)

  const n = hand.children.length
  const step = n > 1 ? Math.min(geometry.maxStep, geometry.maxSpread / (n - 1)) : 0
  const spread = step * (n - 1)
  // when the hand outgrows the visible arc, the wheel rotates it
  const maxSpin = Math.max(0, spread / 2 - geometry.visibleTo)
  const offset = clamp(spin, -maxSpin, maxSpin)
  const angleAt = (slot: number): number => (slot - (n - 1) / 2) * step + offset

  /** Pointer angle about the circle center: 0° = straight up, positive right. */
  const pointerAngle = (e: { clientX: number; clientY: number }): number => {
    const rect = anchor.current!.getBoundingClientRect()
    const cx = rect.left + rect.width / 2
    const cy = rect.top + geometry.radius
    return (Math.atan2(e.clientX - cx, cy - e.clientY) * 180) / Math.PI
  }

  const dragging = drag?.active ? drag : null
  const targetIndex = dragging && n > 1 ? clamp(Math.round((dragging.angle - offset) / step + (n - 1) / 2), 0, n - 1) : 0
  const others = dragging ? hand.children.filter((c) => c.id !== dragging.id) : hand.children

  const handleDown = (card: EngineCard) => (e: ReactPointerEvent<HTMLDivElement>) => {
    if (e.button !== 0) return
    // buttons inside a card (set-aside ×) keep their own clicks
    if ((e.target as HTMLElement).closest('button, input')) return
    e.currentTarget.setPointerCapture(e.pointerId)
    setDrag({ id: card.id, startX: e.clientX, startY: e.clientY, angle: pointerAngle(e), active: false })
  }

  const handleMove = (e: ReactPointerEvent<HTMLDivElement>): void => {
    if (!drag) return
    const active = drag.active || Math.hypot(e.clientX - drag.startX, e.clientY - drag.startY) > 6
    if (!active) return
    setDrag({ ...drag, angle: pointerAngle(e), active })
  }

  const handleUp = (card: EngineCard) => (): void => {
    if (!drag) return
    setDrag(null)
    if (drag.active) onReorder(drag.id, targetIndex)
    else onItemClick?.(card)
  }

  const handleWheel = (e: WheelEvent): void => {
    if (maxSpin > 0) setSpin((s) => clamp(s - (e.deltaY + e.deltaX) * 0.08, -maxSpin, maxSpin))
  }

  return (
    <div ref={anchor} className="fan-anchor" onWheel={handleWheel}>
      {Array.from({ length: n }, (_, slot) => {
        const isTarget = dragging !== null && slot === targetIndex
        const card = isTarget ? hand.children.find((c) => c.id === dragging.id)! : others[dragging && slot > targetIndex ? slot - 1 : slot]!
        const angle = isTarget ? clamp(dragging.angle, angleAt(0), angleAt(n - 1)) : angleAt(slot)
        const offstage = Math.abs(angle) > geometry.visibleTo + step * 0.6
        return (
          <div
            key={card.id}
            className={`fan-slot${isTarget ? ' lifting' : ''}${offstage ? ' offstage' : ''}`}
            style={{
              width: geometry.cardWidth,
              left: `calc(50% - ${geometry.cardWidth / 2}px)`,
              transform: `rotate(${angle}deg)`,
              transformOrigin: `50% ${geometry.radius}px`,
              ['--z' as string]: isTarget ? 100 : slot + 1,
            }}
            onPointerDown={handleDown(card)}
            onPointerMove={handleMove}
            onPointerUp={handleUp(card)}
            onPointerCancel={() => setDrag(null)}
          >
            <div className="fan-item">{renderItem(card)}</div>
          </div>
        )
      })}
    </div>
  )
}
