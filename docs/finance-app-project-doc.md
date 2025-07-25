# Finance App Project Documentation

## Project Overview
A sophisticated financial planning and simulation application focused on calculating compound interest scenarios with the ability to model complex financial strategies across different time periods.

## Technical Architecture

### Site Hosting
GitHub Pages for simplicity and reliability:
- Zero cost for personal projects
- No traffic limits for typical personal usage
- Simple deployment via Git workflow
- Free HTTPS

### Core Framework
**Svelte/SvelteKit with TypeScript**
- Chosen for: minimal framework abstractions, excellent performance, good documentation for AI assistance, and well-suited for custom logic implementation
- Benefits:
  - Small bundle sizes
  - Less boilerplate code
  - Reactive by design
  - Strong TypeScript integration

### Key Characteristics
- **Client-side first approach** - All calculations and simulations will run in the browser initially
- **Minimal dependencies** - Custom financial modeling logic with AI assistance
- **Third-party libraries** - Primarily for rendering visualizations and framework lifecycle

### Computation Strategy
- Regular calculations handled in the main thread
- Heavy simulations offloaded to Web Workers
- Potential for WebAssembly for performance-critical sections

### Data Storage
- Client-side storage (IndexedDB/localStorage)
- No backend database initially
- Data import/export functionality for persistence

## Core Application Concepts

### Fragments
Self-contained financial scenarios that can be individually analyzed and visualized:

**Each fragment contains:**
- Its own analysis
- Visualization (graph/curve)
  - Future projections
  - Historical data (if available)
- Simulation capabilities

**Fragment Parameters:**
- **Amount - Start**: Initial principal
- **Amount - Period**: Regular contributions
  - Configurable periods (daily, weekly, monthly, etc.)
- **Expected return - Period**: Appreciation or depreciation rate
- **Special parameters for margin/leverage modeling**

**Example Fragment Types:**
1. **Appreciation Fragment**
   - $500 start value
   - $10 weekly savings
   - 10% yearly return

2. **Depreciation Fragment**
   - -1% yearly return (for modeling expenses, taxes, etc.)

3. **Imported Data Fragment**
   - Historical market data
   - Personal financial history

### Fragment Combinations
- Multiple fragments can be combined into named entities
- Example: "My private pension savings" = "My S&P500 savings" + "1% standard cost"
- Combined fragments inherit properties of their components

### Visualization Capabilities
- Multiple fragments can be displayed on the same graph
- Side-by-side comparison of different strategies
- Overlay projections on historical data

### Simulation Features
- Backtesting against historical data
- Monte Carlo simulations for risk assessment
- "What if" scenario modeling

## Key User Questions to Answer

The application aims to answer complex financial planning questions:

- "How much money will I have in X years?"
- "Which year will I achieve 'FIRE' (Financial Independence, Retire Early)?"
- "Would it be more efficient to take a loan against a part of my assets instead of selling now that I've started my pension?"
- "Out of how many periods would my strategy of saving in the S&P500 with a 10% portfolio loan instead of selling when running be profitable when running 100k simulations?"

## Implementation Roadmap

### Phase 1: Core Functionality
#### Implementation Steps

1. **Setup Project Foundation**
   - Configure Svelte/SvelteKit with TypeScript
   - Set up tailwind for consistent styling
   - Implement basic routing structure
   - Create project documentation

2. **Core Financial Models**
   - Implement basic compound interest calculation module
   - Create fragment data structure and interfaces
   - Set up simulation store with configurable parameters:
     - Initial amount
     - Monthly/periodic contributions
     - Annual return rate
     - Inflation adjustment
     - Time horizon (years)
     - Tax considerations

3. **User Interface Components**
   - Design and implement fragment creation form
   - Create parameter input components with validation
   - Develop basic results display component
   - Implement responsive layout for mobile and desktop

4. **Basic Visualization**
   - Integrate a charting library (Chart.js or D3.js)
   - Create line chart component for growth projection
   - Implement time-series visualization
   - Add interactive tooltips for data points

5. **Client-side Storage**
   - Implement local storage for saving fragments
   - Create import/export functionality for fragment data
   - Add persistence for user preferences

6. **Testing & Validation**
   - Write unit tests for financial calculations
   - Implement validation for user inputs
   - Create test scenarios to verify calculation accuracy

7. **Documentation & Help**
   - Create user guide for basic functionality
   - Add contextual help tooltips
   - Document financial formulas and assumptions

#### Deliverables
- Working fragment creation and visualization
- Ability to save and recall fragments
- Basic compound interest projections
- Simple data visualization
- Responsive design for different devices

#### Success Criteria
- Users can create and save a financial scenario
- Accurate calculation of compound interest over time
- Visual representation of financial growth
- Persistence of user data between sessions

### Phase 2: Advanced Features
- Fragment combination functionality
- Enhanced visualization options
- Data import capability
- Basic simulation features

### Phase 3: Simulation Expansion
- Monte Carlo simulation implementation
- Web Worker optimization
- Advanced scenario modeling
- Enhanced UI for complex comparisons

### Phase 4: Optimization & Expansion
- Performance improvements
- WebAssembly integration for complex calculations
- Additional financial models and strategies
- Optional: Server-side capabilities if needed

## Technical Considerations

### Performance Optimization
- Use memoization for repeated calculations
- Implement lazy loading for visualization components
- Adopt efficient data structures for financial calculations

### Data Import/Export
- CSV/Excel import functionality
- JSON export for saving configurations
- LocalStorage/IndexedDB for persistent storage

### Visualization Libraries
Consider libraries compatible with Svelte:
- D3.js for custom visualizations
- Chart.js for simpler implementations
- Plotly for interactive features

### Testing Strategy
- Unit tests for financial calculation logic
- Integration tests for fragment combinations
- Performance benchmarks for simulation functions

## Future Expansion Possibilities

### Optional Backend Integration
- User accounts for cloud storage
- Shared scenarios
- More extensive historical data

### Additional Financial Models
- Tax optimization strategies
- Real estate investment modeling
- Retirement withdrawal strategies
- Portfolio diversification models

### Enhanced Simulations
- Machine learning for trend prediction
- Expanded economic scenarios
- Stress testing financial models
