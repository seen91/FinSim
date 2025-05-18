# FinSim

A sophisticated financial planning and simulation application focused on calculating compound interest scenarios with the ability to model complex financial strategies across different time periods.

## About

FinSim enables users to create, analyze, and compare financial scenarios through a modular "fragment" system. Each fragment represents a distinct investment, expense, or financial strategy that can be individually analyzed or combined with others to model complex scenarios.

### Key Features

- **Financial Fragments**: Create self-contained financial scenarios with configurable parameters
- **Compound Interest Modeling**: Analyze the growth of investments over time with various contribution schedules
- **Fragment Combinations**: Combine multiple fragments to model complex financial strategies
- **Local Storage**: Save your financial scenarios in the browser for future sessions
- **Data Export/Import**: Save your work and share it across devices

## Technical Architecture

- **Client-side first approach**: All calculations and simulations run in the browser
- **Minimal dependencies**: Custom financial modeling logic
- **Persistence**: Client-side storage (localStorage) with import/export functionality

## Development

This project uses SvelteKit with Svelte 5 (runes enabled), TypeScript, and Tailwind CSS.

### Setup

```bash
# Install dependencies
npm install

# Start development server
npm run dev

# Build for production
npm run build

# Preview production build
npm run preview
```

### Testing

```bash
# Run Vitest unit tests
npm run test:unit

# Run Playwright e2e tests
npm run test:e2e
```

## Implementation Roadmap

### Phase 1: Core Functionality ✅
- Basic UI/UX design
- Single fragment creation and configuration
- Simple interest calculations
- Basic data persistence

### Phase 2: Advanced Features 🔄
- Fragment combination functionality
- Enhanced visualization options
- Data import capability
- Basic simulation features

### Phase 3: Simulation Expansion 🔜
- Monte Carlo simulation implementation
- Web Worker optimization
- Advanced scenario modeling
- Enhanced UI for complex comparisons

### Phase 4: Optimization & Expansion 🔜
- Performance improvements
- WebAssembly integration for complex calculations
- Additional financial models and strategies
