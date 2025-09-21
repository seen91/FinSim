# FinSim - Unified Application Architecture

## 🎯 Single Application Overview

FinSim is now **a single, unified financial card game** based on mathematical curve theory. All financial instruments are mathematical functions f(t), treating finance like physics - decomposing complex signals into simple mathematical components.

## 📐 Core Mathematical Philosophy

**"All finance is curves f(x)"** - Like Fourier transforms:
- **Tax** = negative compound interest curves
- **Salary** = linear growth functions  
- **Investments** = positive compound growth curves
- **Inflation** = universal negative compound effect
- **Bonuses** = sinusoidal periodic functions
- **Assets** = depreciating curves with stacking mechanics

## 🏗️ Application Structure

### Routes
- **`/`** (Main Game) - Primary unified curve-based card game
- **`/demo`** - Mathematical curve exploration and testing
- **`/workshop`** - Future card creation interface (placeholder)

### Core Components

#### 🎮 Main Game (`GameApp.svelte`)
- **Purpose**: Primary interactive financial card game
- **Cards**: 8 unified curve-based cards showcasing different mathematical functions
- **Features**: Card stacking, projections, mathematical formula display
- **Data Source**: `allIndividualCards` (unified curve format)

#### 📊 Demo Route (`/demo`)
- **Purpose**: Mathematical curve exploration and validation
- **Component**: `UnifiedModelDemo.svelte`
- **Usage**: Testing mathematical functions, curve visualization
- **Status**: Complementary tool for curve validation

## 🔬 Mathematical Card Types

The main game includes 8 different mathematical curve types:

### Income Curves (Positive Linear)
- **Monthly Salary**: `f(t) = 468,000 * t` (linear growth)

### Expense Curves (Negative Linear)  
- **Living Expenses**: `f(t) = -180,000 * t` (negative linear)

### Investment Curves (Positive Compound)
- **ISK Account**: `f(t) = principal * (1 + 0.07)^t` (compound growth)

### Tax Curves (Negative Compound)
- **Income Tax**: `f(t) = -0.30 * base_income(t)` (negative compound on income)

### Effect Curves (Various Functions)
- **Swedish Inflation**: `f(t) = (0.98)^t` (universal value erosion)
- **Annual Bonus**: `f(t) = 30000 * sin(2π * t) + 30000` (sinusoidal)

### Asset Curves (Complex Multi-component)
- **Car Asset**: Constant baseline value with depreciation stacking
- **Car Depreciation**: Negative exponential reducing asset value

## 💻 Technical Architecture

### Data Layer
- **`unified-cards.ts`**: Mathematical curve definitions (primary)
- **`cards.ts`**: Legacy format (backward compatibility only)
- **`index.ts`**: Exports unified cards as `allIndividualCards`

### Calculation Engine
- **`unified-projection.ts`**: Single curve evaluation engine
- **`curve-model.ts`**: Core mathematical functions
- **Removed**: `card-projection.ts` (eliminated duplication)

### UI Components
- **Dual Format Support**: All components handle both unified and legacy cards
- **Mathematical Display**: Cards show curve types, parameters, and formulas
- **Enhanced Visualization**: `f(t) = linear`, rate parameters, frequency display

### Game Mechanics
- **Card Stacking**: Mathematical curve composition
- **Projections**: Time-series curve evaluation
- **Modal System**: Layered information display
- **Mathematical Formula Display**: Real mathematical notation

## 🎨 Visual Features

### Card Display Enhancements
- **Curve Type**: `f(t) = linear`, `f(t) = compound`
- **Parameters**: `r=7.0%`, `ω=1` (frequency)
- **Mathematical Formulas**: Real equations shown on cards
- **Color Coding**: Positive (green), negative (red), neutral (blue)

### Mathematical Notation
- **Monospace Font**: Mathematical expressions in Courier New
- **Purple Color**: `#a78bfa` for curve types
- **Amber Color**: `#fbbf24` for parameters
- **Italic Style**: Mathematical formulas in italics

## 🚀 Ready for Iteration

### Current Status
✅ **Single Unified Application**: No conflicting implementations  
✅ **Mathematical Foundation**: All cards are mathematical curves  
✅ **Game Mechanics**: Stacking, projections, modal system working  
✅ **UI Consistency**: Dual format support everywhere  
✅ **Build Success**: Compiles and runs without errors  
✅ **Committed**: All changes saved in git  

### Future Iteration Opportunities
1. **Enhanced Curve Visualization**: Real-time curve plotting
2. **More Mathematical Functions**: Logarithmic, power, exponential curves
3. **Advanced Stacking**: Tree structures where cards feed others
4. **Workshop Interface**: Visual curve creation tools
5. **Performance Analytics**: Mathematical optimization insights

## 🔄 Development Workflow

### To Continue Development:
```bash
npm run dev           # Start development server
npm run build         # Build for production  
npm run preview       # Preview production build
```

### Key Files for Future Changes:
- **`src/lib/data/unified-cards.ts`** - Add new mathematical cards
- **`src/lib/core/types/index.ts`** - Extend curve types
- **`src/lib/core/curve-model.ts`** - Add new mathematical functions
- **`src/lib/ui/game/GameApp.svelte`** - Main game interface

## 📊 Architecture Summary

**FinSim is now a single, cohesive financial card game** built on mathematical curve theory. The unified architecture eliminates redundancy while providing a solid foundation for continued iteration. All financial concepts are mathematical functions, creating an educational and interactive experience that demonstrates the mathematical nature of finance.

The application successfully merges the original card game concept with advanced mathematical modeling, creating a unique tool for financial education and exploration.