import { describe, expect, it } from 'vitest'
import { compileExpression } from '../src/index.js'

const evalExpr = (src: string, vars: Record<string, number> = {}): number =>
  compileExpression(src, Object.keys(vars))(vars)

describe('expression parser', () => {
  it('handles arithmetic with standard precedence', () => {
    expect(evalExpr('1 + 2 * 3')).toBe(7)
    expect(evalExpr('(1 + 2) * 3')).toBe(9)
    expect(evalExpr('10 - 4 - 3')).toBe(3) // left-assoc
    expect(evalExpr('12 / 4 / 3')).toBe(1)
    expect(evalExpr('10 % 3')).toBe(1)
  })

  it('power is right-associative and binds tighter than unary minus', () => {
    expect(evalExpr('2 ^ 3 ^ 2')).toBe(512)
    expect(evalExpr('-2 ^ 2')).toBe(-4)
    expect(evalExpr('(-2) ^ 2')).toBe(4)
  })

  it('supports unary signs and scientific notation', () => {
    expect(evalExpr('-5 + +3')).toBe(-2)
    expect(evalExpr('1.5e2')).toBe(150)
    expect(evalExpr('.5 * 4')).toBe(2)
  })

  it('supports variables and constants', () => {
    expect(evalExpr('t * 100', { t: 12 })).toBe(1200)
    expect(evalExpr('f * (1 - 0.3)', { f: 1000 })).toBeCloseTo(700, 10)
    expect(evalExpr('cos(2 * pi)')).toBeCloseTo(1, 12)
  })

  it('supports whitelisted functions', () => {
    expect(evalExpr('min(3, 1, 2)')).toBe(1)
    expect(evalExpr('max(3, 1, 2)')).toBe(3)
    expect(evalExpr('abs(-4)')).toBe(4)
    expect(evalExpr('floor(2.9)')).toBe(2)
    expect(evalExpr('clamp(15, 0, 10)')).toBe(10)
    expect(evalExpr('pow(1.07, 1/12)')).toBeCloseTo(Math.pow(1.07, 1 / 12), 12)
  })

  it('a realistic card formula: salary with a cap', () => {
    const expr = compileExpression('min(45000 * 1.03 ^ floor(t / 12), 60000)', ['t'])
    expect(expr({ t: 0 })).toBe(45000)
    expect(expr({ t: 12 })).toBeCloseTo(46350, 8)
    expect(expr({ t: 240 })).toBe(60000)
  })

  it('rejects unknown variables, functions and malformed input at compile time', () => {
    expect(() => compileExpression('salary * 2', ['t'])).toThrow(/Unknown variable "salary"/)
    expect(() => compileExpression('hack(1)', ['t'])).toThrow(/Unknown function/)
    expect(() => compileExpression('1 + ', ['t'])).toThrow()
    expect(() => compileExpression('1 2', ['t'])).toThrow(/Trailing/)
    expect(() => compileExpression('t..1', ['t'])).toThrow()
  })

  it('cannot reach outside the sandbox', () => {
    expect(() => compileExpression('constructor', [])).toThrow(/Unknown variable/)
    expect(() => compileExpression('globalThis', [])).toThrow(/Unknown variable/)
    expect(() => compileExpression('t["a"]', ['t'])).toThrow()
  })
})
