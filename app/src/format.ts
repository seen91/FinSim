const kr = new Intl.NumberFormat('sv-SE', { maximumFractionDigits: 0 })

export function formatKr(value: number): string {
  return `${kr.format(Math.round(value))} kr`
}

export function formatKrPerMonth(value: number): string {
  return `${kr.format(Math.round(value))} kr/mo`
}

export function formatPercent(value: number, decimals = 1): string {
  return `${(value * 100).toFixed(decimals).replace('.', ',')} %`
}
