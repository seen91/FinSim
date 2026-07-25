---
name: verify
description: Drive the FinSim app headlessly to verify UI changes end-to-end — never touch Sebastian's dev server on port 5173.
---

# Verifying FinSim app changes

## Hard rule

Port 5173 belongs to Sebastian's own dev server. Never kill it, never reuse it.
Start your own server on another port and kill only PIDs you started (save them).

## Recipe that works

1. Engine/app tests are CI's job (`npm test` in `engine/` and `app/`) — verification is driving the app.
2. Own dev server: `cd app && npm run dev -- --port 5175 --strictPort` (background, save PID).
   For PWA/offline checks use the built app: `npm run build && npm run preview -- --port 5176 --strictPort`.
3. No Playwright browsers are cached on this machine, but Google Chrome is installed —
   `npm i playwright` in the scratchpad and launch with `chromium.launch({ channel: 'chrome', headless: true })`.
4. Useful hooks in the DOM:
   - `.chart-verdict-text` — the whole table's "goal in X" readout
   - `.hand-stack-delta` — a decision bundle's "+2 yr 4 mo to goal" verdict; scope it to the right
     stack (`.hand-stack:has-text("Buy the car")`) — the investing hand carries one too
   - `button.pile` opens the draw pile; `.preset-tile:has-text("Buy the car")` imports a preset hand
   - Export/Import/Reset live under the one **Table** sign (`.table-sign > button.sign` opens
     `.sign-menu`); Import opens a hidden file input (use `filechooser` event), Export fires a
     `download` event, Reset asks `window.confirm` and wipes table + designs + saved hands
   - A saved table in IndexedDB overrides the starter on load (`?fresh` was removed 2026-07-16) —
     a fresh Playwright context has empty storage, so headless runs always start from the starter deal
5. Expected numbers MOVE WITH THE CALENDAR: the starter salary's raise is January-anchored, and
   the starter table begins at the wall-clock month. Compute today's expected verdicts with a scratch
   vitest in `app/test/` (starterDoc + runSim + firstCrossing/compares — delete it after), don't trust
   remembered strings. For reference, a 2026-07 start gave: baseline "goal in 10 yr 9 mo"; car played →
   chart "goal in 13 yr 1 mo", car bundle "+2 yr 4 mo to goal". The hand-checked five-fund golden
   scenario ("1 yr 3 mo") no longer ships as the starter — it lives in `app/test/app.test.ts`
   (`goldenFiveFundDoc`) and the engine acceptance test.
6. Offline check: load the preview URL, `await navigator.serviceWorker.ready`, wait ~1 s for precache,
   `context.setOffline(true)`, reload, assert `.chart-verdict-text` renders.
