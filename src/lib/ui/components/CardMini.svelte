<script lang="ts">
  import type { FinancialCard } from '$lib/core/types';
  import { formatCardValue, getCardIcon, isPositiveCard, isNegativeCard, isLoanCard } from '$lib/services/card-formatter';
  import { createEventDispatcher } from 'svelte';

  export let card: FinancialCard;
  export let showAddButton = false;
  export let showInfoButton = false;
  export let onAdd: ((event: MouseEvent) => void) | undefined = undefined;
  export let onInfo: ((event: MouseEvent) => void) | undefined = undefined;
  
  const dispatch = createEventDispatcher();
  
  function handleAdd(event: MouseEvent) {
    onAdd?.(event);
    dispatch('add', card);
  }
  
  function handleInfo(event: MouseEvent) {
    event.stopPropagation();
    onInfo?.(event);
    dispatch('info', card);
  }
</script>

<div class="card-mini">
  <div class="card-mini-content">
    <div class="card-mini-header">
      <div class="card-mini-header-left">
        <span class="card-mini-icon">{getCardIcon(card.type)}</span>
        <span class="card-mini-type">{card.type}</span>
        {#if showInfoButton && card.detailedInfo}
          <button
            class="info-btn-mini"
            on:click={handleInfo}
            title="View detailed information"
            aria-label="View card details"
          >ℹ️</button>
        {/if}
      </div>
      <span 
        class="card-mini-value"
        class:positive={isPositiveCard(card)}
        class:negative={isNegativeCard(card)}
        class:loan={isLoanCard(card)}
      >
        {formatCardValue(card)}
      </span>
    </div>
    <div class="card-mini-name">{card.name}</div>
    {#if card.description}
      <div class="card-mini-description">{card.description}</div>
    {/if}
  </div>
  {#if showAddButton}
    <button
      class="add-btn-circular"
      on:click={handleAdd}
      title="Add this card"
    >+</button>
  {/if}
</div>

<style>
  .card-mini {
    background: rgba(40, 40, 50, 0.4);
    border: 1px solid rgba(255, 255, 255, 0.1);
    border-radius: 8px;
    padding: 0.75rem;
    transition: all 0.2s ease;
    position: relative;
    display: flex;
    align-items: center;
    gap: 0.75rem;
  }
  
  .card-mini:hover {
    background: rgba(50, 50, 60, 0.6);
    border-color: rgba(120, 119, 198, 0.3);
  }
  
  .card-mini-content {
    flex: 1;
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
    font-size: 0.8rem;
  }
  
  .card-mini-type {
    font-size: 0.65rem;
    color: #888;
    text-transform: uppercase;
    letter-spacing: 1px;
  }
  
  .card-mini-value {
    font-size: 0.75rem;
    font-weight: 600;
  }
  
  .card-mini-value.positive {
    color: #4ade80;
  }
  
  .card-mini-value.negative {
    color: #ef4444;
  }

  .card-mini-value.loan {
    color: #fbbf24;
  }
  
  .card-mini-name {
    font-size: 0.85rem;
    font-weight: 500;
    margin-bottom: 0.25rem;
    color: white;
  }
  
  .card-mini-description {
    font-size: 0.7rem;
    color: #aaa;
    margin-bottom: 0.5rem;
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
  }
  
  .info-btn-mini:hover {
    background: rgba(255, 255, 255, 0.2);
    transform: scale(1.1);
  }
  
  .add-btn-circular {
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
    flex-shrink: 0;
  }
  
  .add-btn-circular:hover {
    background: rgba(120, 119, 198, 0.4);
    transform: scale(1.1);
    box-shadow: 0 0 20px rgba(120, 119, 198, 0.4);
  }
</style>
