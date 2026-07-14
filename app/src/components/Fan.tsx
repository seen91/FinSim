import type { Card as EngineCard, HandCard } from '@finsim/engine'
import { useRef, useState, type PointerEvent as ReactPointerEvent, type ReactElement, type ReactNode, type WheelEvent } from 'react'

/**
 * A hand fanned around a virtual circle. The same component draws the main
 * hand at the bottom of the screen (large radius — a gentle arc) and an opened
 * hand in the arena (small radius — cards around the top of a visible circle).
 * The circle is virtually complete so a hand can hold any number of cards:
 * angles beyond `visibleTo` are off-stage and the wheel spins them into view.
 *
 * Two drag gestures, split by the radial axis the fan doesn't otherwise use:
 * sliding ALONG the arc reorders (the pointer's angle about the circle center
 * picks the target slot); pulling a card OFF the ring picks it up — the other
 * cards settle back, dropping it on one stacks the two into a hand, and
 * dropping it on nothing lets it leave the hand (opened hands only).
 * No drag-and-drop library, plain pointer math throughout.
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
  /** Lift a card off the ring and drop it onto a sibling — stack them into a hand. */
  onGroup?: (draggedId: string, ontoId: string) => void
  /** A lifted card dropped on nothing leaves the hand (an opened hand's fan only). */
  onEject?: (cardId: string) => void
  /** A tap (pointer travelled < 6px) — used to open a nested hand. */
  onItemClick?: (card: EngineCard) => void
}

interface Drag {
  id: string
  startX: number
  startY: number
  angle: number
  /** Pointer distance from the circle center at grab — the ring the slide follows. */
  grabRadius: number
  /** How far off the ring the pointer has pulled the card, px (outward positive). */
  lift: number
  /** Off the ring: reorder is off, the card under the pointer is a drop target. */
  stacking: boolean
  active: boolean
}

/** Pulling the card this far off the ring picks it up; easing back re-joins the slide. */
const LIFT_ON = 100
const LIFT_OFF = 55

const clamp = (v: number, lo: number, hi: number): number => Math.max(lo, Math.min(hi, v))

export function Fan({ hand, geometry, renderItem, onReorder, onGroup, onEject, onItemClick }: Props): ReactElement {
  const anchor = useRef<HTMLDivElement | null>(null)
  const [drag, setDrag] = useState<Drag | null>(null)
  const [spin, setSpin] = useState(0)
  // the last-hovered card stays lifted after the pointer leaves — its figures
  // stay readable while the pointer is off scrubbing the chart
  const [lifted, setLifted] = useState<string | null>(null)

  const n = hand.children.length
  const step = n > 1 ? Math.min(geometry.maxStep, geometry.maxSpread / (n - 1)) : 0
  const spread = step * (n - 1)
  // when the hand outgrows the visible arc, the wheel rotates it
  const maxSpin = Math.max(0, spread / 2 - geometry.visibleTo)
  const offset = clamp(spin, -maxSpin, maxSpin)
  const angleAt = (slot: number): number => (slot - (n - 1) / 2) * step + offset

  /** Pointer about the circle center: angle (0° = straight up, positive right) and distance. */
  const pointerPolar = (e: { clientX: number; clientY: number }): { angle: number; radius: number } => {
    const rect = anchor.current!.getBoundingClientRect()
    const dx = e.clientX - (rect.left + rect.width / 2)
    const dy = rect.top + geometry.radius - e.clientY
    return { angle: (Math.atan2(dx, dy) * 180) / Math.PI, radius: Math.hypot(dx, dy) }
  }

  const dragging = drag?.active ? drag : null
  const stacking = dragging?.stacking ? dragging : null
  const targetIndex = dragging && n > 1 ? clamp(Math.round((dragging.angle - offset) / step + (n - 1) / 2), 0, n - 1) : 0
  // stacking aims at the ORIGINAL layout (nobody shifts aside) — and only a
  // pointer angularly centered on a sibling arms it; between cards drops nothing
  const stackSlot = stacking && step > 0 ? (stacking.angle - offset) / step + (n - 1) / 2 : null
  const stackTarget =
    stackSlot !== null && Math.abs(stackSlot - Math.round(stackSlot)) <= 0.42 ? (hand.children[Math.round(stackSlot)] ?? null) : null
  const stackTargetId = stackTarget && stackTarget.id !== stacking!.id ? stackTarget.id : null
  const others = dragging && !stacking ? hand.children.filter((c) => c.id !== dragging.id) : hand.children

  const handleDown = (card: EngineCard) => (e: ReactPointerEvent<HTMLDivElement>) => {
    if (e.button !== 0) return
    // buttons inside a card (set-aside ×) keep their own clicks
    if ((e.target as HTMLElement).closest('button, input')) return
    e.currentTarget.setPointerCapture(e.pointerId)
    const polar = pointerPolar(e)
    setDrag({ id: card.id, startX: e.clientX, startY: e.clientY, angle: polar.angle, grabRadius: polar.radius, lift: 0, stacking: false, active: false })
  }

  const handleMove = (e: ReactPointerEvent<HTMLDivElement>): void => {
    if (!drag) return
    const active = drag.active || Math.hypot(e.clientX - drag.startX, e.clientY - drag.startY) > 6
    if (!active) return
    const polar = pointerPolar(e)
    const lift = polar.radius - drag.grabRadius
    const stacking = onGroup !== undefined && n > 1 && lift > (drag.stacking ? LIFT_OFF : LIFT_ON)
    setDrag({ ...drag, angle: polar.angle, lift, stacking, active })
  }

  const handleUp = (card: EngineCard) => (): void => {
    if (!drag) return
    setDrag(null)
    if (drag.active && drag.stacking) {
      if (stackTargetId) onGroup!(drag.id, stackTargetId)
      else onEject?.(drag.id)
    } else if (drag.active) onReorder(drag.id, targetIndex)
    else onItemClick?.(card)
  }

  const handleWheel = (e: WheelEvent): void => {
    if (maxSpin > 0) setSpin((s) => clamp(s - (e.deltaY + e.deltaX) * 0.08, -maxSpin, maxSpin))
  }

  // ejecting: the picked-up card hovers over no sibling and a drop would leave
  // the hand — the class lets the arena hub say so while it is true
  const ejecting = stacking !== null && stackTargetId === null && onEject !== undefined
  return (
    <div ref={anchor} className={`fan-anchor${ejecting ? ' fan-ejecting' : ''}`} onWheel={handleWheel}>
      {Array.from({ length: n }, (_, slot) => {
        // stacking: everyone sits at their own slot, the picked-up card rides the pointer.
        // reordering: the dragged card occupies the target slot, the rest shift aside.
        const isTarget = dragging !== null && (stacking ? hand.children[slot]!.id === stacking.id : slot === targetIndex)
        const card = isTarget && !stacking ? hand.children.find((c) => c.id === dragging!.id)! : others[dragging && !stacking && slot > targetIndex ? slot - 1 : slot]!
        const angle = isTarget ? clamp(dragging!.angle, angleAt(0), angleAt(n - 1)) : angleAt(slot)
        const offstage = Math.abs(angle) > geometry.visibleTo + step * 0.6
        const isDropTarget = stackTargetId !== null && card.id === stackTargetId
        return (
          <div
            key={card.id}
            className={`fan-slot${isTarget ? ' lifting' : ''}${offstage ? ' offstage' : ''}${lifted === card.id ? ' lifted' : ''}${isDropTarget ? ' stack-target' : ''}`}
            style={{
              width: geometry.cardWidth,
              left: `calc(50% - ${geometry.cardWidth / 2}px)`,
              transform: `rotate(${angle}deg)${isTarget && stacking ? ` translateY(${-stacking.lift}px)` : ''}`,
              transformOrigin: `50% ${geometry.radius}px`,
              ['--z' as string]: isTarget ? 100 : slot + 1,
            }}
            onPointerEnter={() => setLifted(card.id)}
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
