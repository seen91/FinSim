<script lang="ts">
  import type { FinancialCard } from '$lib/core/types';
  import { formatCardValue, getCardIcon, isPositiveCard, isNegativeCard } from '$lib/services/card-formatter';
  import Button from '../components/Button.svelte';
  import { createEventDispatcher } from 'svelte';
  
  export let card: FinancialCard;
  export let isActive = true;
  export let showRemoveButton = false;
  export let showInfoButton = true;
  
  const dispatch = createEventDispatcher();
  
  function handleClick() {
    dispatch('toggle', card);
  }
  
  function handleInfoClick(event: MouseEvent) {
    event.stopPropagation();
    dispatch('info', card);
  }

  function handleRemoveClick(event: MouseEvent) {
    event.stopPropagation();
    dispatch('remove', card);
  }
</script>

<div 
  class="game-card" 
  class:inactive={!isActive}
  on:click={handleClick}
  on:keydown
  role="button"
  tabindex="0"
>
  {#if showRemoveButton}
    <Button
      variant="danger"
      size="small"
      onClick={handleRemoveClick}
      title="Remove card from hand"
      ariaLabel="Remove card"
      class="remove-btn"
    >×</Button>
  {/if}
  
  <div class="card-inner">
    <div class="card-title">{card.name}</div>
    
    <div class="card-type-container">
      <span class="card-type">{card.type}</span>
      {#if showInfoButton && card.detailedInfo}
        <Button
          variant="secondary"
          size="small"
          onClick={handleInfoClick}
          title="View detailed information"
          ariaLabel="View card details"
        >ℹ️</Button>
      {/if}
      <div 
        class="card-indicator" 
        class:positive={isPositiveCard(card)}
        class:negative={isNegativeCard(card)}
      >
        {formatCardValue(card)}
      </div>
    </div>
    
    <div class="card-art" style="background: {card.color}20">
      <div class="card-art-icon">
        {getCardIcon(card.type)}
      </div>
    </div>
    
    <div class="card-stats">
      <span>{card.timeRange[1] - card.timeRange[0]} years</span>
    </div>
  </div>
</div>

<style>
  .game-card {
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
  
  .game-card:hover:not(.inactive) {
    transform: translateY(-30px) scale(1.1);
    border-color: rgba(120, 119, 198, 0.6);
    box-shadow: 0 20px 40px rgba(0, 0, 0, 0.6), 0 0 60px rgba(120, 119, 198, 0.3);
    z-index: 10;
  }
  
  .game-card.inactive {
    transform: translateY(50px);
    opacity: 0.6;
    filter: brightness(0.7);
    z-index: 1;
  }
  
  .game-card.inactive:hover {
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
  
  .game-card.inactive .card-inner {
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
  
  :global(.game-card .remove-btn) {
    position: absolute;
    top: 8px;
    left: 8px;
    width: 24px !important;
    height: 24px !important;
    border-radius: 50% !important;
    z-index: 20;
    opacity: 0;
    transform: scale(0.8);
    pointer-events: none;
    transition: all 0.3s ease !important;
  }
  
  .game-card:hover :global(.remove-btn) {
    opacity: 1;
    transform: scale(1);
    pointer-events: auto;
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
