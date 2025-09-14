<script lang="ts">
  import type { CardStack } from '$lib/core/types';
  import { formatCardValue, getCardIcon, isPositiveCard, isNegativeCard } from '$lib/services/card-formatter';
  import Button from '../components/Button.svelte';
  import GameCard from './GameCard.svelte';
  import { createEventDispatcher } from 'svelte';
  
  export let stack: CardStack;
  export let isActive = true;
  export let showRemoveButton = false;
  export let showInfoButton = true;
  
  const dispatch = createEventDispatcher();
  
  function handleClick() {
    dispatch('toggle', stack);
  }
  
  function handleInfoClick(event: MouseEvent) {
    event.stopPropagation();
    dispatch('info', stack);
  }

  function handleRemoveClick(event: MouseEvent) {
    event.stopPropagation();
    dispatch('remove', stack);
  }
  
  function handleUnstackClick(event: MouseEvent) {
    event.stopPropagation();
    dispatch('unstack', stack);
  }
  
  // Get stacking effects summary
  function getStackEffectsSummary(): string {
    const effects = stack.modifierCards.flatMap(card => card.stackEffects || []);
    return effects.map(effect => effect.description).join(', ');
  }
</script>

<div 
  class="stacked-card" 
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
      title="Remove stack from play"
      ariaLabel="Remove stack"
      class="remove-btn"
    >×</Button>
  {/if}
  
  <!-- Stack action buttons -->
  <Button
    variant="secondary"
    size="small"
    onClick={handleUnstackClick}
    title="Unstack cards"
    ariaLabel="Unstack cards"
    class="unstack-btn"
  >⊟</Button>
  
  <!-- Base card (bottom layer, using GameCard) -->
  <div class="card-layer base-card">
    <GameCard 
      card={stack.baseCard}
      isActive={false}
      showRemoveButton={false}
      showInfoButton={false}
    />
  </div>
  
  <!-- Modifier cards (stacked on top, using GameCard) -->
  {#each stack.modifierCards as modifier, index (modifier.id)}
    <div 
      class="card-layer modifier-card"
      style="transform: translateY(-{5 + (index * 3)}px) translateX({index * 2}px); z-index: {10 + index};"
    >
      <GameCard 
        card={modifier}
        isActive={false}
        showRemoveButton={false}
        showInfoButton={false}
      />
      <!-- Modifier card overlay to change appearance -->
      <div class="modifier-overlay"></div>
    </div>
  {/each}
  
  <!-- Top overlay with combined information -->
  <div class="stack-overlay">
    <div class="stack-info">
      <div class="stack-indicator">
        <div 
          class="card-indicator" 
          class:positive={isPositiveCard(stack.baseCard)}
          class:negative={isNegativeCard(stack.baseCard)}
        >
          <div class="indicator-scroll">
            <span class="indicator-content">
              <span class="indicator-value">{formatCardValue(stack.baseCard)}</span>
              <span class="indicator-modifiers">+ {stack.modifierCards.length} effects</span>
              <span class="indicator-time">• {stack.baseCard.timeRange[1] - stack.baseCard.timeRange[0]}y</span>
              <span class="indicator-effects">• {getStackEffectsSummary()}</span>
            </span>
            <span class="indicator-content" aria-hidden="true">
              <span class="indicator-value">{formatCardValue(stack.baseCard)}</span>
              <span class="indicator-modifiers">+ {stack.modifierCards.length} effects</span>
              <span class="indicator-time">• {stack.baseCard.timeRange[1] - stack.baseCard.timeRange[0]}y</span>
              <span class="indicator-effects">• {getStackEffectsSummary()}</span>
            </span>
          </div>
        </div>
      </div>
    </div>
  </div>
  
  {#if showInfoButton}
    <Button
      variant="secondary"
      size="small"
      onClick={handleInfoClick}
      title="View stack details"
      ariaLabel="View stack details"
      class="info-btn"
    >ℹ️</Button>
  {/if}
</div>

<style>
  .stacked-card {
    width: 140px;
    height: 190px;
    position: relative;
    cursor: pointer;
    transition: all 0.3s ease;
    transform-origin: bottom center;
    z-index: 5;
  }
  
  .stacked-card:hover:not(.inactive) {
    transform: translateY(-30px) scale(1.1);
    z-index: 20;
  }
  
  .stacked-card.inactive {
    transform: translateY(50px);
    opacity: 0.6;
    filter: brightness(0.7);
    z-index: 1;
  }
  
  .stacked-card.inactive:hover {
    transform: translateY(40px) scale(1.05);
    opacity: 0.7;
  }
  
  .card-layer {
    position: absolute;
    top: 0;
    left: 0;
    width: 100%;
    height: 100%;
  }
  
  .base-card {
    z-index: 1;
  }
  
  .modifier-card {
    z-index: 2;
  }
  
  .modifier-overlay {
    position: absolute;
    top: 0;
    left: 0;
    right: 0;
    bottom: 0;
    background: linear-gradient(135deg, rgba(58, 42, 78, 0.7), rgba(42, 26, 62, 0.7));
    border: 2px solid rgba(200, 150, 255, 0.4);
    border-radius: 12px;
    pointer-events: none;
  }
  
  .stacked-card:hover .modifier-overlay {
    border-color: rgba(200, 150, 255, 0.6);
    box-shadow: 0 5px 20px rgba(200, 150, 255, 0.3);
  }
  
  .stack-overlay {
    position: absolute;
    bottom: 0;
    left: 0;
    right: 0;
    height: 60px;
    background: linear-gradient(to top, rgba(0, 0, 0, 0.9) 0%, transparent 100%);
    z-index: 20;
    display: flex;
    align-items: flex-end;
    padding: 0.5rem;
    overflow: hidden;
  }

  .stack-info {
    width: 100%;
    display: flex;
    align-items: center;
    gap: 0.5rem;
    justify-content: center;
  }

  .card-indicator {
    padding: 0.35rem 0.6rem;
    background: rgba(0, 0, 0, 0.8);
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
    animation: scroll-banner 12s linear infinite;
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

  .stacked-card:hover .indicator-scroll {
    animation-play-state: paused;
  }

  .indicator-value {
    font-weight: 700;
  }
  
  .indicator-modifiers {
    color: #c896ff;
    font-weight: 600;
    font-size: 0.6rem;
  }

  .indicator-time {
    opacity: 0.7;
    font-size: 0.6rem;
  }
  
  .indicator-effects {
    opacity: 0.8;
    font-size: 0.6rem;
    font-style: italic;
    color: #ffa8a8;
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

  :global(.stacked-card .remove-btn) {
    position: absolute;
    top: 8px;
    left: 8px;
    width: 24px !important;
    height: 24px !important;
    border-radius: 50% !important;
    z-index: 25;
    opacity: 0;
    transform: scale(0.8);
    pointer-events: none;
    transition: all 0.3s ease !important;
  }
  
  :global(.stacked-card .unstack-btn) {
    position: absolute;
    top: 8px;
    left: 36px;
    width: 24px !important;
    height: 24px !important;
    border-radius: 50% !important;
    z-index: 25;
    opacity: 0;
    transform: scale(0.8);
    pointer-events: none;
    transition: all 0.3s ease !important;
    background: rgba(255, 165, 0, 0.8) !important;
  }

  .stacked-card:hover :global(.remove-btn),
  .stacked-card:hover :global(.unstack-btn) {
    opacity: 1;
    transform: scale(1);
    pointer-events: auto;
  }

  :global(.stacked-card .info-btn) {
    position: absolute;
    top: 8px;
    right: 8px;
    width: 20px !important;
    height: 20px !important;
    border-radius: 50% !important;
    font-size: 0.7rem !important;
    z-index: 25;
    opacity: 0;
    transform: scale(0.8);
    pointer-events: none;
    transition: all 0.3s ease !important;
  }

  .stacked-card:hover :global(.info-btn) {
    opacity: 1;
    transform: scale(1);
    pointer-events: auto;
  }
</style>
