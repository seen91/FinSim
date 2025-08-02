<script lang="ts">
  import type { FinancialCard } from '$lib/types';
  import { toggleCard } from '$lib/stores/gameState';
  
  export let card: FinancialCard;
  export let isActive: boolean = true;
  
  function handleClick() {
    toggleCard(card.id);
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
  <div class="card-inner">
    <div class="card-indicator" 
         class:positive={(card.parameters.rate ?? 0) > 0 || (card.parameters.monthlyAmount ?? 0) > 0}
         class:negative={(card.parameters.rate ?? 0) < 0 || (card.parameters.monthlyAmount ?? 0) < 0}>
      {formatValue(card)}
    </div>
    <div class="card-title">{card.name}</div>
    <div class="card-type">{card.type}</div>
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
    position: absolute;
    top: 0.5rem;
    right: 0.5rem;
    padding: 0.25rem 0.5rem;
    background: rgba(255, 255, 255, 0.1);
    border: 1px solid rgba(255, 255, 255, 0.2);
    border-radius: 4px;
    font-size: 0.7rem;
    font-weight: 600;
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
    margin-bottom: 0.5rem;
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
