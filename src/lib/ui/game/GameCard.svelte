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
    <div class="card-background-icon">{getCardIcon(card.type)}</div>
    <div class="card-title">{card.name}</div>
    
    <div class="card-type-container">
      <div 
        class="card-indicator" 
        class:positive={isPositiveCard(card)}
        class:negative={isNegativeCard(card)}
      >
        <div class="indicator-scroll">
          <span class="indicator-content">
            <span class="indicator-value">{formatCardValue(card)}</span>
            <span class="indicator-time">• {card.timeRange[1] - card.timeRange[0]}y</span>
          </span>
          <span class="indicator-content" aria-hidden="true">
            <span class="indicator-value">{formatCardValue(card)}</span>
            <span class="indicator-time">• {card.timeRange[1] - card.timeRange[0]}y</span>
          </span>
        </div>
      </div>
    </div>
  </div>
  
  {#if showInfoButton && card.detailedInfo}
    <Button
      variant="secondary"
      size="small"
      onClick={handleInfoClick}
      title="View detailed information"
      ariaLabel="View card details"
      class="info-btn"
    >ℹ️</Button>
  {/if}
</div>

<style>
  .game-card {
    width: 180px;
    height: 240px;
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
    justify-content: flex-start;
    position: relative;
    color: white;
  }

  .card-background-icon {
    position: absolute;
    top: 50%;
    left: 50%;
    transform: translate(-50%, -50%);
    font-size: 8rem;
    opacity: 0.15;
    z-index: 1;
    pointer-events: none;
    color: white;
    text-shadow: 0 0 20px rgba(255, 255, 255, 0.1);
  }

  .card-title {
    font-size: 1rem;
    font-weight: 700;
    margin-bottom: 0.5rem;
    text-align: center;
    line-height: 1.2;
    position: relative;
    z-index: 2;
    text-shadow: 0 2px 4px rgba(0, 0, 0, 0.3);
    margin-top: -0.5rem;
  }

  .card-type-container {
    display: flex;
    align-items: center;
    gap: 0.5rem;
    width: 100%;
    justify-content: center;
    position: relative;
    z-index: 3;
    margin-top: 3rem;
  }

  .game-card.inactive .card-inner {
    filter: grayscale(30%);
  }

  .card-indicator {
    padding: 0.35rem 0.6rem;
    background: rgba(0, 0, 0, 0.7);
    border: 1px solid rgba(255, 255, 255, 0.3);
    border-radius: 6px;
    font-size: 0.7rem;
    font-weight: 600;
    overflow: hidden;
    position: relative;
    white-space: nowrap;
    backdrop-filter: blur(4px);
    box-shadow: 0 2px 8px rgba(0, 0, 0, 0.3);
  }

  .indicator-scroll {
    display: flex;
    animation: scroll-banner 8s linear infinite;
  }

  .indicator-content {
    display: flex;
    align-items: center;
    gap: 0.25rem;
    padding-right: 2rem;
    flex-shrink: 0;
  }

  @keyframes scroll-banner {
    0% {
      transform: translateX(0);
    }
    100% {
      transform: translateX(-100%);
    }
  }

  .game-card:hover .indicator-scroll {
    animation-play-state: paused;
  }

  .indicator-value {
    font-weight: 700;
  }

  .indicator-time {
    opacity: 0.7;
    font-size: 0.6rem;
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

  :global(.game-card .info-btn) {
    position: absolute;
    top: 8px;
    right: 8px;
    width: 20px !important;
    height: 20px !important;
    border-radius: 50% !important;
    font-size: 0.7rem !important;
    z-index: 20;
    opacity: 0;
    transform: scale(0.8);
    pointer-events: none;
    transition: all 0.3s ease !important;
  }

  .game-card:hover :global(.info-btn) {
    opacity: 1;
    transform: scale(1);
    pointer-events: auto;
  }
</style>
