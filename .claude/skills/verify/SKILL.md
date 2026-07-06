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
   - `.hand-stack-delta` — a decision bundle's "+1 yr 3 mo to goal" verdict
   - `button.pile` opens the draw pile; `.preset-tile:has-text("Buy the car")` imports a preset hand
   - Import opens a hidden file input (use `filechooser` event); Export fires a `download` event
   - A saved table in IndexedDB overrides the starter on load; `?fresh` skips it and deals the starter
5. Golden numbers to expect (starter table, which ships with the ISK tax card):
   baseline "goal in 20 yr 6 mo"; car played → chart "goal in 21 yr 11 mo", bundle "+1 yr 5 mo to goal".
   Without the ISK card (the hand-checked M1 golden scenario, see `app/test/app.test.ts` goldenDoc):
   baseline "goal in 19 yr 5 mo"; car → "goal in 20 yr 8 mo", bundle "+1 yr 3 mo to goal".
6. Offline check: load the preview URL, `await navigator.serviceWorker.ready`, wait ~1 s for precache,
   `context.setOffline(true)`, reload, assert `.chart-verdict-text` renders.
