<script lang="ts">
  import type { FinancialCard } from '$lib/core/types';
  import { formatCardSimple, getCardIcon } from '$lib/services/card-formatter';
  import { createEventDispatcher } from 'svelte';

  export let card: FinancialCard;
  export let showInfoButton = true;

  const dispatch = createEventDispatcher();

  function handleAdd(e: Event) {
    e.stopPropagation();
    dispatch('add', card);
  }

  function handleCardClick(e: Event) {
    e.stopPropagation();
    // Don't add card if clicking on info button
    if ((e.target as HTMLElement).classList.contains('info-btn-mini')) {
      return;
    }
    dispatch('add', card);
  }

  function handleInfo(e: Event) {
    e.stopPropagation();
    dispatch('info', card);
  }

  // Helper functions to handle both unified and legacy card formats
  function getCardType(card: any): string {
    // Safety check for undefined/null cards
    if (!card) return 'linear';
    
    if (card.curve) {
      // Unified card format
      return card.curve.type || 'linear';
    }
    // Legacy card format
    return card.type || 'linear';
  }

  function isPositiveCard(card: any): boolean {
    if (!card) return false;
    
    if (card.curve) {
      // Unified card format
      return card.curve.isPositive;
    }
    // Legacy card format
    return (card.parameters?.rate ?? 0) > 0 || (card.parameters?.monthlyAmount ?? 0) > 0;
  }

  function isNegativeCard(card: any): boolean {
    if (!card) return false;
    
    if (card.curve) {
      // Unified card format
      return !card.curve.isPositive;
    }
    // Legacy card format
    return (card.parameters?.rate ?? 0) < 0 || (card.parameters?.monthlyAmount ?? 0) < 0;
  }

  function isLoanCard(card: any): boolean {
    if (!card) return false;
    
    if (card.curve) {
      // Unified cards don't have explicit loan type
      return false;
    }
    // Legacy card format
    return card.type === 'loan';
  }
</script>

<div class="card-item">
  <div class="card-mini" on:click={handleCardClick} role="button" tabindex="0" on:keydown={(e) => e.key === 'Enter' && handleCardClick(e)}>
    <div class="card-mini-header">
      <div class="card-mini-header-left">
        <span class="card-mini-icon">{getCardIcon(getCardType(card))}</span>
        {#if showInfoButton && card.detailedInfo}
          <button 
            class="info-btn-mini" 
            on:click={handleInfo}
            title="View detailed information"
            aria-label="View card details"
          >ℹ️</button>
        {/if}
      </div>
    </div>
    <div class="card-mini-name">{card.name}</div>
    <div class="card-mini-value" 
         class:positive={isPositiveCard(card)} 
         class:negative={isNegativeCard(card)}>
      {formatCardSimple(card)}
    </div>
  </div>
</div>

<style>
  .card-item {
    display: flex;
    align-items: center;
    gap: 0.75rem;
  }

  .card-mini {
    flex: 1;
    background: rgba(40, 40, 50, 0.4);
    border: 1px solid rgba(255, 255, 255, 0.1);
    border-radius: 8px;
    padding: 0.75rem;
    transition: all 0.2s ease;
    color: white;
    pointer-events: auto;
    cursor: pointer;
    outline: none;
  }

  .card-mini:hover {
    background: rgba(50, 50, 60, 0.6);
    border-color: rgba(120, 119, 198, 0.3);
    transform: translateY(-1px);
    box-shadow: 0 4px 12px rgba(0, 0, 0, 0.3);
  }

  .card-mini:active {
    transform: translateY(0);
    background: rgba(120, 119, 198, 0.2);
  }

  .card-mini-header {
    display: flex;
    justify-content: space-between;
    align-items: center;
    margin-bottom: 0.5rem;
  }

  .card-mini-header-left {
    display: flex;
    align-items: center;
    gap: 0.5rem;
  }

  .card-mini-icon {
    font-size: 1rem;
  }

  .card-mini-name {
    font-size: 0.85rem;
    font-weight: 500;
    color: white;
    margin-bottom: 0.25rem;
  }

  .card-mini-value {
    font-size: 0.8rem;
    font-weight: 600;
    margin-top: 0.25rem;
    color: #888;
  }

  .card-mini-value.positive {
    color: #4ade80;
  }

  .card-mini-value.negative {
    color: #f87171;
  }

  .info-btn-mini {
    width: 20px;
    height: 20px;
    border-radius: 50%;
    background: rgba(255, 255, 255, 0.1);
    border: 1px solid rgba(255, 255, 255, 0.2);
    color: white;
    font-size: 0.65rem;
    cursor: pointer;
    transition: all 0.2s ease;
    display: flex;
    align-items: center;
    justify-content: center;
    position: relative;
    z-index: 10;
  }

  .info-btn-mini:hover {
    background: rgba(255, 255, 255, 0.2);
    transform: scale(1.1);
  }
</style>