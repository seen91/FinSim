import type { Stack, Stream } from '@finsim/engine'
import { formatKr, formatKrPerMonth, formatPercent } from './format'

/**
 * The back of a card: each editable parameter as a live slider (DESIGN.md §2,
 * "flip to edit"). An editor mutates a *fresh clone* of its stack — the app's
 * update cycle owns immutability and undo.
 */
export interface ParamEditor {
  key: string
  label: string
  min: number
  max: number
  step: number
  value: number
  format: (v: number) => string
  set: (stack: Stack, value: number) => void
}

export function stackEditors(stack: Stack): ParamEditor[] {
  const editors: ParamEditor[] = []
  const base = stack.base

  if (base.kind === 'source' && base.flow.type === 'constant') {
    editors.push({
      key: 'flow',
      label: base.flow.value < 0 ? 'Cost' : 'Amount',
      min: base.flow.value < 0 ? -60000 : 0,
      max: base.flow.value < 0 ? 0 : 150000,
      step: 500,
      value: base.flow.value,
      format: formatKrPerMonth,
      set: (s, v) => {
        if (s.base.kind === 'source' && s.base.flow.type === 'constant') s.base.flow.value = v
      },
    })
  }

  if (base.kind === 'asset' && !base.price) {
    editors.push({
      key: 'growth',
      label: 'Expected growth /yr',
      min: -0.2,
      max: 0.2,
      step: 0.0025,
      value: base.growth?.expected ?? 0,
      format: (v) => formatPercent(v),
      set: (s, v) => {
        if (s.base.kind === 'asset') s.base.growth = { ...s.base.growth, expected: v }
      },
    })
    if ((base.initialBalance ?? 0) > 0) {
      editors.push({
        key: 'initial',
        label: 'Initial value',
        min: 0,
        max: 2_000_000,
        step: 5000,
        value: base.initialBalance ?? 0,
        format: formatKr,
        set: (s, v) => {
          if (s.base.kind === 'asset') s.base.initialBalance = v
        },
      })
    }
  }

  if (base.kind === 'debt') {
    editors.push(
      {
        key: 'principal',
        label: 'Principal',
        min: 0,
        max: 2_000_000,
        step: 5000,
        value: base.principal,
        format: formatKr,
        set: (s, v) => {
          if (s.base.kind === 'debt') s.base.principal = v
        },
      },
      {
        key: 'interest',
        label: 'Interest /yr',
        min: 0,
        max: 0.15,
        step: 0.0025,
        value: base.interest.expected,
        format: (v) => formatPercent(v),
        set: (s, v) => {
          if (s.base.kind === 'debt') s.base.interest = { ...s.base.interest, expected: v }
        },
      },
    )
  }

  for (const [index, card] of (stack.modifiers ?? []).entries()) {
    const m = card.modifier
    const label = card.name ?? card.id
    if (m.type === 'taxRate') {
      editors.push({
        key: `mod${index}`,
        label,
        min: 0,
        max: 0.6,
        step: 0.005,
        value: m.rate,
        format: (v) => formatPercent(v),
        set: (s, v) => {
          const mod = s.modifiers?.[index]?.modifier
          if (mod?.type === 'taxRate') mod.rate = v
        },
      })
    } else if (m.type === 'annualRaise') {
      editors.push({
        key: `mod${index}`,
        label: `${label} /yr`,
        min: 0,
        max: 0.1,
        step: 0.0025,
        value: m.rate,
        format: (v) => formatPercent(v),
        set: (s, v) => {
          const mod = s.modifiers?.[index]?.modifier
          if (mod?.type === 'annualRaise') mod.rate = v
        },
      })
    } else if (m.type === 'annualFee') {
      editors.push({
        key: `mod${index}`,
        label: `${label} /yr`,
        min: 0,
        max: 0.02,
        step: 0.0005,
        value: m.rate,
        format: (v) => formatPercent(v, 2),
        set: (s, v) => {
          const mod = s.modifiers?.[index]?.modifier
          if (mod?.type === 'annualFee') mod.rate = v
        },
      })
    }
  }

  return editors
}

export interface StreamEditor {
  min: number
  max: number
  step: number
  value: number
  format: (v: number) => string
  set: (stream: Stream, value: number) => void
}

export function streamEditor(stream: Stream): StreamEditor {
  if (stream.rule.type === 'percent') {
    return {
      min: 0,
      max: 1,
      step: 0.01,
      value: stream.rule.percent,
      format: (v) => `${formatPercent(v, 0)} of remaining`,
      set: (s, v) => {
        if (s.rule.type === 'percent') s.rule.percent = v
      },
    }
  }
  return {
    min: 0,
    max: 30000,
    step: 100,
    value: stream.rule.amountPerMonth,
    format: formatKrPerMonth,
    set: (s, v) => {
      if (s.rule.type === 'fixed') s.rule.amountPerMonth = v
    },
  }
}
