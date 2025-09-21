<script lang="ts">
  import type { FinancialCard, CardStack, TimeSeriesPoint } from '$lib/core/types';
  import Button from './Button.svelte';
  import StackDisplay from './StackDisplay.svelte';
  import Chart from './Chart.svelte';
  import CardMiniDisplay from './CardMiniDisplay.svelte';
  import { formatCardTechnical, getCardParameters, getCardIcon, generateStackName } from '$lib/services';
  import { calculateStackProjection } from '$lib/core/calculations/stack-projection';
  import { writable, derived } from 'svelte/store';
  import { createEventDispatcher } from 'svelte';
  
  export let card: FinancialCard | null = null;
  export let stack: CardStack | null = null;
  export let isOpen = false;
  
  const dispatch = createEventDispatcher();
  
  // Working copy of card for live editing
  let editableCard: FinancialCard | null = null;
  
  // Initialize editable card when card changes
  $: if (card) {
    editableCard = JSON.parse(JSON.stringify(card)); // Deep clone
    
    // Ensure formula field is populated with current mathematical representation
    if (editableCard && editableCard.curve && !editableCard.curve.parameters.formula) {
      editableCard.curve.parameters.formula = formatCardTechnical(card);
    }
  }
  
  // Auto-save changes when parameters are modified
  $: if (editableCard && card) {
    // Dispatch update event when card parameters change
    dispatch('update', editableCard);
  }
  
  // State for collapsible Stack Contents section
  let stackContentsExpanded = false;
  
  // Create a writable store for the current stack projections
  const stackProjectionsStore = writable<TimeSeriesPoint[]>([]);
  
  // Update the store when stack changes
  $: if (stack) {
    stackProjectionsStore.set(calculateStackProjection(stack));
  } else {
    stackProjectionsStore.set([]);
  }
  
  function closeModal() {
    dispatch('close');
  }
  
  function toggleStackContents() {
    stackContentsExpanded = !stackContentsExpanded;
  }
  
  function handleCardInfo(event: CustomEvent) {
    // Dispatch event to parent to show the card info (will be handled by modal stack)
    dispatch('showCardInfo', event.detail);
  }
  
  function handleBackdropClick(event: MouseEvent) {
    if (event.target === event.currentTarget) {
      closeModal();
    }
  }
  
  function handleGlobalKeydown(event: KeyboardEvent) {
    if (event.key === 'Escape') {
      closeModal();
    }
  }

  // Helper functions to handle both unified and legacy card formats
  function getCardType(card: any): string {
    // For unified cards
    if (card.curve) {
      return card.curve.type;
    }
    // For legacy cards
    return card.type || 'linear';
  }
  
  function formatParameters(card: any): string {
    const params = [];
    
    // Handle unified card format
    if (card.curve) {
      const { parameters, type } = card.curve;
      if (parameters.offset) {
        params.push(`Initial: $${parameters.offset.toLocaleString()}`);
      }
      if (parameters.rate && parameters.rate !== 0) {
        params.push(`Rate: ${(parameters.rate * 100).toFixed(1)}%`);
      }
      if (parameters.amplitude && parameters.amplitude !== 0) {
        params.push(`Amount: $${parameters.amplitude.toLocaleString()}`);
      }
      return params.join(' • ');
    }
    
    // Handle legacy card format
    if (card.parameters.principal) {
      params.push(`Initial: $${card.parameters.principal.toLocaleString()}`);
    }
    if (card.parameters.rate) {
      params.push(`Rate: ${card.parameters.rate}%`);
    }
    if (card.parameters.monthlyAmount) {
      const monthly = card.parameters.monthlyAmount;
      params.push(`Monthly: ${monthly > 0 ? '+' : ''}$${Math.abs(monthly).toLocaleString()}`);
    }
    return params.join(' • ');
  }
</script>

<svelte:window on:keydown={handleGlobalKeydown} />

{#if isOpen && (card || stack)}
  <div 
    class="modal-backdrop" 
    on:click={handleBackdropClick}
    on:keydown
    role="dialog"
    aria-modal="true"
    tabindex="-1"
  >
    <div class="modal-content">
      <!-- Header -->
      <div class="modal-header">
        <div class="card-header-info">
          {#if card}
            <div class="card-icon" style="background: {card.color}20">
              <div class="card-icon-symbol">
                {getCardIcon(getCardType(card))}
              </div>
            </div>
            <div>
              <h2 class="card-title">{card.name}</h2>
              <p class="card-type">{getCardType(card).toUpperCase()}</p>
            </div>
          {:else if stack}
            <div class="card-icon" style="background: {stack.cards[0].color}20">
              <div class="card-icon-symbol">
                📚
              </div>
            </div>
            <div>
              <h2 class="card-title">{generateStackName(stack)}</h2>
              <p class="card-type">
                {stack.cards.length} CARDS • STACKED COMBINATION
              </p>
            </div>
          {/if}
        </div>
        <Button
          variant="secondary"
          size="medium"
          onClick={closeModal}
          ariaLabel="Close modal"
          class="close-btn"
        >✕</Button>
      </div>
      
      <!-- Content -->
      <div class="modal-body">
        {#if card}
          {#if card.detailedInfo}
            <!-- Strategy Description -->
            <section class="info-section">
              <h3>Strategy Overview</h3>
              <p class="strategy-description">{card.detailedInfo.strategy}</p>
            </section>
            
            <!-- Mathematical Function -->
            <section class="info-section">
              <h3>Function Definition</h3>
              <div class="metrics-grid">
                <div class="metric-item full-width">
                  <span class="metric-label">Mathematical Form</span>
                  {#if editableCard && editableCard.curve}
                    <textarea 
                      bind:value={editableCard.curve.parameters.formula}
                      class="function-input"
                      placeholder="Enter mathematical formula (e.g., A * (1 + r)^t + b)"
                      rows="2"
                    ></textarea>
                  {:else}
                    <span class="metric-value function-display">{formatCardTechnical(card)}</span>
                  {/if}
                </div>
                {#if (editableCard || card).curve}
                  <div class="metric-item">
                    <span class="metric-label">Function Type</span>
                    {#if editableCard}
                      <select bind:value={editableCard.curve.type} class="param-input">
                        <option value="linear">Linear</option>
                        <option value="compound">Compound</option>
                        <option value="exponential">Exponential</option>
                        <option value="sinusoidal">Sinusoidal</option>
                        <option value="logarithmic">Logarithmic</option>
                        <option value="power">Power</option>
                        <option value="custom">Custom</option>
                      </select>
                    {/if}
                  </div>
                  <div class="metric-item">
                    <span class="metric-label">Domain Start</span>
                    {#if editableCard}
                      <input 
                        type="number" 
                        bind:value={editableCard.curve.domain[0]} 
                        class="param-input"
                        min="2020" 
                        max="2100"
                      />
                    {/if}
                  </div>
                  <div class="metric-item">
                    <span class="metric-label">Domain End</span>
                    {#if editableCard}
                      <input 
                        type="number" 
                        bind:value={editableCard.curve.domain[1]} 
                        class="param-input"
                        min="2020" 
                        max="2100"
                      />
                    {/if}
                  </div>
                  <div class="metric-item full-width">
                    <span class="metric-label">Parameters</span>
                    {#if editableCard}
                      <div class="parameters-edit-grid">
                        <label>
                          Rate: 
                          <input 
                            type="number" 
                            bind:value={editableCard.curve.parameters.rate} 
                            step="0.001"
                            class="param-input"
                          />
                        </label>
                        <label>
                          Amplitude: 
                          <input 
                            type="number" 
                            bind:value={editableCard.curve.parameters.amplitude} 
                            step="1000"
                            class="param-input"
                          />
                        </label>
                        <label>
                          Frequency: 
                          <input 
                            type="number" 
                            bind:value={editableCard.curve.parameters.frequency} 
                            step="0.1"
                            class="param-input"
                          />
                        </label>
                        <label>
                          Phase: 
                          <input 
                            type="number" 
                            bind:value={editableCard.curve.parameters.phase} 
                            step="0.1"
                            class="param-input"
                          />
                        </label>
                        <label>
                          Offset: 
                          <input 
                            type="number" 
                            bind:value={editableCard.curve.parameters.offset} 
                            step="1000"
                            class="param-input"
                          />
                        </label>
                      </div>
                    {/if}
                  </div>
                {/if}
              </div>
            </section>
          {:else}
            <p class="no-details">No detailed information available for this card.</p>
          {/if}
        {:else if stack}
          <!-- Stack Information -->
          <section class="info-section">
            <h3>Stack Overview</h3>
            <p class="strategy-description">
              This stack combines multiple cards that work together to create a comprehensive 
              financial calculation. Cards are processed mathematically in the order they appear, 
              with each card's effects applied to the running total.
            </p>
            
            <!-- Mini Chart for Stack Projection -->
            <div class="stack-chart-container">
              <Chart data={$stackProjectionsStore} />
            </div>
          </section>
          
          <section class="info-section">
            <div class="section-header" on:click={toggleStackContents} on:keydown role="button" tabindex="0">
              <h3>Stack Contents</h3>
              <button class="expand-btn" title={stackContentsExpanded ? "Collapse stack contents" : "Expand stack contents"}>
                <span class="expand-icon">{stackContentsExpanded ? '▼' : '▶'}</span>
              </button>
            </div>
            
            {#if stackContentsExpanded}
              <!-- Show first two cards as Car Asset Value Stack (matching the deck structure) -->
              {#if stack.cards.length >= 2}
                <div class="deck-like-structure">
                  <StackDisplay 
                    stack={{
                      id: 'car-asset-stack',
                      cards: stack.cards.slice(0, 2)
                    }}
                    title="Car Asset Value Stack"
                    readonly={true}
                    on:cardInfo={handleCardInfo}
                  />
                  
                  <!-- Show remaining cards as individual cards -->
                  {#each stack.cards.slice(2) as card}
                    <div class="individual-card">
                      <CardMiniDisplay 
                        {card} 
                        showInfoButton={true}
                        on:info={handleCardInfo}
                      />
                    </div>
                  {/each}
                </div>
              {:else}
                <!-- Fallback for small stacks -->
                <StackDisplay 
                  {stack}
                  title="Stack Details"
                  readonly={true}
                  on:cardInfo={handleCardInfo}
                />
              {/if}
            {/if}
          </section>
          
          <section class="info-section">
            <h3>Combined Result</h3>
            <p class="strategy-description">
              The final calculation processes all {stack.cards.length} cards in order of appearance,
              applying each card's financial impact and effects to the running total from top to bottom.
            </p>
          </section>
        {/if}
      </div>
    </div>
  </div>
{/if}

<style>
  .modal-backdrop {
    position: fixed;
    top: 0;
    left: 0;
    width: 100%;
    height: 100%;
    background: rgba(0, 0, 0, 0.8);
    backdrop-filter: blur(4px);
    display: flex;
    align-items: center;
    justify-content: center;
    z-index: 1000;
    padding: 2rem;
    box-sizing: border-box;
  }
  
  .modal-content {
    background: linear-gradient(135deg, #1e1e2e, #2a2a3e);
    border-radius: 16px;
    border: 1px solid rgba(255, 255, 255, 0.1);
    max-width: 600px;
    width: 100%;
    max-height: 80vh;
    overflow-y: auto;
    box-shadow: 0 20px 60px rgba(0, 0, 0, 0.5);
    animation: modalSlideIn 0.3s ease-out;
  }
  
  @keyframes modalSlideIn {
    from {
      opacity: 0;
      transform: translateY(-20px) scale(0.95);
    }
    to {
      opacity: 1;
      transform: translateY(0) scale(1);
    }
  }
  
  .modal-header {
    display: flex;
    align-items: center;
    justify-content: space-between;
    padding: 1.5rem;
    border-bottom: 1px solid rgba(255, 255, 255, 0.1);
  }
  
  .card-header-info {
    display: flex;
    align-items: center;
    gap: 1rem;
  }
  
  .card-icon {
    width: 60px;
    height: 60px;
    border-radius: 12px;
    display: flex;
    align-items: center;
    justify-content: center;
    font-size: 1.5rem;
  }
  
  .card-title {
    margin: 0;
    color: white;
    font-size: 1.5rem;
    font-weight: 700;
  }
  
  .card-type {
    margin: 0.25rem 0 0 0;
    color: #888;
    font-size: 0.9rem;
    font-weight: 500;
    letter-spacing: 1px;
  }
  
  :global(.modal-header .close-btn) {
    width: 40px !important;
    height: 40px !important;
    border-radius: 50% !important;
    font-size: 1.25rem !important;
  }
  
  .modal-body {
    padding: 1.5rem;
    color: white;
  }
  
  .info-section {
    margin-bottom: 2rem;
  }
  
  .info-section h3 {
    margin: 0 0 1rem 0;
    color: white;
    font-size: 1.25rem;
    font-weight: 600;
  }
  
  .section-header {
    display: flex;
    justify-content: space-between;
    align-items: center;
    cursor: pointer;
    margin-bottom: 0.5rem;
  }
  
  .section-header:hover h3 {
    color: #e5e5e5;
  }
  
  .expand-btn {
    background: none;
    border: none;
    cursor: pointer;
    color: white;
    font-size: 1rem;
    padding: 0.25rem;
    display: flex;
    align-items: center;
    justify-content: center;
    transition: transform 0.2s ease, color 0.2s ease;
  }
  
  .expand-btn:hover {
    color: #e5e5e5;
    transform: scale(1.1);
  }
  
  .expand-icon {
    transition: transform 0.2s ease;
  }
  
  .strategy-description {
    color: #e5e5e5;
    line-height: 1.6;
    margin: 0;
  }
  
  .metrics-grid {
    display: grid;
    grid-template-columns: repeat(auto-fit, minmax(200px, 1fr));
    gap: 1rem;
  }
  
  .metric-item {
    display: flex;
    flex-direction: column;
    gap: 0.5rem;
    padding: 1rem;
    background: rgba(255, 255, 255, 0.05);
    border-radius: 8px;
    border: 1px solid rgba(255, 255, 255, 0.1);
  }
  
  .metric-label {
    font-size: 0.85rem;
    color: #888;
    font-weight: 500;
    text-transform: uppercase;
    letter-spacing: 0.5px;
  }
  
  .metric-value {
    color: white;
    font-weight: 600;
  }
  
  .no-details {
    text-align: center;
    color: #888;
    font-style: italic;
    padding: 2rem;
  }
  
  .full-width {
    grid-column: 1 / -1;
  }

  .parameters-edit-grid {
    display: grid;
    grid-template-columns: repeat(auto-fit, minmax(200px, 1fr));
    gap: 1rem;
    margin-top: 0.5rem;
  }

  .parameters-edit-grid label {
    display: flex;
    flex-direction: column;
    gap: 0.25rem;
    font-size: 0.9rem;
    color: #d1d5db;
  }

  .param-input {
    background: rgba(30, 30, 40, 0.8);
    border: 1px solid rgba(255, 255, 255, 0.2);
    border-radius: 4px;
    padding: 0.5rem;
    color: white;
    font-size: 0.9rem;
    transition: border-color 0.2s;
  }

  .param-input:focus {
    outline: none;
    border-color: #a78bfa;
    box-shadow: 0 0 0 2px rgba(167, 139, 250, 0.2);
  }

  .function-display {
    font-family: 'Courier New', monospace;
    font-size: 1.1rem;
    color: #a78bfa;
    font-weight: 600;
    background: rgba(167, 139, 250, 0.1);
    padding: 0.5rem;
    border-radius: 4px;
    border: 1px solid rgba(167, 139, 250, 0.2);
  }

  .function-input {
    font-family: 'Courier New', monospace;
    font-size: 1.1rem;
    color: #a78bfa;
    font-weight: 600;
    background: rgba(167, 139, 250, 0.1);
    border: 1px solid rgba(167, 139, 250, 0.3);
    border-radius: 4px;
    padding: 0.5rem;
    width: 100%;
    resize: vertical;
    min-height: 60px;
    transition: border-color 0.2s, box-shadow 0.2s;
  }

  .function-input:focus {
    outline: none;
    border-color: #a78bfa;
    box-shadow: 0 0 0 2px rgba(167, 139, 250, 0.2);
  }

  .function-input::placeholder {
    color: rgba(167, 139, 250, 0.5);
    font-style: italic;
  }
  
  .stack-chart-container {
    margin-top: 1rem;
    height: 200px;
    background: rgba(255, 255, 255, 0.03);
    border-radius: 8px;
    border: 1px solid rgba(255, 255, 255, 0.1);
    overflow: hidden;
  }
  
  .deck-like-structure {
    display: flex;
    flex-direction: column;
    gap: 0.5rem;
  }
  
  .individual-card {
    background: rgba(255, 255, 255, 0.02);
    border-radius: 6px;
    border: 1px solid rgba(255, 255, 255, 0.05);
  }
  
  @media (max-width: 640px) {
    .modal-backdrop {
      padding: 1rem;
    }
    
    .metrics-grid {
      grid-template-columns: 1fr;
    }
  }
</style>
