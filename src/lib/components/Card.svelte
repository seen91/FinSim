<script lang="ts">
  import type { FinancialCard } from '$lib/types';
  import { toggleCard, removeCardFromHand } from '$lib/stores/gameState';
  import { createEventDispatcher } from 'svelte';
  
  export let card: FinancialCard;
  export let isActive: boolean = true;
  export let showRemoveButton: boolean = false;
  
  const dispatch = createEventDispatcher();
  
  function handleClick() {
    toggleCard(card.id);
  }
  
  function handleInfoClick(event: MouseEvent) {
    event.stopPropagation();
    dispatch('showDetails', card);
  }

  function handleRemoveClick(event: MouseEvent) {
    event.stopPropagation();
    removeCardFromHand(card.id);
  }
  
  function formatValue(card: FinancialCard): string {
    if (card.parameters.rate) {
      return `${card.parameters.rate > 0 ? '+' : ''}${card.parameters.rate}%`;
    }
    if (card.parameters.monthlyAmount) {
      const monthly = card.parameters.monthlyAmount;
      // Show monthly for all linear cards (both positive and negative)
      return `${monthly > 0 ? '+' : ''}${(monthly / 1000).toFixed(1)}k/mo`;
    }
    return '';
  }
</script>

<div 
  class="card" 
  class:inactive={!isActive}
  on:click={handleClick}
  on:keydown
  role="button"
  tabindex="0"
>
  {#if showRemoveButton}
    <button 
      class="remove-btn" 
      on:click={handleRemoveClick}
      title="Remove card from hand"
      aria-label="Remove card"
    >×</button>
  {/if}
  <div class="card-inner">
    <div class="card-title">{card.name}</div>
    <div class="card-type-container">
      <span class="card-type">{card.type}</span>
      {#if card.detailedInfo}
        <button 
          class="info-btn" 
          on:click={handleInfoClick}
          title="View detailed information"
          aria-label="View card details"
        >ℹ️</button>
      {/if}
      <div class="card-indicator" 
           class:positive={(card.parameters.rate ?? 0) > 0 || (card.parameters.monthlyAmount ?? 0) > 0}
           class:negative={(card.parameters.rate ?? 0) < 0 || (card.parameters.monthlyAmount ?? 0) < 0}>
        {formatValue(card)}
      </div>
    </div>
    <div class="card-art" style="background: {card.color}20">
      <div class="card-art-icon">
        {#if card.type === 'compound'}⤴️
        {:else if card.type === 'linear'}📏
        {:else if card.type === 'exponential'}🚀
        {:else}⚙️{/if}
      </div>
    </div>
    <div class="card-stats">
      <span>{card.timeRange[1] - card.timeRange[0]} years</span>
    </div>
  </div>
</div>

<style>
  .card {
    width: 140px;
    height: 190px;
    background: linear-gradient(135deg, #2a2a3e, #1a1a2e);
    border: 2px solid rgba(255, 255, 255, 0.2);
    border-radius: 12px;
    cursor: pointer;
    transition: all 0.3s ease;
    transform-origin: bottom center;
    box-shadow: 0 10px 30px rgba(0, 0, 0, 0.5);
    overflow: hidden;
    position: relative;
    z-index: 5;
  }
  
  .card:hover:not(.inactive) {
    transform: translateY(-30px) scale(1.1);
    border-color: rgba(120, 119, 198, 0.6);
    box-shadow: 0 20px 40px rgba(0, 0, 0, 0.6), 0 0 60px rgba(120, 119, 198, 0.3);
    z-index: 10;
  }
  
  .card.inactive {
    transform: translateY(50px);
    opacity: 0.6;
    filter: brightness(0.7);
    z-index: 1;
  }
  
  .card.inactive:hover {
    transform: translateY(40px) scale(1.05);
    opacity: 0.7;
  }
  
  .card-inner {
    padding: 1rem;
    height: 100%;
    display: flex;
    flex-direction: column;
    position: relative;
    color: white;
  }
  
  .card.inactive .card-inner {
    filter: grayscale(30%);
  }
  
  .card-indicator {
    padding: 0.25rem 0.5rem;
    background: rgba(255, 255, 255, 0.1);
    border: 1px solid rgba(255, 255, 255, 0.2);
    border-radius: 4px;
    font-size: 0.7rem;
    font-weight: 600;
    margin-left: auto;
  }
  
  .card-indicator.positive {
    background: rgba(74, 222, 128, 0.2);
    border-color: rgba(74, 222, 128, 0.3);
    color: #4ade80;
  }
  
  .card-indicator.negative {
    background: rgba(239, 68, 68, 0.2);
    border-color: rgba(239, 68, 68, 0.3);
    color: #ef4444;
  }
  
  .info-btn {
    width: 20px;
    height: 20px;
    background: rgba(255, 255, 255, 0.1);
    border: 1px solid rgba(255, 255, 255, 0.2);
    border-radius: 50%;
    font-size: 0.65rem;
    cursor: pointer;
    transition: all 0.2s ease;
    display: flex;
    align-items: center;
    justify-content: center;
    z-index: 2;
  }
  
  .info-btn:hover {
    background: rgba(255, 255, 255, 0.2);
    transform: scale(1.1);
  }

  .remove-btn {
    position: absolute;
    top: 8px;
    left: 8px;
    width: 24px;
    height: 24px;
    background: rgba(239, 68, 68, 0.8);
    border: 1px solid rgba(239, 68, 68, 1);
    border-radius: 50%;
    color: white;
    font-size: 1rem;
    font-weight: bold;
    cursor: pointer;
    transition: all 0.3s ease;
    display: flex;
    align-items: center;
    justify-content: center;
    z-index: 20;
    line-height: 1;
    opacity: 0;
    transform: scale(0.8);
    pointer-events: none;
  }
  
  .card:hover .remove-btn {
    opacity: 1;
    transform: scale(1);
    pointer-events: auto;
  }
  
  .remove-btn:hover {
    background: rgba(239, 68, 68, 1);
    transform: scale(1.1) !important;
    box-shadow: 0 0 10px rgba(239, 68, 68, 0.5);
  }
  
  .card-title {
    font-size: 0.9rem;
    font-weight: 700;
    margin-bottom: 0.5rem;
  }
  
  .card-type {
    font-size: 0.65rem;
    color: #888;
    text-transform: uppercase;
    letter-spacing: 1px;
  }
  
  .card-type-container {
    display: flex;
    align-items: center;
    gap: 0.5rem;
    margin-bottom: 0.5rem;
    width: 100%;
  }
  
  .card-art {
    flex: 1;
    border-radius: 6px;
    margin-bottom: 0.5rem;
    display: flex;
    align-items: center;
    justify-content: center;
    font-size: 2rem;
  }
  
  .card-stats {
    font-size: 0.75rem;
    padding-top: 0.5rem;
    border-top: 1px solid rgba(255, 255, 255, 0.1);
    color: #aaa;
  }
</style>
