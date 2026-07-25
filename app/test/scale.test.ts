import { describe, expect, it } from 'vitest'
import { negativeRuns } from '../src/scale'

describe('negativeRuns: the debt stretches the chart draws the cash line over', () => {
  it('finds each contiguous below-zero stretch as an inclusive range', () => {
    expect(negativeRuns([5, -1, -2, 3, -4, 6])).toEqual([
      { from: 1, to: 2 },
      { from: 4, to: 4 },
    ])
  })

  it('a solvent series has none — the chart stays the single line', () => {
    expect(negativeRuns([0, 1, 2])).toEqual([])
    expect(negativeRuns([])).toEqual([])
  })

  it('zero is solvent, not debt', () => {
    expect(negativeRuns([0, -1, 0, -1])).toEqual([
      { from: 1, to: 1 },
      { from: 3, to: 3 },
    ])
  })

  it('debt at the edges is still a run', () => {
    expect(negativeRuns([-1, 1, -1])).toEqual([
      { from: 0, to: 0 },
      { from: 2, to: 2 },
    ])
  })
})
