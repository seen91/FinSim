<script lang="ts">
  import { onMount } from 'svelte';
  import { allUnifiedCards } from '../../data';
  import { allCards } from '../../data/cards';
  import { calculateLegacyCardProjection } from '../../core/calculations';
  import { calculateCardProjection as calculateUnifiedProjection } from '../../core/calculations/unified-projection';
  import { legacyToUnified } from '../../core/types';
  import Chart from './Chart.svelte';
  import type { TimeSeriesPoint, UnifiedCard } from '../../core/types';

  let legacyResults: TimeSeriesPoint[] = [];
  let unifiedResults: TimeSeriesPoint[] = [];
  let conversionResults: TimeSeriesPoint[] = [];
  let selectedCard: any = null;

  onMount(() => {
    // Test 1: Calculate legacy salary card projection
    const legacySalary = allCards.find(card => card.id === 'monthly-salary');
    if (legacySalary) {
      legacyResults = calculateLegacyCardProjection(legacySalary);
      selectedCard = legacySalary;
    }
    
    // Test 2: Calculate unified salary card projection  
    const unifiedSalary = allUnifiedCards.find(card => card.id === 'monthly-salary');
    if (unifiedSalary) {
      unifiedResults = calculateUnifiedProjection(unifiedSalary);
    }
    
    // Test 3: Convert legacy to unified and calculate
    if (legacySalary) {
      const convertedSalary = legacyToUnified(legacySalary);
      conversionResults = calculateUnifiedProjection(convertedSalary);
    }
  });

  function selectCard(card: any) {
    selectedCard = card;
  }

  // Format curve parameters for display
  function formatCurveParameters(card: UnifiedCard) {
    const params = card.curve.parameters;
    return {
      type: card.curve.type,
      amplitude: params.amplitude,
      rate: params.rate,
      frequency: params.frequency,
      offset: params.offset,
      isPositive: card.curve.isPositive,
      mathematicalForm: card.detailedInfo?.mathematicalForm || 'Not specified'
    };
  }

  // Get a sample of different curve types for demonstration
  const demonstrationCards = [
    allUnifiedCards.find(c => c.id === 'monthly-salary'),      // Linear
    allUnifiedCards.find(c => c.id === 'isk-account'),         // Compound  
    allUnifiedCards.find(c => c.id === 'annual-bonus'),        // Sinusoidal
    allUnifiedCards.find(c => c.id === 'car-depreciation'),    // Negative compound
    allUnifiedCards.find(c => c.id === 'inflation-sweden')     // Negative compound
  ].filter(Boolean) as UnifiedCard[];
</script>

<div class="unified-model-demo">
  <h1>🧮 Unified Curve-Based Financial Model Demo</h1>
  
  <div class="philosophy-explanation">
    <h2>Philosophy: All Finance is Physics</h2>
    <p>
      Just like in physics where everything can be expressed as mathematical functions, 
      all financial instruments are curves f(t) over time:
    </p>
    <ul>
      <li><strong>Tax:</strong> Negative compound interest → f(t) = A × (1-r)ᵗ</li>
      <li><strong>S&P 500:</strong> Positive compound growth → f(t) = A × (1+r)ᵗ</li>
      <li><strong>Salary:</strong> Linear growth → f(t) = A + rt</li>
      <li><strong>Depreciation:</strong> Exponential decay → f(t) = A × e⁻ʳᵗ</li>
    </ul>
    <p>
      Like Fourier transforms, we can decompose complex financial situations into simple mathematical components.
    </p>
  </div>

  <div class="demo-sections">
    <!-- Curve Types Demonstration -->
    <section class="curve-types">
      <h2>Mathematical Curve Types</h2>
      <div class="cards-grid">
        {#each demonstrationCards as card}
          <button class="curve-card" on:click={() => selectCard(card)}>
            <div class="card-header" style="background-color: {card.color}">
              <h3>{card.name}</h3>
              <div class="curve-type">{card.curve.type}</div>
            </div>
            <div class="card-content">
              <div class="mathematical-form">
                {card.detailedInfo?.mathematicalForm || 'f(t) = mathematical function'}
              </div>
              <div class="curve-properties">
                <span class="polarity {card.curve.isPositive ? 'positive' : 'negative'}">
                  {card.curve.isPositive ? '+' : '-'} Value
                </span>
                <span class="differentiable">
                  {card.curve.isDifferentiable ? 'Differentiable' : 'Non-differentiable'}
                </span>
              </div>
            </div>
          </button>
        {/each}
      </div>
    </section>

    <!-- Validation Section -->
    <section class="validation">
      <h2>System Validation</h2>
      <div class="validation-tests">
        <div class="test-result">
          <h3>Legacy Calculation</h3>
          <p>Points: {legacyResults.length}</p>
          <p>Total Value: {legacyResults.reduce((sum, p) => sum + p.value, 0).toLocaleString()}</p>
        </div>
        
        <div class="test-result">
          <h3>Unified Calculation</h3>
          <p>Points: {unifiedResults.length}</p>
          <p>Total Value: {unifiedResults.reduce((sum, p) => sum + p.value, 0).toLocaleString()}</p>
        </div>
        
        <div class="test-result">
          <h3>Converted Legacy → Unified</h3>
          <p>Points: {conversionResults.length}</p>
          <p>Total Value: {conversionResults.reduce((sum, p) => sum + p.value, 0).toLocaleString()}</p>
        </div>
      </div>
    </section>

    <!-- Selected Card Details -->
    {#if selectedCard}
      <section class="card-details">
        <h2>Card Analysis: {selectedCard.name}</h2>
        
        {#if selectedCard.curve}
          <!-- Unified Card -->
          {@const params = formatCurveParameters(selectedCard)}
          <div class="analysis">
            <div class="parameters">
              <h4>Mathematical Parameters</h4>
              <ul>
                <li><strong>Type:</strong> {params.type}</li>
                <li><strong>Amplitude (A):</strong> {params.amplitude}</li>
                <li><strong>Rate (r):</strong> {(params.rate * 100).toFixed(2)}%</li>
                <li><strong>Frequency (f):</strong> {params.frequency}</li>
                <li><strong>Offset (b):</strong> {params.offset}</li>
              </ul>
            </div>
            
            <div class="mathematical-description">
              <h4>Mathematical Form</h4>
              <code class="formula">{params.mathematicalForm}</code>
            </div>
          </div>
        {:else}
          <!-- Legacy Card -->
          <div class="legacy-analysis">
            <h4>Legacy Parameters</h4>
            <ul>
              <li><strong>Type:</strong> {selectedCard.type}</li>
              <li><strong>Principal:</strong> {selectedCard.parameters.principal || 0}</li>
              <li><strong>Rate:</strong> {selectedCard.parameters.rate || 0}%</li>
              <li><strong>Monthly Amount:</strong> {selectedCard.parameters.monthlyAmount || 0}</li>
            </ul>
          </div>
        {/if}
      </section>
    {/if}

    <!-- Chart Visualization -->
    {#if unifiedResults.length > 0}
      <section class="visualization">
        <h2>Curve Visualization</h2>
        <div class="chart-container">
          <Chart data={unifiedResults} />
        </div>
      </section>
    {/if}
  </div>
</div>

<style>
  .unified-model-demo {
    max-width: 1200px;
    margin: 0 auto;
    padding: 2rem;
    font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
  }

  h1 {
    text-align: center;
    color: #1e293b;
    margin-bottom: 2rem;
  }

  .philosophy-explanation {
    background: linear-gradient(135deg, #f8fafc 0%, #e2e8f0 100%);
    padding: 2rem;
    border-radius: 1rem;
    margin-bottom: 2rem;
  }

  .philosophy-explanation h2 {
    color: #0f172a;
    margin-bottom: 1rem;
  }

  .philosophy-explanation ul {
    margin: 1rem 0;
    padding-left: 2rem;
  }

  .philosophy-explanation li {
    margin: 0.5rem 0;
    color: #475569;
  }

  .demo-sections {
    display: flex;
    flex-direction: column;
    gap: 2rem;
  }

  .curve-types {
    background: #ffffff;
    padding: 2rem;
    border-radius: 1rem;
    box-shadow: 0 4px 6px -1px rgb(0 0 0 / 0.1);
  }

  .cards-grid {
    display: grid;
    grid-template-columns: repeat(auto-fit, minmax(280px, 1fr));
    gap: 1rem;
    margin-top: 1rem;
  }

  .curve-card {
    border: 2px solid #e2e8f0;
    border-radius: 0.75rem;
    overflow: hidden;
    cursor: pointer;
    transition: transform 0.2s, box-shadow 0.2s;
    background: none;
    padding: 0;
    width: 100%;
    text-align: left;
  }

  .curve-card:hover {
    transform: translateY(-2px);
    box-shadow: 0 8px 25px -1px rgb(0 0 0 / 0.15);
  }

  .card-header {
    color: white;
    padding: 1rem;
    text-align: center;
  }

  .card-header h3 {
    margin: 0 0 0.5rem 0;
    font-size: 1rem;
    font-weight: 600;
  }

  .curve-type {
    font-size: 0.75rem;
    opacity: 0.9;
    text-transform: uppercase;
    letter-spacing: 0.05em;
  }

  .card-content {
    padding: 1rem;
  }

  .mathematical-form {
    font-family: 'Monaco', 'Menlo', monospace;
    font-size: 0.875rem;
    background: #f1f5f9;
    padding: 0.75rem;
    border-radius: 0.5rem;
    margin-bottom: 1rem;
    color: #334155;
  }

  .curve-properties {
    display: flex;
    gap: 0.5rem;
    flex-wrap: wrap;
  }

  .curve-properties span {
    font-size: 0.75rem;
    padding: 0.25rem 0.5rem;
    border-radius: 0.375rem;
    font-weight: 500;
  }

  .polarity.positive {
    background: #dcfce7;
    color: #15803d;
  }

  .polarity.negative {
    background: #fee2e2;
    color: #dc2626;
  }

  .differentiable {
    background: #e0e7ff;
    color: #3730a3;
  }

  .validation {
    background: #ffffff;
    padding: 2rem;
    border-radius: 1rem;
    box-shadow: 0 4px 6px -1px rgb(0 0 0 / 0.1);
  }

  .validation-tests {
    display: grid;
    grid-template-columns: repeat(auto-fit, minmax(200px, 1fr));
    gap: 1rem;
    margin-top: 1rem;
  }

  .test-result {
    padding: 1rem;
    border: 1px solid #e2e8f0;
    border-radius: 0.5rem;
    background: #fafafa;
  }

  .test-result h3 {
    margin: 0 0 1rem 0;
    color: #1e293b;
    font-size: 1rem;
  }

  .test-result p {
    margin: 0.25rem 0;
    color: #475569;
    font-size: 0.875rem;
  }

  .card-details {
    background: #ffffff;
    padding: 2rem;
    border-radius: 1rem;
    box-shadow: 0 4px 6px -1px rgb(0 0 0 / 0.1);
  }

  .analysis {
    display: grid;
    grid-template-columns: 1fr 1fr;
    gap: 2rem;
    margin-top: 1rem;
  }

  .parameters ul, .legacy-analysis ul {
    list-style: none;
    padding: 0;
    margin: 1rem 0;
  }

  .parameters li, .legacy-analysis li {
    padding: 0.5rem 0;
    border-bottom: 1px solid #e2e8f0;
  }

  .formula {
    display: block;
    background: #1e293b;
    color: #f1f5f9;
    padding: 1rem;
    border-radius: 0.5rem;
    font-family: 'Monaco', 'Menlo', monospace;
    font-size: 0.875rem;
    margin-top: 1rem;
    overflow-x: auto;
  }

  .visualization {
    background: #ffffff;
    padding: 2rem;
    border-radius: 1rem;
    box-shadow: 0 4px 6px -1px rgb(0 0 0 / 0.1);
  }

  .chart-container {
    margin-top: 1rem;
    height: 400px;
  }

  @media (max-width: 768px) {
    .unified-model-demo {
      padding: 1rem;
    }
    
    .analysis {
      grid-template-columns: 1fr;
    }
    
    .cards-grid {
      grid-template-columns: 1fr;
    }
  }
</style>