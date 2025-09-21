<script lang="ts">
  import type { FinancialCard } from '$lib/core/types';
  import { formatCardValue, getCardIcon } from '$lib/services/card-formatter';
  import { createEventDispatcher } from 'svelte';

  export let card: FinancialCard;
  export let showAddButton = true;
  export let showInfoButton = true;

  const dispatch = createEventDispatcher();

  function handleAdd(e: Event) {
    e.stopPropagation();
    console.log('CardMiniDisplay: Add button clicked for', card.name);
    dispatch('add', card);
  }

  function handleInfo(e: Event) {
    e.stopPropagation();
    console.log('CardMiniDisplay: Info button clicked for', card.name);
    dispatch('info', card);
  }
</script>

<div class="card-item">
  <div class="card-mini">
    <div class="card-mini-header">
      <div class="card-mini-header-left">
        <span class="card-mini-icon">{getCardIcon(card.type)}</span>
        {#if showInfoButton && card.detailedInfo}
          <button 
            class="info-btn-mini" 
            on:click={handleInfo}
            title="View detailed information"
            aria-label="View card details"
          >ℹ️</button>
        {/if}
      </div>
      <span class="card-mini-value" 
            class:positive={(card.parameters.rate ?? 0) > 0 || (card.parameters.monthlyAmount ?? 0) > 0}
            class:negative={(card.parameters.rate ?? 0) < 0 || (card.parameters.monthlyAmount ?? 0) < 0}
            class:loan={card.type === 'loan'}>
        {formatCardValue(card)}
      </span>
    </div>
    <div class="card-mini-name">{card.name}</div>
  </div>
  
  {#if showAddButton}
    <button class="add-btn" on:click={handleAdd} title="Add this card">+</button>
  {/if}
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
  }

  .card-item:hover .card-mini {
    background: rgba(50, 50, 60, 0.6);
    border-color: rgba(120, 119, 198, 0.3);
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
    font-size: 0.75rem;
    font-weight: 600;
    padding: 0.25rem 0.5rem;
    border-radius: 4px;
    background: rgba(255, 255, 255, 0.1);
  }

  .card-mini-value.positive {
    color: #4ade80;
    background: rgba(74, 222, 128, 0.2);
  }

  .card-mini-value.negative {
    color: #ef4444;
    background: rgba(239, 68, 68, 0.2);
  }

  .card-mini-value.loan {
    color: #fbbf24;
    background: rgba(251, 191, 36, 0.2);
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

  .add-btn {
    width: 32px;
    height: 32px;
    border-radius: 50%;
    background: rgba(120, 119, 198, 0.2);
    border: 1px solid rgba(120, 119, 198, 0.4);
    color: white;
    font-size: 1.2rem;
    cursor: pointer;
    transition: all 0.2s ease;
    display: flex;
    align-items: center;
    justify-content: center;
    position: relative;
    z-index: 10;
  }

  .add-btn:hover {
    background: rgba(120, 119, 198, 0.4);
    transform: scale(1.1);
    box-shadow: 0 0 20px rgba(120, 119, 198, 0.4);
  }
</style>