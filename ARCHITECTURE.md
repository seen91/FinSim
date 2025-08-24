# FinSim Architecture Documentation

## Project Structure

```
src/lib/
├── core/           # Core business logic
│   ├── types/      # Type definitions
│   ├── stores/     # State management
│   └── calculations/ # Business calculations
├── ui/             # User interface components
│   ├── components/ # Reusable UI components
│   └── game/       # Game-specific components
├── data/           # Data models and sample data
├── services/       # Utility functions and helpers
└── assets/         # Static assets
```

## Design Principles

### 1. **Domain-Driven Design**
- Core business logic separated from UI
- Clear boundaries between different concerns
- Types organized by domain (financial, game, deck)

### 2. **Single Responsibility**
- Each file has one clear purpose
- Small, focused components
- Utility functions extracted to services

## Component Architecture

### Core Components
- **GameApp**: Main application orchestrator
- **GameSidebar**: Deck and card selection
- **PlayArea**: Chart and game interaction area
- **CircularHand**: Card hand display with arc layout

### Reusable Components
- **Button**: Consistent button styling and behavior
- **CardMini**: Compact card display for lists
- **GameCard**: Full-size interactive card
- **Chart**: Financial projection visualization

## State Management

All game state is managed through Svelte stores in `core/stores/`:
- `gameState`: Current game state (hand, decks, active cards)
- `projections`: Derived calculations from active cards
- Action functions: `addCardToHand`, `toggleCard`, etc.

## Type Safety

Strong TypeScript typing throughout:
- `FinancialCard`: Individual financial instruments
- `Deck`: Collections of related cards
- `GameState`: Current application state
- Calculation types for projections and time series data
