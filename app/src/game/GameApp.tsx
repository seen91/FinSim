import { formatMonth, fromMonthIndex } from '@finsim/engine'
import { useCallback, useEffect, useMemo, useRef, useState, type ReactElement } from 'react'
import { Sparkline } from '../components/Sparkline'
import { errorMessage, formatAmount, formatPercent } from '../format'
import {
  commit,
  commitMonth,
  epilogue,
  finalStandings,
  instrument,
  netWorthAt,
  newGame,
  nextRound,
  pick,
  previewBuy,
  previewSell,
  priceAt,
  riskGrade,
  showInterim,
  trailing,
  type CommitOrders,
  type GameState,
} from './game'
import { RaceChart, PLAYER_COLORS } from './RaceChart'
import { SCENARIO_1990, type Scenario } from './scenario1990'
import './game.css'

/**
 * M4 — the hot-seat game prototype (DESIGN.md §13). One device passed around
 * the table, "look away" drafting, deliberately ugly: the point is to find
 * out whether the game is fun, not to be pretty. Reached at /#game; the
 * simulator is untouched.
 */

const SAVE_KEY = 'finsim-game-m4'
const S: Scenario = SCENARIO_1990

interface Store {
  state: GameState | null
  update: (mutate: (state: GameState) => void) => void
  start: (seed: number, players: string[]) => void
  abandon: () => void
}

function useGame(): Store {
  const [state, setState] = useState<GameState | null>(() => {
    try {
      const saved = localStorage.getItem(SAVE_KEY)
      return saved ? (JSON.parse(saved) as GameState) : null
    } catch {
      return null
    }
  })
  useEffect(() => {
    if (state) localStorage.setItem(SAVE_KEY, JSON.stringify(state))
    else localStorage.removeItem(SAVE_KEY)
  }, [state])
  const update = useCallback((mutate: (s: GameState) => void) => {
    setState((current) => {
      if (!current) return current
      const next = structuredClone(current)
      mutate(next)
      return next
    })
  }, [])
  return {
    state,
    update,
    start: (seed, players) => setState(newGame(S, seed, players)),
    abandon: () => setState(null),
  }
}

// --- shared bits ------------------------------------------------------------

function yearOf(state: GameState): number {
  return S.startYear + state.round
}

/** All completed months so far, concatenated — the decade race chart's data. */
function raceData(state: GameState): { months: number[]; nw: number[][] } {
  const months = state.history.flatMap((y) => y.months)
  const nw = state.players.map((_, p) => state.history.flatMap((y) => y.nw[p]!))
  return { months, nw }
}

function PlayerTag({ state, player }: { state: GameState; player: number }): ReactElement {
  return (
    <span className="g-player" style={{ color: PLAYER_COLORS[player % PLAYER_COLORS.length] }}>
      {state.players[player]}
    </span>
  )
}

/** The epistemic card front: only what was knowable at `month` (§5). */
function InstrumentFace({ id, month, onClick, selected }: { id: string; month: number; onClick?: () => void; selected?: boolean }): ReactElement {
  const inst = instrument(S, id)
  const closes = trailing(S, id, month)
  const price = priceAt(S, id, month)
  const yearAgo = closes.length > 12 ? closes[closes.length - 13]! : null
  return (
    <button className={`g-card${selected ? ' selected' : ''}`} onClick={onClick} disabled={!onClick}>
      <div className="g-card-top">
        <strong>{inst.name}</strong>
        <span className="g-risk" title="risk grade from trailing 3-year volatility: A calm … D wild">
          {riskGrade(S, id, month)}
        </span>
      </div>
      <div className="g-card-sector">{inst.sector}</div>
      <Sparkline points={closes} width={150} height={30} />
      <div className="g-card-price num">
        {formatAmount(price)}
        {yearAgo !== null && (
          <span className={price >= yearAgo ? 'pos' : 'neg'}> {formatPercent(price / yearAgo - 1, 0)} /yr</span>
        )}
      </div>
      <div className="g-card-blurb">{inst.blurb}</div>
      {inst.reconstructed && <div className="g-card-note">reconstructed series (annual anchors, interpolated)</div>}
    </button>
  )
}

// --- screens ----------------------------------------------------------------

function Setup({ store }: { store: Store }): ReactElement {
  const [names, setNames] = useState(['Anna', 'Bo'])
  const [seed, setSeed] = useState('1990')
  const canStart = names.length >= 2 && names.every((n) => n.trim().length > 0)
  return (
    <div className="g-screen g-setup">
      <h1>{S.name}</h1>
      <p>
        Draft real securities year by year, 1990 to 1999, on one shared device. Pick a card, pass the rest. Trade once a
        year. Highest net worth on 31 Dec 1999 wins. Everyone starts with {formatAmount(S.startingCash)}; the best return
        each year earns {formatAmount(S.yearBonus)} from the bank.
      </p>
      {names.map((name, p) => (
        <div key={p} className="g-row">
          <input value={name} onChange={(e) => setNames(names.map((n, q) => (q === p ? e.target.value : n)))} />
          {names.length > 2 && <button onClick={() => setNames(names.filter((_, q) => q !== p))}>remove</button>}
        </div>
      ))}
      <div className="g-row">
        {names.length < 6 && <button onClick={() => setNames([...names, `Player ${names.length + 1}`])}>+ player</button>}
        <label>
          seed <input className="num" size={6} value={seed} onChange={(e) => setSeed(e.target.value)} />
        </label>
      </div>
      <button className="g-primary" disabled={!canStart} onClick={() => store.start(Number(seed) || 1990, names.map((n) => n.trim()))}>
        Deal 1990
      </button>
      <p className="g-fine">
        Prices are split- and dividend-adjusted monthly closes (Yahoo Finance), rebased to 100 where their history starts,
        in the series' own currency (USD) — no FX. Courtage {formatPercent(S.courtage.rate)} (min {S.courtage.min}),
        capital-gains tax {formatPercent(S.capitalGainsTax, 0)} on realized gains. A card only ever shows what was knowable
        at the in-game date.
      </p>
    </div>
  )
}

/** The look-away interstitial: nothing private renders until the named player taps. */
function Shield({ state, player, onReveal }: { state: GameState; player: number; onReveal: () => void }): ReactElement {
  return (
    <div className="g-screen g-shield">
      <h2>
        Pass the device to <PlayerTag state={state} player={player} />
      </h2>
      <p>Everyone else, look away.</p>
      <button className="g-primary" onClick={onReveal}>
        I am {state.players[player]} — show my hand
      </button>
    </div>
  )
}

function DraftScreen({ state, player, update }: { state: GameState; player: number; update: Store['update'] }): ReactElement {
  const [selected, setSelected] = useState<string | null>(null)
  const month = commitMonth(S, state.round)
  const hand = state.draft.hands[player]!
  const taken = state.draft.taken[player]!
  const pickNo = taken.length + 1
  const picksTotal = S.handSize - 1
  return (
    <div className="g-screen">
      <header className="g-head">
        <h2>
          {yearOf(state)} draft — <PlayerTag state={state} player={player} />
        </h2>
        <span>
          pick {pickNo} of {picksTotal} · pass {state.draft.passLeft ? 'left' : 'right'}
        </span>
      </header>
      <div className="g-cards">
        {hand.map((id, i) => (
          <InstrumentFace key={`${id}:${i}`} id={id} month={month} selected={selected === id} onClick={() => setSelected(id)} />
        ))}
      </div>
      <button
        className="g-primary"
        disabled={selected === null}
        onClick={() => {
          update((s) => pick(s, player, selected!))
          setSelected(null)
        }}
      >
        {selected ? `Take ${instrument(S, selected).name}` : 'Pick a card'}
      </button>
      {taken.length > 0 && (
        <p className="g-fine">taken this round: {taken.map((id) => instrument(S, id).name).join(', ')}</p>
      )}
      {state.discards.length > 0 && (
        <details className="g-fine">
          <summary>face-up discards, all rounds ({state.discards.length})</summary>
          {state.discards.map((id) => instrument(S, id).name).join(', ')}
        </details>
      )}
    </div>
  )
}

function CommitScreen({ state, player, update }: { state: GameState; player: number; update: Store['update'] }): ReactElement {
  const [sells, setSells] = useState<Record<string, string>>({})
  const [buys, setBuys] = useState<Record<string, string>>({})
  const month = commitMonth(S, state.round)
  const ledger = state.ledgers[player]!
  const held = Object.keys(ledger.positions)

  // build + price the whole order set live; any problem reads as text, not a crash
  const preview = useMemo(() => {
    const orders: CommitOrders = { sells: [], buys: [] }
    let cash = ledger.cash
    let costs = 0
    try {
      for (const [id, text] of Object.entries(sells)) {
        const units = Number(text.replace(',', '.'))
        if (!text.trim() || units === 0) continue
        if (!Number.isFinite(units) || units < 0) throw new Error(`sell ${instrument(S, id).name}: "${text}" is not a number`)
        const t = previewSell(S, month, id, units, ledger.positions[id]!)
        orders.sells.push({ id, units })
        cash += t.cash
        costs += t.courtage + t.tax
      }
      for (const [id, text] of Object.entries(buys)) {
        const amount = Number(text.replace(',', '.'))
        if (!text.trim() || amount === 0) continue
        if (!Number.isFinite(amount) || amount < 0) throw new Error(`buy ${instrument(S, id).name}: "${text}" is not a number`)
        const t = previewBuy(S, month, id, amount)
        orders.buys.push({ id, amount })
        cash -= amount
        costs += t.courtage
      }
      if (cash < -1e-6) throw new Error(`orders overspend by ${formatAmount(-cash)}`)
      return { orders, cash, costs, error: null as string | null }
    } catch (err) {
      return { orders, cash, costs, error: errorMessage(err) }
    }
  }, [sells, buys, ledger, month])

  return (
    <div className="g-screen">
      <header className="g-head">
        <h2>
          {yearOf(state)} trading window — <PlayerTag state={state} player={player} />
        </h2>
        <span className="num">cash {formatAmount(ledger.cash)}</span>
      </header>

      {held.length > 0 && (
        <table className="g-table">
          <thead>
            <tr>
              <th>position</th>
              <th className="num">units</th>
              <th className="num">value</th>
              <th className="num">vs cost</th>
              <th className="num">sell units</th>
            </tr>
          </thead>
          <tbody>
            {held.map((id) => {
              const position = ledger.positions[id]!
              const value = position.units * priceAt(S, id, month)
              const gain = value - position.cost
              return (
                <tr key={id}>
                  <td>{instrument(S, id).name}</td>
                  <td className="num">{position.units.toFixed(2)}</td>
                  <td className="num">{formatAmount(value)}</td>
                  <td className={`num ${gain >= 0 ? 'pos' : 'neg'}`}>{formatAmount(gain)}</td>
                  <td>
                    <input
                      className="num"
                      size={8}
                      value={sells[id] ?? ''}
                      placeholder="0"
                      onChange={(e) => setSells({ ...sells, [id]: e.target.value })}
                    />
                    <button onClick={() => setSells({ ...sells, [id]: String(position.units) })}>all</button>
                  </td>
                </tr>
              )
            })}
          </tbody>
        </table>
      )}

      <h3>your drafted options — spend cash, courtage comes off the top</h3>
      <div className="g-buys">
        {ledger.unlocked.map((id) => (
          <div key={id} className="g-buy">
            <InstrumentFace id={id} month={month} />
            <input
              className="num"
              placeholder="amount"
              value={buys[id] ?? ''}
              onChange={(e) => setBuys({ ...buys, [id]: e.target.value })}
            />
          </div>
        ))}
      </div>

      <p className="num">
        after trades: cash {formatAmount(preview.cash)} · courtage + tax {formatAmount(preview.costs)}
      </p>
      {preview.error && <p className="g-error">{preview.error}</p>}
      <button
        className="g-primary"
        disabled={preview.error !== null}
        onClick={() => update((s) => commit(s, S, player, preview.orders))}
      >
        Commit {yearOf(state)} and pass on
      </button>
    </div>
  )
}

function ReplayScreen({ state, update }: { state: GameState; update: Store['update'] }): ReactElement {
  const { months, nw } = raceData(state)
  const yearStart = months.length - 12
  const [cursor, setCursor] = useState(yearStart + 1)
  const done = cursor >= months.length - 1
  useEffect(() => {
    if (done) return
    const timer = setInterval(() => setCursor((c) => c + 1), 600)
    return () => clearInterval(timer)
  }, [done])
  const shownMonth = months[Math.min(cursor, months.length - 1)]!
  const year = state.history[state.history.length - 1]!
  const news = S.headlines.filter((h) => fromMonthIndex(h.month).year === year.year && h.month <= shownMonth)
  return (
    <div className="g-screen">
      <header className="g-head">
        <h2>{year.year} — the year plays out</h2>
        <span className="num">{formatMonth(shownMonth)}</span>
      </header>
      <RaceChart months={months} nw={nw} names={state.players} cursor={cursor} />
      <ul className="g-news">
        {news.map((h) => (
          <li key={`${h.month}:${h.text}`}>
            <span className="num">{formatMonth(h.month)}</span> {h.text}
          </li>
        ))}
      </ul>
      {done ? (
        <button className="g-primary" onClick={() => update((s) => showInterim(s))}>
          Standings
        </button>
      ) : (
        <button onClick={() => setCursor(months.length - 1)}>skip to December</button>
      )}
    </div>
  )
}

function InterimScreen({ state, update }: { state: GameState; update: Store['update'] }): ReactElement {
  const year = state.history[state.history.length - 1]!
  const month = year.months[11]!
  const rows = state.players
    .map((_, p) => ({ p, ret: year.returns[p]!, nw: netWorthAt(S, state.ledgers[p]!, month) }))
    .sort((a, b) => b.nw - a.nw)
  const lastRound = state.round + 1 >= S.rounds
  return (
    <div className="g-screen">
      <h2>Årets resultat, {year.year}</h2>
      <table className="g-table">
        <thead>
          <tr>
            <th>player</th>
            <th className="num">return {year.year}</th>
            <th className="num">net worth</th>
            <th></th>
          </tr>
        </thead>
        <tbody>
          {rows.map((r) => (
            <tr key={r.p}>
              <td>
                <PlayerTag state={state} player={r.p} />
              </td>
              <td className={`num ${r.ret >= 0 ? 'pos' : 'neg'}`}>{formatPercent(r.ret)}</td>
              <td className="num">{formatAmount(r.nw)}</td>
              <td>{year.winners.includes(r.p) && `year's best — +${formatAmount(S.yearBonus)} from the bank`}</td>
            </tr>
          ))}
        </tbody>
      </table>
      <button className="g-primary" onClick={() => update((s) => nextRound(s, S))}>
        {lastRound ? 'Final results' : `Deal ${yearOf(state) + 1}`}
      </button>
    </div>
  )
}

function FinalScreen({ state, store }: { state: GameState; store: Store }): ReactElement {
  const [epi, setEpi] = useState(false)
  const [cursor, setCursor] = useState(1)
  const standings = finalStandings(state, S)
  const race = raceData(state)
  const tail = useMemo(() => epilogue(state, S), [state])
  const months = epi ? race.months.concat(tail.months) : race.months
  const nw = epi ? race.nw.map((s, p) => s.concat(tail.nw[p]!)) : race.nw
  const end = months.length - 1
  const revealed = epi ? Math.min(race.months.length + cursor, end) : end
  useEffect(() => {
    if (!epi || revealed >= end) return
    const timer = setInterval(() => setCursor((c) => c + 1), 350)
    return () => clearInterval(timer)
  }, [epi, revealed, end])
  const shownMonth = months[revealed]!
  const news = S.headlines.filter((h) => h.month > race.months[race.months.length - 1]! && h.month <= shownMonth)
  const winner = standings[0]!
  return (
    <div className="g-screen">
      <h2>Final standings — 31 Dec 1999</h2>
      <p>
        <PlayerTag state={state} player={winner.player} /> wins with {formatAmount(winner.nw)}.
      </p>
      <table className="g-table">
        <tbody>
          {standings.map((s, place) => (
            <tr key={s.player}>
              <td>{place + 1}.</td>
              <td>
                <PlayerTag state={state} player={s.player} />
              </td>
              <td className="num">{formatAmount(s.nw)}</td>
            </tr>
          ))}
        </tbody>
      </table>
      <RaceChart months={months} nw={nw} names={state.players} cursor={revealed} />
      {epi && (
        <ul className="g-news">
          {news.map((h) => (
            <li key={`${h.month}:${h.text}`}>
              <span className="num">{formatMonth(h.month)}</span> {h.text}
            </li>
          ))}
        </ul>
      )}
      {!epi ? (
        <button className="g-primary" onClick={() => setEpi(true)}>
          What happened next? (2000–2002, portfolios frozen)
        </button>
      ) : (
        revealed >= end && (
          <p className="g-fine">
            That is where the decade left everyone. Losing teaches: the epilogue is the lesson, not the loss.
          </p>
        )
      )}
      <button onClick={() => store.abandon()}>New game</button>
    </div>
  )
}

// --- the app ----------------------------------------------------------------

export function GameApp(): ReactElement {
  const store = useGame()
  const { state, update } = store
  // one player is "revealed" at a time; the key changes whenever the actor does,
  // so the shield falls back automatically after every private action
  const [revealed, setRevealed] = useState<string | null>(null)

  if (!state) return <Setup store={store} />

  const actor =
    state.stage === 'draft'
      ? state.draft.pending.indexOf(null)
      : state.stage === 'commit'
        ? state.commitDone.indexOf(false)
        : -1
  const pickNo = state.stage === 'draft' ? state.draft.taken.reduce((a, t) => Math.max(a, t.length), 0) : 0
  const actorKey = `${state.stage}:${state.round}:${pickNo}:${actor}`

  let screen: ReactElement
  if (actor >= 0 && revealed !== actorKey) {
    screen = <Shield state={state} player={actor} onReveal={() => setRevealed(actorKey)} />
  } else if (state.stage === 'draft') {
    screen = <DraftScreen state={state} player={actor} update={update} />
  } else if (state.stage === 'commit') {
    screen = <CommitScreen key={actorKey} state={state} player={actor} update={update} />
  } else if (state.stage === 'replay') {
    screen = <ReplayScreen key={state.round} state={state} update={update} />
  } else if (state.stage === 'interim') {
    screen = <InterimScreen state={state} update={update} />
  } else {
    screen = <FinalScreen state={state} store={store} />
  }

  return (
    <div className="game">
      <header className="g-topbar">
        <strong>{S.name}</strong>
        <span>
          {state.stage === 'final' ? 'game over' : `${yearOf(state)} · round ${state.round + 1}/${S.rounds}`}
        </span>
        <button
          onClick={() => {
            if (window.confirm('Abandon this game?')) store.abandon()
          }}
        >
          abandon
        </button>
      </header>
      {screen}
    </div>
  )
}
