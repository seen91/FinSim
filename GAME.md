#Handscribbeled rought notes by me
Game mode 'Survival'
My thought was to battle agains 'real' and fictional crashes, like in the 90's scenario there is first a housing crash and then inflation and crazy repo interest rate raise (sweden scenario).
Like Sushi roll? I think this is what current M4 is 'Surival'.

Game mode 'Battle'
You battle until you can 'cash out' an opponent (instead of traditional HP)
Otherwise like 'Slay the spire 2'? Where you gain rewards after each and build a hand, and there are some classes with class specific cards like 'Worker' which has no asset cars, only Source or something.
Combine with below for themes for act 1, 2 & 3?

# The Game — specification of the removed M4 prototype

The M4 hot-seat game prototype was removed on 2026-07-18 so the repo is a clear
simulator; future game experiments start fresh from this spec. The full code
lives in git history at commit `4e29583` (`app/src/game/`, tests in
`app/test/game.test.ts`, route `/#game`). The high-level design remains
DESIGN.md §4 (the loop), §5 (the 1990 scenario), §6 (the FI scenario); this
document records what the prototype actually implemented and pins the concrete
rules it settled.

## Concept

A deliberately boring multiplayer card game on top of the simulator engine:
2–6 players draft real historical instruments (Sushi Go / 7 Wonders
pick-and-pass), invest a shared-era decade year by year, and watch real market
data judge them. No dice, no combat — the only interaction is hate-drafting
and the race chart.

## The round loop (one round = one calendar year)

A pure, serializable state machine — no React, no clocks. Stages:
`draft → commit → replay → interim`, then the next round or `final`.

1. **DEAL** — each player gets a hand (7 cards) from the era deck: every
   listed instrument × its `copies`, seeded shuffle per `(seed, round)`.
   An instrument is *listed* once its data series has begun, so 1997's IPOs
   appear in 1997 — and anything newly listed since last round is guaranteed
   one dealt copy.
2. **DRAFT** — simultaneous pick-1-pass-the-rest; passing direction alternates
   by round; when one card remains in each hand it is discarded **face-up**
   (public information). Drafted cards become **standing options**: unlocked
   forever, buyable in any later COMMIT, never an obligation.
3. **COMMIT** — private, per player, atomic: sells first (freeing cash), then
   buys. Only drafted (unlocked) instruments can be bought. All trades execute
   at the January close of the round's year.
4. **SIMULATE / replay** — the year is valued month by month; the host screen
   replays it as a race chart of everyone's net worth with 2–4 curated
   period-accurate headlines sliding by.
5. **INTERIM** — standings; the best portfolio *return* that year collects a
   bonus from the bank (not zero-sum — keeps trailing players alive and
   rewards yearly conviction).
6. **FINAL** — after the last round: standings by net worth, then the
   **epilogue**: everyone's final portfolio frozen and replayed monthly
   through the years after the game (for 1990: through 2002 — the dot-com
   lesson delivers itself).

## Trading rules (DESIGN.md §0, decided 2026-07-13 — "start basic")

- **Courtage** on every buy and sell: `max(0.5 % × amount, 100)`.
- **Capital-gains tax** 30 % on realized gains at sell, average cost basis
  (buy courtage included in basis); losses are not refunded.
- **No sell cap.** Trading only in the COMMIT window already forces
  conviction; a per-year sell cap stays playtest fodder.
- Buys: courtage off the top, the remainder buys fractional units.

## The epistemic rule (§5)

A card only ever shows what was knowable at the in-game month: name, sector,
a trailing 3-year sparkline, a risk grade, and a one-liner written as of the
card's first appearance ("Finnish conglomerate; rubber boots, cables, and now
mobile telephones"). No survivorship hints. Enforced by shape: the accessors
(`trailing`, sparkline, risk grade) never read past the in-game month.

- **Risk grade**: trailing 3-year monthly log-return volatility, annualized —
  A < 15 %, B < 25 %, C < 40 %, D beyond; '·' until 6 months of history.

## Determinism & persistence

A finished game is fully reproducible from `(scenario, seed, decisions)` —
every shuffle is seeded, every pick and commit is appended to a decision log.
That tuple is also the save format, the replay format, and (later) the sync
message format. The prototype persisted state to localStorage and survived
mid-game reload.

## Scenario pack: "1990: The Decade Trade"

A scenario is a data module, not code: instruments + series + tunables.

- 10 rounds (1990–1999), goal: highest net worth on 31 Dec 1999.
- Starting cash 100 000; year-winner bonus 10 000 (10 % of start).
- **41 real instruments**: split/dividend-adjusted monthly total-return closes
  1987–2002 from Yahoo Finance (the chart API works; stooq doesn't), rebased
  to 100 at series start. Listing dates ARE the data. Boring anchors (savings
  account compounding the real 13-week T-bill yield, bond fund, S&P 500 index
  fund) carry 3 copies each; stocks 2. Four delisted names (Enron, WorldCom,
  AOL, Yahoo!) were reconstructed from known split-adjusted anchor closes,
  geometrically interpolated, marked `reconstructed` and footnoted on the card.
- USD treated as table units — no FX in v1 (§0 "Backtesting").
- ~27 curated headlines from Kuwait 1990 through the 2002 NASDAQ bottom
  (epilogue included).

## UI (deliberately ugly, by design)

Single-device hot-seat: a pass-the-device "look away" shield before every
private screen (hand, commit), plain boxes on the wooden table, the race chart
and headlines during the replay. Purpose of M4 was only to test whether the
core loop is fun before building sync — polish was explicitly out of scope.

## What was proven

- The full loop runs end-to-end: a 2-player, 10-round game (120 picks,
  20 commits) through final + epilogue, covered by 19 tests.
- The engine needed nothing game-specific beyond seeded shuffle and series
  sampling — the game layer sat entirely in the app.

## Open questions for the next game experiment

- Is the draft actually fun with market cards only? (M4 was never playtested
  beyond mechanics.)
- Hand size / picks per round if 10-round games drag (§12: the lever is hand
  size, not the mechanic).
- Multi-device sync (DESIGN.md §9), scenario B "Financial Independence First"
  (§6), and whether the round loop should reuse the simulator's hand/pipeline
  grammar instead of a separate ledger model.
