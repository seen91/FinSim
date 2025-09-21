<script lang="ts">
  import type { FinancialCard, CardStack, TimeSeriesPoint } from '$lib/core/types';
  import Button from './Button.svelte';
  import StackDisplay from './StackDisplay.svelte';
  import Chart from './Chart.svelte';
  import CardMiniDisplay from './CardMiniDisplay.svelte';
  import { formatCardValue, getCardIcon, generateStackName } from '$lib/services';
  import { calculateStackProjection } from '$lib/core/calculations/stack-projection';
  import { writable, derived } from 'svelte/store';
  import { createEventDispatcher } from 'svelte';
  
  export let card: FinancialCard | null = null;
  export let stack: CardStack | null = null;
  export let isOpen = false;
  
  const dispatch = createEventDispatcher();
  
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
  
  function formatParameters(card: FinancialCard): string {
    const params = [];
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
                {getCardIcon(card.type)}
              </div>
            </div>
            <div>
              <h2 class="card-title">{card.name}</h2>
              <p class="card-type">{card.type.toUpperCase()}</p>
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
            
            <!-- Key Metrics -->
            <section class="info-section">
              <h3>Key Metrics</h3>
              <div class="metrics-grid">
                <div class="metric-item">
                  <span class="metric-label">Time Commitment</span>
                  <span class="metric-value">{card.detailedInfo.timeCommitment}</span>
                </div>
                <div class="metric-item">
                  <span class="metric-label">Parameters</span>
                  <span class="metric-value">{formatParameters(card)}</span>
                </div>
                {#if card.stackEffects && card.stackEffects.length > 0}
                  <div class="metric-item full-width">
                    <span class="metric-label">Stack Effects</span>
                    <div class="effects-list">
                      {#each card.stackEffects as effect}
                        <span class="effect-item">{effect.description}</span>
                      {/each}
                    </div>
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
                        showAddButton={false}
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
  
  .effects-list {
    display: flex;
    flex-wrap: wrap;
    gap: 0.5rem;
  }
  
  .effect-item {
    background: rgba(74, 222, 128, 0.2);
    color: #4ade80;
    padding: 0.25rem 0.5rem;
    border-radius: 4px;
    font-size: 0.8rem;
    font-weight: 500;
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
