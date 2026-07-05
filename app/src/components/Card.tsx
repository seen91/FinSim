import type { ReactElement, ReactNode } from 'react'
import { Glyph, type GlyphName } from '../icons'
import { Sparkline } from './Sparkline'

/**
 * A playing card: real card proportions, kind band, engraved glyph, serif
 * name, headline number, trailing sparkline. Front = meaning, back = math
 * (DESIGN.md §7). The flip is one of the two places motion is spent (§10).
 */
export interface CardStat {
  label: string
  value: string
  cls?: '' | 'pos' | 'neg'
}

export interface CardFace {
  kind: string
  name: string
  glyph: GlyphName
  headline?: string
  headlineClass?: '' | 'pos' | 'neg'
  description?: string
  sparkline?: number[]
  /** Front-of-card stat rows: the numbers that matter, at a glance. */
  stats?: CardStat[]
}

interface Props {
  face: CardFace
  size?: 'hand' | 'table'
  flipped?: boolean
  onFlip?: () => void
  /** Back-face content (parameter sliders etc.). Card is flippable iff present. */
  back?: ReactNode
  muted?: boolean
}

export function Card({ face, size = 'table', flipped = false, onFlip, back, muted }: Props): ReactElement {
  return (
    <div className={`pcard pcard-${size} kind-${face.kind}${muted ? ' muted' : ''}`}>
      <div className={`pcard-inner${flipped ? ' flipped' : ''}`} onClick={back ? onFlip : undefined}>
        <div className="pcard-face pcard-front">
          <header className="pcard-band">
            <span>{face.kind}</span>
          </header>
          <h3 className="pcard-name">{face.name}</h3>
          <div className="pcard-art">
            <Glyph name={face.glyph} size={size === 'hand' ? 34 : 40} />
          </div>
          {face.stats !== undefined && face.stats.length > 0 && (
            <dl className="pcard-stats">
              {face.stats.map((stat) => (
                <div key={stat.label} className="pcard-stat">
                  <dt>{stat.label}</dt>
                  <dd className={`num ${stat.cls ?? ''}`}>{stat.value}</dd>
                </div>
              ))}
            </dl>
          )}
          {face.headline !== undefined && <p className={`pcard-headline num ${face.headlineClass ?? ''}`}>{face.headline}</p>}
          {face.sparkline && (
            <div className="pcard-spark">
              <Sparkline points={face.sparkline} />
            </div>
          )}
          {face.description !== undefined && size === 'hand' && <p className="pcard-desc">{face.description}</p>}
        </div>
        {back !== undefined && (
          <div className="pcard-face pcard-back">
            <header className="pcard-band">
              <span>{face.kind}</span>
            </header>
            <h3 className="pcard-name">{face.name}</h3>
            <div
              className="pcard-back-body"
              onClick={(e) => {
                // sliders and buttons are for editing; anywhere else flips back
                e.stopPropagation()
                if (!(e.target as HTMLElement).closest('input, button')) onFlip?.()
              }}
            >
              {back}
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
