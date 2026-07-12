import type { ReactElement } from 'react'
import { Glyph } from '../icons'

/**
 * The Rulebook: the table's rules written down for the player, in the same
 * overlay idiom as the draw pile. Everything here restates DESIGN.md §7's
 * pipeline grammar in table language — it documents, it never invents.
 */
export function Rulebook({ open, onClose }: { open: boolean; onClose: () => void }): ReactElement | null {
  if (!open) return null

  return (
    <div className="drawer" role="dialog" aria-label="Rulebook" onClick={onClose}>
      <div className="drawer-panel rulebook" onClick={(e) => e.stopPropagation()}>
        <header className="drawer-bar">
          <Glyph name="book" size={22} />
          <h2>Rulebook</h2>
          <p className="drawer-hint">how the table plays — press Esc or click outside to close</p>
          <button className="drawer-close" onClick={onClose} aria-label="Close the rulebook">
            ×
          </button>
        </header>

        <div className="rulebook-body">
          <section>
            <h3>The one rule of the table</h3>
            <p>
              Each month, your hand plays <strong>top to bottom</strong>. Every card acts on a running total: sources add to it, drains subtract from it,
              assets and debts draw their keep from it. Whatever reaches the bottom pours into <strong>Cash</strong>. Order matters — a card only ever
              touches what the cards above it left behind.
            </p>
          </section>

          <section>
            <h3>The kinds</h3>
            <dl className="rulebook-kinds">
              <dt>Source</dt>
              <dd>adds its flow to the total. A raise is not a second card — it is the source&rsquo;s own curve growing.</dd>
              <dt>Drain</dt>
              <dd>
                subtracts — a fixed amount, or a <em>percent of the positive total at its position</em>. That percent is how income tax is a card: play it
                below the salary it taxes.
              </dd>
              <dt>Asset</dt>
              <dd>
                a balance that grows. Its monthly deposit (the <em>take</em>) draws from the total — fixed kronor, or a percent of what is left when the
                total reaches it. A fund fee is the asset&rsquo;s own fee parameter, an annual drag on growth.
              </dd>
              <dt>Debt</dt>
              <dd>
                a principal accruing interest, shown as a negative balance. Its payment draws from the total each month and stops the moment the debt is
                paid off — money never leaves the table for a settled debt.
              </dd>
              <dt>Hand</dt>
              <dd>cards stacked into a group that plays as one — the grouping and the scoping construct both. See below.</dd>
              <dt>Rule</dt>
              <dd>a scheduled effect that strikes matching cards below it. See below.</dd>
            </dl>
          </section>

          <section>
            <h3>Hands inside hands</h3>
            <p>
              A hand computes its own subtotal, top to bottom, and contributes the <strong>net at its position</strong> in the parent. The subtotal starts
              from zero — or, if the hand has a take, from money drawn out of the parent&rsquo;s total, so an &ldquo;invest the surplus&rdquo; hand can hold
              percent cards that read real money. Nesting is scoping: what happens in a hand stays in the hand until its net comes out.
            </p>
          </section>

          <section>
            <h3>Rule cards</h3>
            <p>
              A rule fires on a schedule — every month, one calendar month each year, or once at a set date — and applies its effect to cards{' '}
              <strong>below it in its own hand</strong>, nested hands included. Cards above it are out of reach: position is the scope, same as everywhere
              else on the table. An asset-class tax like ISK sits on top of the funds it covers.
            </p>
            <p>
              Which cards below get hit is narrowed by the rule&rsquo;s <strong>target</strong>: card kinds, tags, or named cards — a card must pass every
              filter the rule sets. Leave the target empty and the rule strikes <em>everything</em> below it.
            </p>
            <p>
              Effects come in four shapes: tax a flow (a source or drain amount ×(1&thinsp;−&thinsp;rate)), scale a flow, tax a balance (ISK
              schablonskatt), or scale a balance (a crash: equity ×0.7).
            </p>
          </section>

          <section>
            <h3>Tags</h3>
            <p>
              Any card can wear tags — a comma-separated list on its back, like <code>fund, equity</code>. Tags exist for rules to aim at: a rule targeting{' '}
              <code>fund</code> hits every card below it that carries <code>fund</code>. A card can wear as many tags as you like, and one match is enough —
              a rule aiming at <code>fund, equity</code> hits a card tagged with either.
            </p>
          </section>

          <section>
            <h3>Cadence &amp; start</h3>
            <p>
              The table ticks monthly. A weekly, biweekly, quarterly or yearly amount is smoothed into the tick (weekly ×52/12, yearly ÷12, and so on) — a
              lump that lands in one specific month is a step curve or a once-rule, not a cadence. Every card can also enter play later than the table: its
              start month is on its back.
            </p>
          </section>

          <section>
            <h3>Set aside &amp; the verdict</h3>
            <p>
              Every card and hand carries a <strong>verdict</strong>: the table is silently replayed without it, and the difference in time-to-goal is
              stamped on the card — &ldquo;+1&nbsp;yr&nbsp;3&nbsp;mo to goal&rdquo; means playing this card delays the goal by that much. Set a card aside (
              <Glyph name="pause" size={11} />) and the table plays as if it were not there — it stays in your hand so you can weigh it without discarding
              it.
            </p>
          </section>

          <section>
            <h3>The fan: futures, not promises</h3>
            <p>
              There is <strong>no simulate button</strong> — the table simulates on every edit, automatically. But it only has something to show when at
              least one asset in play carries a <strong>volatility</strong> (the <em>±&nbsp;%/yr</em> on its back): without one, every future is the same
              line, so no fan is drawn, no odds are given, and verdicts stay single numbers. If you expect a fan and see none, check the volatility on your
              assets — a table saved before its assets had one plays deterministic until you add it.
            </p>
            <p>
              A growth number like <em>7 % /yr</em> is a <strong>CAGR — the middle future, not a guarantee</strong>. Give an asset a volatility on its back
              and the table simulates hundreds of seeded futures: the shaded fan on the chart holds the middle 80 % of them, and the drawn line is
              (almost exactly) the median future. The average future actually runs <em>above</em> the line — a few lucky runs pull it up — which is why
              honest planning reads the fan, not the average.
            </p>
            <p>
              Volatile assets <strong>move together</strong> unless you say otherwise: &ldquo;moves with market&rdquo; on the card&rsquo;s back is its tie to
              the one shared market (100 % by default — index funds tracking overlapping markets do not diversify each other). Lower it for things that
              genuinely march to their own drum.
            </p>
            <p>
              Only growth-rate assets are ever shocked. A card <strong>priced by historical data</strong> follows its series exactly, in every future — its
              past already happened, so the dice never touch it. Flows, debts and cash stay deterministic too.
            </p>
            <p>
              Verdicts speak the same language: the plan&rsquo;s goal date gains <em>&ldquo;in NN % of futures&rdquo;</em>, and a bundle&rsquo;s
              time-to-goal cost becomes a range — &ldquo;+1 yr – 2 yr 6 mo in 80 % of futures&rdquo; — measured under identical market draws with and
              without the bundle, so the range is the decision&rsquo;s, not the dice&rsquo;s.
            </p>
            <p>
              And the fan unfolds: <strong>click the &ldquo;in NN % of futures&rdquo; odds under the chart</strong> to open the futures report — when the
              goal tends to land year by year, how the horizon can close from the unlucky tenth to the lucky one, and what each bundle costs across
              futures, all read from the same dealt set.
            </p>
          </section>

          <section>
            <h3>Replays: one real past, not a fan of futures</h3>
            <p>
              Import historical monthly data in the Workshop (the <strong>Data</strong> bench) and it becomes a card priced by the real series — deposits
              buy units at each month&rsquo;s actual price. Play one and a <strong>Replay</strong> picker appears beside the start date: pick a past month
              and every historical series on the table shifts <em>together</em> so that month lines up with your start — &ldquo;the next 20 years play out
              like 1999 onward did.&rdquo; Your goal, dates, ghosts and verdicts stay on the present timeline; only the data&rsquo;s past is borrowed. The
              picker only offers months the data can cover for your whole horizon.
            </p>
            <p>
              A replay is <strong>one real past</strong> — it answers &ldquo;what would this plan have done through that stretch of history,&rdquo; not
              &ldquo;what might happen.&rdquo; The fan keeps coming from growth-rate cards with volatility only: a table of only historical cards draws a
              single deterministic line, and the futures report keeps speaking about simulated futures, never about the replayed past.
            </p>
            <p>
              The anchor is part of the table: it saves, exports and imports with everything else. Clear it (the <strong>×</strong> beside the picker) and
              the authored world returns exactly — the replay never rewrote a number. And if a historical card is asked for a month its data does not
              cover — played before a date is picked, or a horizon longer than the series — the table says so in plain words above the chart instead of
              guessing: pick a replay date the data covers, or move the table&rsquo;s start.
            </p>
            <p>
              Two data traps: use <strong>total-return</strong> series (a price-only index understates returns by leaving out dividends), and amounts are
              in whatever currency the series is denominated in — FX is not modeled, so keep the table and its data in one currency.
            </p>
          </section>

          <section>
            <h3>Cash</h3>
            <p>
              Cash is the vessel at the bottom of the root hand: whatever survives the pipeline each month lands there. It is not a card you play — it is
              the table&rsquo;s floor, and net worth is cash plus every balance on the table.
            </p>
          </section>
        </div>
      </div>
    </div>
  )
}
