import { evaluate } from 'mathjs';

/**
 * Unified curve-based financial model
 * 
 * All financial instruments are mathematical functions f(t) where t is time.
 * This approach treats all cards as curves with different mathematical properties:
 * - Tax is just negative compound interest
 * - S&P 500 is positive compound growth
 * - Linear income is a straight line
 * - Exponential growth follows e^(rt)
 * - Custom formulas allow any mathematical expression
 * 
 * Like a Fourier transform, we can decompose complex financial situations
 * into simple mathematical components.
 */

export interface CurveParameters {
  // Core mathematical parameters - most curves only need 2-3 of these
  amplitude: number;      // A: Initial value/scale factor (replaces principal)
  rate: number;          // r: Growth/decay rate (annual as decimal, e.g. 0.07 = 7%)
  frequency: number;     // f: For periodic functions (monthly = 12, quarterly = 4)
  phase: number;         // φ: Phase shift (time offset)
  offset: number;        // b: Vertical offset (baseline value)
  
  // Special parameters for specific curve types
  exponent?: number;     // n: For power functions f(t) = A * t^n
  decay?: number;        // d: Decay constant for exponential decay
  
  // Custom formula for maximum flexibility
  formula?: string;      // Raw mathematical expression when pre-defined curves aren't sufficient
}

export interface CurveFunction {
  // The mathematical function type - this replaces the old 'type' field
  type: 'linear' | 'exponential' | 'compound' | 'power' | 'sinusoidal' | 'logarithmic' | 'custom';
  
  // Parameters for the curve
  parameters: CurveParameters;
  
  // Mathematical properties
  isPositive: boolean;   // Whether this curve adds value (income/assets) or subtracts (expenses/liabilities)
  isDifferentiable: boolean; // For advanced calculations (derivatives, integrals)
  domain: [number, number]; // [startTime, endTime] in years
}

/**
 * Unified Financial Card - all cards are now mathematical curves
 */
export interface UnifiedCard {
  id: string;
  name: string;
  description?: string;
  color: string;
  
  // The mathematical curve this card represents
  curve: CurveFunction;
  
  // Display and metadata
  detailedInfo?: {
    strategy: string;
    timeCommitment: string;
    mathematicalForm?: string; // Human-readable math description like "f(t) = 39000 * t"
  };
  
  // Interaction properties for stacking/tree structures (for future use)
  canBeStacked: boolean;
  canStackOnto: string[]; // IDs of cards this can stack onto
  stackingMultiplier?: number; // How this card affects what it stacks onto
}

/**
 * Mathematical curve evaluation function
 * Takes a curve function and evaluates it at time t
 */
export function evaluateCurve(curve: CurveFunction, t: number): number {
  const { type, parameters } = curve;
  const { amplitude, rate, frequency, phase, offset, exponent, decay, formula } = parameters;
  
  switch (type) {
    case 'linear':
      // f(t) = A + r*t (where A is initial value, r is rate of change)
      return amplitude + (rate * t);
      
    case 'compound':
      // f(t) = A * (1 + r)^t (classic compound interest)
      return amplitude * Math.pow(1 + rate, t);
      
    case 'exponential':
      // f(t) = A * e^(r*t) (natural exponential growth/decay)
      return amplitude * Math.exp(rate * t);
      
    case 'power':
      // f(t) = A * t^n
      const n = exponent || 1;
      return amplitude * Math.pow(t, n);
      
    case 'logarithmic':
      // f(t) = A * ln(t + phase) + offset
      return amplitude * Math.log(t + (phase || 1)) + offset;
      
    case 'sinusoidal':
      // f(t) = A * sin(2π * f * t + φ) + b (for periodic effects like bonuses)
      return amplitude * Math.sin(2 * Math.PI * frequency * t + phase) + offset;
      
    case 'custom':
      // f(t) = custom formula
      if (!formula) return 0;
      try {
        // Use mathjs for safe evaluation with common variables
        return evaluate(formula, { 
          t, 
          A: amplitude, 
          r: rate, 
          f: frequency, 
          phi: phase, 
          b: offset,
          e: Math.E,
          pi: Math.PI
        });
      } catch (error) {
        console.error('Formula evaluation error:', error);
        return 0;
      }
      
    default:
      return 0;
  }
}

/**
 * Curve composition for stacking - combines multiple curves mathematically
 * This will be useful for the tree structure you mentioned
 */
export function composeCurves(curves: CurveFunction[], t: number): number {
  return curves.reduce((sum, curve) => sum + evaluateCurve(curve, t), 0);
}

/**
 * Curve transformation for stacking effects
 * Applies mathematical transformations to curves (scaling, shifting, etc.)
 */
export function transformCurve(
  baseCurve: CurveFunction, 
  transformation: 'multiply' | 'add' | 'compose',
  factor: number
): CurveFunction {
  const newCurve = { ...baseCurve };
  
  switch (transformation) {
    case 'multiply':
      // Scale the amplitude
      newCurve.parameters = { 
        ...baseCurve.parameters, 
        amplitude: baseCurve.parameters.amplitude * factor 
      };
      break;
      
    case 'add':
      // Add to the offset
      newCurve.parameters = { 
        ...baseCurve.parameters, 
        offset: baseCurve.parameters.offset + factor 
      };
      break;
      
    case 'compose':
      // For function composition f(g(t)) - more advanced
      // This would require custom formula handling
      break;
  }
  
  return newCurve;
}