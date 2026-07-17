import type { ReactElement } from 'react'

/**
 * Engraved monochrome glyphs (DESIGN.md §10): no illustrations, no
 * characters — single-stroke marks like the ones stamped on index cards.
 */
export type GlyphName =
  | 'coins'
  | 'briefcase'
  | 'home'
  | 'receipt'
  | 'trend'
  | 'vault'
  | 'percent'
  | 'raise'
  | 'stamp'
  | 'car'
  | 'building'
  | 'bank'
  | 'bundle'
  | 'companion'
  | 'cash'
  | 'check'
  | 'flame'
  | 'skull'
  | 'hand'
  | 'save'
  | 'pause'
  | 'play'
  | 'hammer'
  | 'book'
  | 'export'
  | 'import'

const PATHS: Record<GlyphName, ReactElement> = {
  coins: (
    <>
      <circle cx="9" cy="10" r="5.5" />
      <circle cx="15" cy="14" r="5.5" />
      <path d="M12.5 10.5a5.5 5.5 0 0 1-4 4" opacity="0.4" />
    </>
  ),
  briefcase: (
    <>
      <rect x="4" y="8" width="16" height="11" rx="1.5" />
      <path d="M9 8V6.5A1.5 1.5 0 0 1 10.5 5h3A1.5 1.5 0 0 1 15 6.5V8M4 12.5h16" />
    </>
  ),
  home: (
    <>
      <path d="M4 11.5 12 5l8 6.5" />
      <path d="M6.5 10.5V19h11v-8.5M10.5 19v-5h3v5" />
    </>
  ),
  receipt: (
    <>
      <path d="M6 4h12v15l-2-1.4-2 1.4-2-1.4-2 1.4-2-1.4L6 19Z" />
      <path d="M9 8.5h6M9 11.5h6M9 14.5h4" />
    </>
  ),
  trend: (
    <>
      <path d="M4 18 10 12l3 3 7-7" />
      <path d="M16 8h4v4" />
    </>
  ),
  vault: (
    <>
      <rect x="4.5" y="5" width="15" height="14" rx="1.5" />
      <circle cx="12" cy="12" r="3.5" />
      <path d="M12 8.5V10M12 14v1.5M8.5 12H10M14 12h1.5" />
    </>
  ),
  percent: (
    <>
      <path d="M6 18 18 6" />
      <circle cx="7.5" cy="7.5" r="2.5" />
      <circle cx="16.5" cy="16.5" r="2.5" />
    </>
  ),
  raise: (
    <>
      <path d="M12 19V6M7 11l5-5 5 5" />
      <path d="M6 19h12" opacity="0.4" />
    </>
  ),
  stamp: (
    <>
      <circle cx="12" cy="10" r="4" />
      <path d="M10 13.5 8.5 19h7L14 13.5" />
      <path d="M6 20.5h12" />
    </>
  ),
  car: (
    <>
      <path d="M5 14l1.3-4.2A2 2 0 0 1 8.2 8.5h7.6a2 2 0 0 1 1.9 1.3L19 14" />
      <path d="M4 14h16v3.5h-2M4 17.5V14M6 17.5h10" />
      <circle cx="7.5" cy="17.5" r="1.8" />
      <circle cx="16.5" cy="17.5" r="1.8" />
    </>
  ),
  building: (
    <>
      <rect x="6" y="4.5" width="12" height="15" />
      <path d="M9 8h2M13 8h2M9 11.5h2M13 11.5h2M9 15h2M13 15h2M12 19.5V17" />
    </>
  ),
  bank: (
    <>
      <path d="M4 9.5 12 4.5l8 5" />
      <path d="M5.5 9.5V17M9.8 9.5V17M14.2 9.5V17M18.5 9.5V17M4 17h16v2.5H4Z" />
    </>
  ),
  bundle: (
    <>
      <rect x="4.5" y="7" width="11" height="13" rx="1.2" />
      <rect x="8.5" y="4" width="11" height="13" rx="1.2" />
    </>
  ),
  // a card leaning on its asset — the companion mark the margin kind wears
  companion: (
    <>
      <rect x="11.5" y="4.5" width="8.5" height="15" rx="1.2" />
      <rect x="3" y="7" width="7.5" height="12.5" rx="1.2" transform="rotate(14 6.75 19.5)" />
    </>
  ),
  cash: (
    <>
      <rect x="3.5" y="7" width="17" height="10" rx="1.2" />
      <circle cx="12" cy="12" r="2.6" />
      <path d="M6.2 9.5v.01M17.8 14.5v.01" />
    </>
  ),
  check: (
    <>
      <path d="M5 12.5 10 17.5 19 6.5" />
    </>
  ),
  hand: (
    <>
      <path d="M7.5 12V6.8a1.5 1.5 0 0 1 3 0V11" />
      <path d="M10.5 11V4.8a1.5 1.5 0 0 1 3 0V11" />
      <path d="M13.5 11V6.3a1.5 1.5 0 0 1 3 0v3" />
      <path d="M16.5 9.3a1.5 1.5 0 0 1 3 0v4.7a7 7 0 0 1-7 7h-1.6c-2.1 0-3.5-.7-4.7-1.9l-3-3a1.5 1.5 0 0 1 2.1-2.1l2.2 2.2" />
    </>
  ),
  flame: (
    <>
      <path d="M12 3.5c2.8 3.6-1.6 4.8 1.2 7.8.9-.9 1.3-1.9 1.1-3.1 1.9 1.7 3.2 3.6 3.2 5.6a5.5 5.5 0 0 1-11 0c0-3.6 3.5-5.4 5.5-10.3Z" />
      <path d="M12 19.5c-1.4-.6-2-1.7-1.7-3" opacity="0.5" />
    </>
  ),
  // the graver mark: reset wipes the shelves too, not just the table
  skull: (
    <>
      <path d="M12 3.5a7 7 0 0 0-7 7c0 2.3 1.1 4 2.8 5.1v2.4A1.5 1.5 0 0 0 9.3 19.5h5.4a1.5 1.5 0 0 0 1.5-1.5v-2.4C17.9 14.5 19 12.8 19 10.5a7 7 0 0 0-7-7Z" />
      <circle cx="9.4" cy="11" r="1.4" />
      <circle cx="14.6" cy="11" r="1.4" />
      <path d="M10.5 19.5v-1.8M13.5 19.5v-1.8" opacity="0.5" />
    </>
  ),
  pause: (
    <>
      <path d="M9 6.5v11M15 6.5v11" />
    </>
  ),
  play: (
    <>
      <path d="M8.5 6 17 12l-8.5 6Z" />
    </>
  ),
  hammer: (
    <>
      <path d="M4.5 19.5 10.5 13.5" />
      <path d="M7.5 10 13.5 4 20 10.5 14 16.5Z" />
    </>
  ),
  book: (
    <>
      <path d="M12 6.8C10.4 5.2 8.3 4.6 4.5 4.6v13.2c3.8 0 5.9.6 7.5 2.2 1.6-1.6 3.7-2.2 7.5-2.2V4.6c-3.8 0-5.9.6-7.5 2.2Z" />
      <path d="M12 6.8V20" />
    </>
  ),
  save: (
    <>
      <path d="M5.5 4.5h10l4 4v10a1 1 0 0 1-1 1h-13a1 1 0 0 1-1-1v-13a1 1 0 0 1 1-1Z" />
      <path d="M8.5 4.5v4h6v-4" opacity="0.5" />
      <path d="M8 19.5v-5.5h8v5.5" opacity="0.5" />
    </>
  ),
  export: (
    <>
      <path d="M12 14.5V4.5M8.5 8 12 4.5 15.5 8" />
      <path d="M4.5 14v4a1.5 1.5 0 0 0 1.5 1.5h12a1.5 1.5 0 0 0 1.5-1.5v-4" />
    </>
  ),
  import: (
    <>
      <path d="M12 4.5v10M8.5 11 12 14.5 15.5 11" />
      <path d="M4.5 14v4a1.5 1.5 0 0 0 1.5 1.5h12a1.5 1.5 0 0 0 1.5-1.5v-4" />
    </>
  ),
}

export function Glyph({ name, size = 40 }: { name: GlyphName; size?: number }): ReactElement {
  return (
    <svg
      className="glyph"
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.4"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden
    >
      {PATHS[name]}
    </svg>
  )
}
