<script lang="ts">
  import type { FinancialCard } from '$lib/core/types';
  import { formatCardValue, getCardIcon, isPositiveCard, isNegativeCard, isLoanCard } from '$lib/services/card-formatter';
  import { createDragCardData, parseDragCardData, validateCardStacking } from '$lib/services/drag-drop-helpers';
  import Button from '../components/Button.svelte';
  import { createEventDispatcher } from 'svelte';
  
  export let card: FinancialCard;
  export let isActive = true;
  export let showRemoveButton = false;
  export let showInfoButton = true;
  export let isUnboundEffect = false; // True if this card has effects that apply globally
  
  const dispatch = createEventDispatcher();
  
  let isDragging = false;
  let isDragOver = false;
  
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
  
  function handleEditClick(event: MouseEvent) {
    event.stopPropagation();
    dispatch('edit', card);
  }
  
  // Drag and drop handlers
  function handleDragStart(event: DragEvent) {
    if (!event.dataTransfer) return;
    isDragging = true;
    event.dataTransfer.setData('application/json', JSON.stringify(createDragCardData(card)));
    event.dataTransfer.effectAllowed = 'move';
  }
  
  function handleDragEnd() {
    isDragging = false;
  }
  
  function handleDragOver(event: DragEvent) {
    event.preventDefault();
    
    const draggedCard = parseDragCardData(event.dataTransfer);
    if (draggedCard && validateCardStacking(card, draggedCard)) {
      isDragOver = true;
      event.dataTransfer!.dropEffect = 'move';
    }
  }
  
  function handleDragLeave() {
    isDragOver = false;
  }
  
  function handleDrop(event: DragEvent) {
    event.preventDefault();
    isDragOver = false;
    
    const draggedCard = parseDragCardData(event.dataTransfer);
    if (draggedCard && validateCardStacking(card, draggedCard)) {
      dispatch('stackCards', {
        card1: card,
        card2: draggedCard
      });
    }
  }
</script>

<div 
  class="game-card" 
  class:inactive={!isActive}
  class:dragging={isDragging}
  class:drag-over={isDragOver}
  class:unbound-effect={isUnboundEffect}
  on:click={handleClick}
  on:keydown
  role="button"
  tabindex="0"
  draggable={isActive}
  on:dragstart={handleDragStart}
  on:dragend={handleDragEnd}
  on:dragover={handleDragOver}
  on:dragleave={handleDragLeave}
  on:drop={handleDrop}
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
  
  <!-- Edit Mode Button -->
  <Button
    variant="secondary"
    size="small"
    onClick={handleEditClick}
    title="Edit card values"
    ariaLabel="Edit"
    class="edit-btn"
  >✏️</Button>
  
  <div class="card-inner">
    <div class="card-background-icon">{getCardIcon(card.type)}</div>
    <div class="card-title">{card.name}</div>
    
    <!-- Display Mode: Show formatted values -->
    <div class="card-type-container">
      <div 
        class="card-indicator" 
        class:positive={isPositiveCard(card)}
        class:negative={isNegativeCard(card)}
        class:loan={isLoanCard(card)}
      >
        <div class="indicator-scroll">
          <span class="indicator-content">
            <span class="indicator-value">{formatCardValue(card)}</span>
            <span class="indicator-time">• {card.timeRange[1] - card.timeRange[0]}y</span>
            {#if card.parameters.principal && card.parameters.principal !== 0}
              <span class="indicator-principal" 
                    class:principal-positive={card.parameters.principal > 0}
                    class:principal-negative={card.parameters.principal < 0}>• {card.parameters.principal > 0 ? '+' : ''}${(card.parameters.principal / 1000).toFixed(0)}k start</span>
            {/if}
            <span class="indicator-type">• {card.type}</span>
            {#if card.description}
              <span class="indicator-description">• {card.description}</span>
            {/if}
          </span>
          <span class="indicator-content" aria-hidden="true">
            <span class="indicator-value">{formatCardValue(card)}</span>
            <span class="indicator-time">• {card.timeRange[1] - card.timeRange[0]}y</span>
            {#if card.parameters.principal && card.parameters.principal !== 0}
              <span class="indicator-principal" 
                    class:principal-positive={card.parameters.principal > 0}
                    class:principal-negative={card.parameters.principal < 0}>• {card.parameters.principal > 0 ? '+' : ''}${(card.parameters.principal / 1000).toFixed(0)}k start</span>
            {/if}
            <span class="indicator-type">• {card.type}</span>
            {#if card.description}
              <span class="indicator-description">• {card.description}</span>
            {/if}
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
    overflow: visible;
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
  
  .game-card {
    cursor: grab;
  }
  
  .game-card:active {
    cursor: grabbing;
  }
  
  .game-card.dragging {
    opacity: 0.5;
    transform: rotate(5deg) scale(0.9);
    z-index: 100;
  }
  
  .game-card.drag-over {
    border-color: rgba(74, 222, 128, 0.8) !important;
    box-shadow: 0 0 20px rgba(74, 222, 128, 0.4), 0 10px 30px rgba(0, 0, 0, 0.5) !important;
    transform: translateY(-10px) scale(1.05);
  }
  
  /* Unbound effect styling - applies to all cards globally */
  .game-card.unbound-effect {
    border: 2px solid rgba(255, 140, 0, 0.6);
    background: linear-gradient(135deg, rgba(255, 140, 0, 0.1), rgba(255, 140, 0, 0.05));
    box-shadow: 0 0 20px rgba(255, 140, 0, 0.3), 0 5px 15px rgba(0, 0, 0, 0.4);
    position: relative;
  }

  .game-card.unbound-effect::before {
    content: '🌍';
    position: absolute;
    top: 8px;
    right: 8px;
    font-size: 1rem;
    opacity: 0.8;
    z-index: 10;
    text-shadow: 0 2px 4px rgba(0, 0, 0, 0.7);
    filter: drop-shadow(0 0 4px rgba(255, 140, 0, 0.6));
  }

  .game-card.unbound-effect:hover::after {
    content: 'Applies to ALL cards in hand';
    position: absolute;
    top: -40px;
    left: 50%;
    transform: translateX(-50%);
    background: rgba(255, 140, 0, 0.95);
    color: white;
    padding: 0.3rem 0.6rem;
    border-radius: 6px;
    font-size: 0.7rem;
    font-weight: 600;
    white-space: nowrap;
    z-index: 9999;
    opacity: 1;
    pointer-events: none;
    border: 1px solid rgba(255, 165, 0, 0.8);
    box-shadow: 0 4px 12px rgba(0, 0, 0, 0.6);
  }
  
  .game-card:hover::after {
    content: 'Drag onto other cards to stack';
    position: absolute;
    top: 50%;
    left: 50%;
    transform: translate(-50%, -50%);
    background: rgba(0, 0, 0, 0.9);
    color: white;
    padding: 0.25rem 0.5rem;
    border-radius: 4px;
    font-size: 0.7rem;
    white-space: nowrap;
    z-index: 9999;
    opacity: 0.95;
    pointer-events: none;
    border: 1px solid rgba(251, 191, 36, 0.5);
    box-shadow: 0 4px 12px rgba(0, 0, 0, 0.6);
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
    z-index: 2;
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

  .indicator-principal {
    opacity: 0.8;
    font-size: 0.6rem;
  }

  .indicator-principal.principal-positive {
    color: #4ade80;
  }

  .indicator-principal.principal-negative {
    color: #ef4444;
  }

  .indicator-type {
    opacity: 0.7;
    font-size: 0.6rem;
    text-transform: uppercase;
    letter-spacing: 0.5px;
  }

  .indicator-description {
    opacity: 0.6;
    font-size: 0.6rem;
    font-style: italic;
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

  .card-indicator.loan {
    background: rgba(251, 191, 36, 0.2);
    border-color: rgba(251, 191, 36, 0.3);
    color: #fbbf24;
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

  :global(.game-card .edit-btn) {
    position: absolute;
    top: 8px;
    right: 32px;
    width: 20px !important;
    height: 20px !important;
    border-radius: 50% !important;
    font-size: 0.7rem !important;
    z-index: 20;
    opacity: 0;
    transform: scale(0.8);
    pointer-events: none;
    transition: all 0.3s ease !important;
    background: rgba(255, 165, 0, 0.2) !important;
    border-color: rgba(255, 165, 0, 0.4) !important;
  }

  .game-card:hover :global(.edit-btn) {
    opacity: 1;
    transform: scale(1);
    pointer-events: auto;
  }

  /* Edit Fields Styles - removed as no longer needed */
</style>
