# FinSim - Financial Card Game Architecture

## 🎯 Overview

FinSim is a mathematical financial card game where all financial instruments are represented as mathematical functions f(t). Users can create unlimited cards and decks to model complete household financial situations.

## 📐 Core Philosophy

**"All finance is curves f(x)"** - Like Fourier transforms, complex financial situations can be decomposed into simple mathematical components:
- **Tax** = negative compound interest curves
- **Salary** = linear growth functions  
- **Investments** = positive compound growth curves
- **Inflation** = universal negative compound effect
- **Bonuses** = sinusoidal periodic functions
- **Assets** = depreciating curves with stacking mechanics

## � Card Game Mechanics

### Card Creation
- Users can create unlimited custom cards representing any financial instrument
- Each card is a mathematical function with editable parameters
- Cards display simplified values (green for income, red for expenses)

### Deck Building  
- Cards can be combined into decks representing complete financial scenarios
- Supports household-level complexity (multiple income streams, investments, debts, assets)

### Card Stacking
- Cards can be stacked for mathematical composition
- Example: Salary card → Tax card → Net income result
- Enables complex financial relationships and dependencies

## 🔬 Mathematical Curve Types

Cards can represent various mathematical functions:

- **Linear**: `f(t) = A + r*t` (salary, fixed expenses)
- **Compound**: `f(t) = A * (1 + r)^t` (investments, loans)  
- **Exponential**: `f(t) = A * e^(r*t)` (rapid growth/decay)
- **Sinusoidal**: `f(t) = A * sin(2π*f*t + φ) + b` (periodic bonuses)
- **Custom**: Any mathematical formula for complex scenarios

## 💻 Technical Foundation

### Data Layer
- **`unified-cards.ts`**: Mathematical curve definitions
- **`curve-model.ts`**: Core mathematical functions
- **Extensible**: Easy to add new curve types and cards

### Game Interface
- **Card Display**: Shows simplified financial values with color coding
- **Detail Modal**: Full mathematical formula editing and parameter control
- **Projections**: Time-series visualization of financial scenarios