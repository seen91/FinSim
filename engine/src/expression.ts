/**
 * Sandboxed arithmetic expressions — the escape-hatch curve/modifier primitive.
 *
 * A tiny recursive-descent parser compiled to a closure. No eval, no Function,
 * no property access, no assignment: only numbers, named variables supplied by
 * the caller, arithmetic (+ - * / % ^), parentheses and a whitelist of pure
 * math functions. Unknown identifiers are a compile error, so a card's formula
 * can never reach outside the variables the engine hands it.
 */

export type ExprVars = Record<string, number>
export type CompiledExpr = (vars: ExprVars) => number

const FUNCTIONS: Record<string, (...args: number[]) => number> = {
  abs: Math.abs,
  floor: Math.floor,
  ceil: Math.ceil,
  round: Math.round,
  sqrt: Math.sqrt,
  exp: Math.exp,
  log: Math.log,
  sin: Math.sin,
  cos: Math.cos,
  min: (...a) => Math.min(...a),
  max: (...a) => Math.max(...a),
  pow: (x, y) => Math.pow(x!, y!),
  clamp: (x, lo, hi) => Math.min(Math.max(x!, lo!), hi!),
}

const CONSTANTS: Record<string, number> = { pi: Math.PI, e: Math.E }

type Token =
  | { kind: 'num'; value: number }
  | { kind: 'ident'; name: string }
  | { kind: 'op'; op: string }

function tokenize(src: string): Token[] {
  const tokens: Token[] = []
  let i = 0
  while (i < src.length) {
    const c = src[i]!
    if (c === ' ' || c === '\t' || c === '\n' || c === '\r') { i++; continue }
    if (c >= '0' && c <= '9' || c === '.') {
      const m = /^\d*\.?\d+(?:[eE][+-]?\d+)?/.exec(src.slice(i))
      if (!m) throw new Error(`Invalid number at position ${i} in "${src}"`)
      tokens.push({ kind: 'num', value: Number(m[0]) })
      i += m[0].length
      continue
    }
    if (/[a-zA-Z_]/.test(c)) {
      const m = /^[a-zA-Z_][a-zA-Z0-9_]*/.exec(src.slice(i))!
      tokens.push({ kind: 'ident', name: m[0] })
      i += m[0].length
      continue
    }
    if ('+-*/%^(),'.includes(c)) {
      tokens.push({ kind: 'op', op: c })
      i++
      continue
    }
    throw new Error(`Unexpected character "${c}" at position ${i} in "${src}"`)
  }
  return tokens
}

/**
 * Compiles an expression once; the returned closure evaluates it against a
 * set of variables. `allowedVars` fixes which variable names may appear —
 * referencing anything else fails at compile time.
 */
export function compileExpression(src: string, allowedVars: readonly string[]): CompiledExpr {
  const tokens = tokenize(src)
  let pos = 0

  const peek = (): Token | undefined => tokens[pos]
  const isOp = (op: string): boolean => {
    const t = tokens[pos]
    return t !== undefined && t.kind === 'op' && t.op === op
  }
  const expectOp = (op: string): void => {
    if (!isOp(op)) throw new Error(`Expected "${op}" at token ${pos} in "${src}"`)
    pos++
  }

  type Node = CompiledExpr

  // precedence climbing: additive > multiplicative > unary > power > primary
  function parseAdditive(): Node {
    let left = parseMultiplicative()
    while (isOp('+') || isOp('-')) {
      const op = (tokens[pos] as { op: string }).op
      pos++
      const right = parseMultiplicative()
      const l = left
      left = op === '+' ? (v) => l(v) + right(v) : (v) => l(v) - right(v)
    }
    return left
  }

  function parseMultiplicative(): Node {
    let left = parseUnary()
    while (isOp('*') || isOp('/') || isOp('%')) {
      const op = (tokens[pos] as { op: string }).op
      pos++
      const right = parseUnary()
      const l = left
      if (op === '*') left = (v) => l(v) * right(v)
      else if (op === '/') left = (v) => l(v) / right(v)
      else left = (v) => l(v) % right(v)
    }
    return left
  }

  function parseUnary(): Node {
    if (isOp('-')) { pos++; const inner = parseUnary(); return (v) => -inner(v) }
    if (isOp('+')) { pos++; return parseUnary() }
    return parsePower()
  }

  function parsePower(): Node {
    const base = parsePrimary()
    if (isOp('^')) {
      pos++
      const exp = parseUnary() // right-associative: 2^3^2 = 2^(3^2)
      return (v) => Math.pow(base(v), exp(v))
    }
    return base
  }

  function parsePrimary(): Node {
    const t = peek()
    if (t === undefined) throw new Error(`Unexpected end of expression in "${src}"`)
    if (t.kind === 'num') { pos++; const value = t.value; return () => value }
    if (t.kind === 'op' && t.op === '(') {
      pos++
      const inner = parseAdditive()
      expectOp(')')
      return inner
    }
    if (t.kind === 'ident') {
      pos++
      const name = t.name
      if (isOp('(')) {
        // Object.hasOwn: never resolve inherited members like "constructor"
        const fn = Object.hasOwn(FUNCTIONS, name) ? FUNCTIONS[name]! : undefined
        if (!fn) throw new Error(`Unknown function "${name}" in "${src}"`)
        pos++
        const args: Node[] = []
        if (!isOp(')')) {
          args.push(parseAdditive())
          while (isOp(',')) { pos++; args.push(parseAdditive()) }
        }
        expectOp(')')
        return (v) => fn(...args.map((a) => a(v)))
      }
      if (Object.hasOwn(CONSTANTS, name)) { const value = CONSTANTS[name]!; return () => value }
      if (!allowedVars.includes(name)) {
        throw new Error(`Unknown variable "${name}" in "${src}" (allowed: ${allowedVars.join(', ') || 'none'})`)
      }
      return (v) => {
        const value = v[name]
        if (value === undefined) throw new Error(`Variable "${name}" not supplied to expression "${src}"`)
        return value
      }
    }
    throw new Error(`Unexpected token at ${pos} in "${src}"`)
  }

  const root = parseAdditive()
  if (pos !== tokens.length) throw new Error(`Trailing input at token ${pos} in "${src}"`)
  return root
}
