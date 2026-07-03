import type { Card } from '@finsim/engine'
import { formatKr, formatKrPerMonth, formatPercent } from './format'

/**
 * The back of a card: each editable parameter as a live slider (DESIGN.md §2,
 * "flip to edit"). An editor mutates a *fresh clone* of its card — the app's
 * update cycle owns immutability and undo. Every card is self-contained:
 * a salary's raise, an asset's fee and deposit, a debt's payment all live
 * here, not in separate panels.
 */
export interface ParamEditor {
  key: string
  label: string
  min: number
  max: number
  step: number
  value: number
  format: (v: number) => string
  set: (card: Card, value: number) => void
}

export function cardEditors(card: Card): ParamEditor[] {
  const editors: ParamEditor[] = []

  if (card.kind === 'source') {
    const flow = card.flow
    if (flow.type === 'constant' || flow.type === 'compound') {
      editors.push({
        key: 'amount',
        label: 'Amount',
        min: 0,
        max: 150000,
        step: 500,
        value: flow.type === 'constant' ? flow.value : flow.base,
        format: formatKrPerMonth,
        set: (c, v) => {
          if (c.kind !== 'source') return
          if (c.flow.type === 'constant') c.flow.value = v
          else if (c.flow.type === 'compound') c.flow.base = v
        },
      })
    }
    if (flow.type === 'compound') {
      editors.push({
        key: 'raise',
        label: 'Raise /yr',
        min: 0,
        max: 0.1,
        step: 0.0025,
        value: flow.annualRate.expected,
        format: (v) => formatPercent(v),
        set: (c, v) => {
          if (c.kind === 'source' && c.flow.type === 'compound') c.flow.annualRate = { ...c.flow.annualRate, expected: v }
        },
      })
    }
  }

  if (card.kind === 'drain') {
    if (card.percent !== undefined) {
      editors.push({
        key: 'percent',
        label: 'Share of subtotal',
        min: 0,
        max: 0.6,
        step: 0.005,
        value: card.percent,
        format: (v) => formatPercent(v),
        set: (c, v) => {
          if (c.kind === 'drain') c.percent = v
        },
      })
    } else if (card.amount?.type === 'constant') {
      editors.push({
        key: 'amount',
        label: 'Cost',
        min: 0,
        max: 60000,
        step: 250,
        value: card.amount.value,
        format: formatKrPerMonth,
        set: (c, v) => {
          if (c.kind === 'drain' && c.amount?.type === 'constant') c.amount.value = v
        },
      })
    }
  }

  if (card.kind === 'asset') {
    if (!card.price) {
      editors.push({
        key: 'growth',
        label: 'Expected growth /yr',
        min: -0.2,
        max: 0.2,
        step: 0.0025,
        value: card.growth?.expected ?? 0,
        format: (v) => formatPercent(v),
        set: (c, v) => {
          if (c.kind === 'asset') c.growth = { ...c.growth, expected: v }
        },
      })
      editors.push({
        key: 'fee',
        label: 'Fee /yr',
        min: 0,
        max: 0.02,
        step: 0.0005,
        value: card.fee ?? 0,
        format: (v) => formatPercent(v, 2),
        set: (c, v) => {
          if (c.kind === 'asset') c.fee = v
        },
      })
    }
    if ((card.initialBalance ?? 0) > 0) {
      editors.push({
        key: 'initial',
        label: 'Initial value',
        min: 0,
        max: 6_000_000,
        step: 10000,
        value: card.initialBalance ?? 0,
        format: formatKr,
        set: (c, v) => {
          if (c.kind === 'asset') c.initialBalance = v
        },
      })
    }
    if (card.take) {
      editors.push(
        card.take.type === 'percent'
          ? {
              key: 'take',
              label: 'Takes, % of subtotal',
              min: 0,
              max: 1,
              step: 0.01,
              value: card.take.percent,
              format: (v) => formatPercent(v, 0),
              set: (c, v) => {
                if (c.kind === 'asset' && c.take?.type === 'percent') c.take.percent = v
              },
            }
          : {
              key: 'take',
              label: 'Deposit /mo',
              min: 0,
              max: 30000,
              step: 100,
              value: card.take.amountPerMonth,
              format: formatKrPerMonth,
              set: (c, v) => {
                if (c.kind === 'asset' && c.take?.type === 'fixed') c.take.amountPerMonth = v
              },
            },
      )
    }
  }

  if (card.kind === 'debt') {
    editors.push(
      {
        key: 'principal',
        label: 'Principal',
        min: 0,
        max: 6_000_000,
        step: 10000,
        value: card.principal,
        format: formatKr,
        set: (c, v) => {
          if (c.kind === 'debt') c.principal = v
        },
      },
      {
        key: 'interest',
        label: 'Interest /yr',
        min: 0,
        max: 0.15,
        step: 0.0025,
        value: card.interest.expected,
        format: (v) => formatPercent(v),
        set: (c, v) => {
          if (c.kind === 'debt') c.interest = { ...c.interest, expected: v }
        },
      },
    )
    if (card.payment) {
      editors.push(
        card.payment.type === 'fixed'
          ? {
              key: 'payment',
              label: 'Payment /mo',
              min: 0,
              max: 30000,
              step: 100,
              value: card.payment.amountPerMonth,
              format: formatKrPerMonth,
              set: (c, v) => {
                if (c.kind === 'debt' && c.payment?.type === 'fixed') c.payment.amountPerMonth = v
              },
            }
          : {
              key: 'payment',
              label: 'Payment, % of subtotal',
              min: 0,
              max: 1,
              step: 0.01,
              value: card.payment.percent,
              format: (v) => formatPercent(v, 0),
              set: (c, v) => {
                if (c.kind === 'debt' && c.payment?.type === 'percent') c.payment.percent = v
              },
            },
      )
    }
  }

  return editors
}
