import { ym, type SampledData } from '@finsim/engine'
import rawSeries from './series1990.json'

/**
 * "1990: The Decade Trade" — the M4 scenario pack (DESIGN.md §5).
 *
 * Every instrument is a real monthly total-return series (split- and
 * dividend-adjusted closes, rebased to 100 at the series start; Yahoo
 * Finance). Listing dates are the data itself: a card can only be dealt once
 * its series has begun, so 1997's IPOs appear in 1997. Four delisted names
 * Yahoo no longer carries (Enron, WorldCom, AOL, Yahoo!) are reconstructed
 * from known split-adjusted closes, geometrically interpolated between
 * anchors — marked `reconstructed` and footnoted on the card. The savings
 * account compounds the real 13-week T-bill yield; everything is denominated
 * in the series' own currency (USD) treated as table units — no FX in v1
 * (DESIGN.md §0 "Backtesting").
 *
 * The epistemic rule (§5) is enforced by the pack shape: a card front only
 * ever shows trailing data up to the in-game month. Descriptions are written
 * as of the card's first appearance — no survivorship hints.
 */

export interface Instrument {
  id: string
  name: string
  sector: string
  /** Period-accurate one-liner, written as of the card's first appearance. */
  blurb: string
  /** How many copies of this card the era deck holds. */
  copies: number
  /** True for the four series rebuilt from anchor closes, not fetched bar by bar. */
  reconstructed?: boolean
}

export interface Headline {
  month: number
  text: string
}

export interface Scenario {
  id: string
  name: string
  startYear: number
  /** Rounds = years; round r plays calendar year startYear + r. */
  rounds: number
  startingCash: number
  /** Year-winner bonus, paid by the bank (10 % of starting capital). */
  yearBonus: number
  handSize: number
  /** Courtage on every buy and sell: max(rate × amount, min). */
  courtage: { rate: number; min: number }
  /** Capital-gains tax on realized gains at sell (average cost basis). */
  capitalGainsTax: number
  /** The epilogue replays through this month with portfolios frozen. */
  epilogueThrough: number
  instruments: Instrument[]
  series: Record<string, SampledData>
  headlines: Headline[]
}

const i = (id: string, name: string, sector: string, blurb: string, copies = 2, reconstructed?: boolean): Instrument => ({
  id,
  name,
  sector,
  blurb,
  copies,
  ...(reconstructed ? { reconstructed: true } : {}),
})

const INSTRUMENTS: Instrument[] = [
  // the boring anchors — always in the pool, extra copies so nobody is denied boredom
  i('SAVINGS', 'Savings account', 'Cash', 'Cash in the bank at the short-term rate. Sleeps well.', 3),
  i('BONDS', 'Bond fund', 'Bonds', 'Investment-grade American bonds; collects coupons, complains little.', 3),
  i('INDEX', 'S&P 500 index fund', 'Funds', 'Owns a slice of the 500 biggest American companies; dividends reinvested.', 3),
  // tech, listed by 1990
  i('MSFT', 'Microsoft', 'Technology', 'Redmond software house; DOS and Windows license nearly every PC clone shipped.'),
  i('INTC', 'Intel', 'Technology', 'Makes the 386 and 486 processors inside those clones.'),
  i('AAPL', 'Apple Computer', 'Technology', 'The Macintosh company — premium machines, loyal fans, thin margins.'),
  i('IBM', 'IBM', 'Technology', 'Big Blue. Mainframes, consultants, and a dividend.'),
  i('ORCL', 'Oracle', 'Technology', 'Relational databases for corporate back offices.'),
  i('CSCO', 'Cisco Systems', 'Technology', 'Fresh IPO: sells the routers that connect computer networks together.'),
  i('HPQ', 'Hewlett-Packard', 'Technology', 'Test instruments, minicomputers, and a fast-growing printer business.'),
  i('TXN', 'Texas Instruments', 'Technology', 'Dallas chipmaker: calculators, defense electronics, semiconductors.'),
  i('MU', 'Micron Technology', 'Technology', 'Boise memory-chip maker riding the brutal DRAM cycle.'),
  i('ADBE', 'Adobe Systems', 'Technology', 'PostScript put it inside every laser printer; now it sells Photoshop.'),
  i('AMD', 'AMD', 'Technology', 'Second-source x86 chips, a step behind Intel on speed and price.'),
  i('ERIC', 'Ericsson', 'Telecom', 'Swedish maker of telephone exchanges; AXE switches sold worldwide.'),
  // blue chips
  i('KO', 'Coca-Cola', 'Consumer', 'Sells sugared water on every continent. Mr Buffett owns a chunk.'),
  i('PEP', 'PepsiCo', 'Consumer', 'Cola number two — plus Frito-Lay and a stable of fast-food chains.'),
  i('MCD', "McDonald's", 'Consumer', 'Burgers at scale; opens a new restaurant somewhere every few hours.'),
  i('DIS', 'Walt Disney', 'Consumer', 'Mickey Mouse, theme parks, and a resurgent animation studio.'),
  i('WMT', 'Wal-Mart', 'Consumer', 'Discount stores rolling out of Arkansas across all of America.'),
  i('HD', 'Home Depot', 'Consumer', 'Warehouse-sized hardware stores; do-it-yourself is booming.'),
  i('NKE', 'Nike', 'Consumer', 'Air Jordan sells sneakers faster than the factories can make them.'),
  i('PG', 'Procter & Gamble', 'Consumer', 'Tide, Pampers, Crest — the American bathroom cabinet.'),
  i('JNJ', 'Johnson & Johnson', 'Health', 'Band-Aids to prescription drugs; raises its dividend every year.'),
  i('PFE', 'Pfizer', 'Health', 'New York pharmaceuticals house with a deep research pipeline.'),
  i('MRK', 'Merck', 'Health', 'The most admired drugmaker in America, most years.'),
  i('GE', 'General Electric', 'Industry', "Jack Welch's conglomerate: jet engines, light bulbs, NBC, and a growing finance arm."),
  i('XOM', 'Exxon', 'Energy', 'The biggest of the oil majors; pumps, refines, pays a dividend.'),
  i('BA', 'Boeing', 'Industry', 'One half of the airliner duopoly; the 747 is queen of the skies.'),
  i('CAT', 'Caterpillar', 'Industry', 'Yellow iron: bulldozers and diesel engines for a building world.'),
  i('F', 'Ford', 'Industry', "Detroit's number two; the Taurus is America's best-selling car."),
  // the decade's stories — they enter the deck when their data begins
  i('ENRON', 'Enron', 'Energy', 'Houston pipelines, and a bold new business: trading natural gas itself.', 2, true),
  i('WCOM', 'LDDS WorldCom', 'Telecom', 'Mississippi long-distance reseller with an appetite for acquisitions.', 2, true),
  i('QCOM', 'Qualcomm', 'Telecom', 'San Diego startup pushing a spread-spectrum radio idea called CDMA.'),
  i('SBUX', 'Starbucks', 'Consumer', 'Seattle roaster convinced Americans will pay two dollars for coffee.'),
  i('AOL', 'America Online', 'Technology', 'Mails floppy disks until America comes online; charges by the hour.', 2, true),
  i('NOK', 'Nokia', 'Telecom', 'Finnish conglomerate; rubber boots, cables, and now mobile telephones.'),
  i('YHOO', 'Yahoo!', 'Technology', 'A hand-made directory of the entire World Wide Web, with advertisements.', 2, true),
  i('AMZN', 'Amazon.com', 'Technology', "“Earth's biggest bookstore”, on the World Wide Web; profits postponed."),
  i('EBAY', 'eBay', 'Technology', 'A web flea market where strangers auction collectibles. Actually profitable.'),
  i('BKNG', 'Priceline.com', 'Technology', 'Name your own price for airline seats; spends heavily on becoming a verb.'),
]

const HEADLINES: Headline[] = [
  { month: ym(1990, 8), text: 'Iraq invades Kuwait — oil spikes, stocks slump' },
  { month: ym(1990, 10), text: "Japan's Nikkei has lost a third of its value this year" },
  { month: ym(1991, 1), text: 'Desert Storm begins — markets rally on the first night' },
  { month: ym(1991, 12), text: 'The Soviet Union is dissolved' },
  { month: ym(1992, 9), text: 'Sterling crisis; Sweden defends the krona at 500 % overnight' },
  { month: ym(1992, 11), text: 'Clinton wins; “it’s the economy, stupid”' },
  { month: ym(1993, 3), text: 'Intel ships the Pentium' },
  { month: ym(1993, 12), text: 'NAFTA is signed — free trade across North America' },
  { month: ym(1994, 2), text: 'The Fed starts hiking — the great bond massacre begins' },
  { month: ym(1994, 12), text: 'Orange County goes bankrupt on derivatives' },
  { month: ym(1995, 8), text: 'Netscape IPO doubles on day one — the Web is investable' },
  { month: ym(1995, 8), text: 'Windows 95 launches to queues at midnight' },
  { month: ym(1996, 12), text: 'Greenspan wonders aloud about “irrational exuberance”' },
  { month: ym(1997, 7), text: 'Asian currency crisis begins in Thailand' },
  { month: ym(1997, 10), text: 'Hong Kong flu: Dow drops 554 points in a day' },
  { month: ym(1998, 8), text: 'Russia defaults; a hedge fund called LTCM implodes' },
  { month: ym(1998, 11), text: 'The Fed cuts three times — markets roar back' },
  { month: ym(1999, 1), text: 'The euro is born' },
  { month: ym(1999, 11), text: 'Everything with .com in its name doubles' },
  { month: ym(1999, 12), text: 'NASDAQ finishes the year up 86 %' },
  // epilogue
  { month: ym(2000, 3), text: 'NASDAQ peaks at 5 048' },
  { month: ym(2000, 4), text: 'The dot-com crash begins' },
  { month: ym(2000, 12), text: 'Dot-coms are failing weekly' },
  { month: ym(2001, 9), text: 'September 11 — markets close for four days' },
  { month: ym(2001, 12), text: 'Enron files the largest bankruptcy in US history' },
  { month: ym(2002, 7), text: "WorldCom's accounting fraud tops it" },
  { month: ym(2002, 10), text: 'NASDAQ bottoms 78 % below its peak' },
]

export const SCENARIO_1990: Scenario = {
  id: 'decade-trade-1990',
  name: '1990: The Decade Trade',
  startYear: 1990,
  rounds: 10,
  startingCash: 100_000,
  yearBonus: 10_000,
  handSize: 7,
  // §14.1 (selling rules): courtage + capital-gains tax only, no sell cap —
  // the simple option; a per-year sell cap stays playtest fodder
  courtage: { rate: 0.005, min: 100 },
  capitalGainsTax: 0.3,
  epilogueThrough: ym(2002, 12),
  instruments: INSTRUMENTS,
  series: rawSeries as Record<string, SampledData>,
  headlines: HEADLINES,
}
