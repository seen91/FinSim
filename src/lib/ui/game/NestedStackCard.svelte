<script lang="ts">
  import type { NestedStack, FinancialCard, CardStack } from '$lib/core/types';
  import { formatCardValue, getCardIcon, isPositiveCard, isNegativeCard, isLoanCard } from '$lib/services/card-formatter';
  import { getPrimaryCard, getStackCardCount, isCard, isStack } from '$lib/core/utils/stack-utils';
  import { parseDragCardData, validateStackAddition } from '$lib/services/drag-drop-helpers';
  import Button from '../components/Button.svelte';
  import { createEventDispatcher } from 'svelte';
  
  export let nestedStack: NestedStack;
  export let isActive = true;
  export let showRemoveButton = false;
  export let showInfoButton = true;
  
  const dispatch = createEventDispatcher();
  
  // Get the primary card to display as the main visual
  $: primaryCard = getPrimaryCard(nestedStack);
  $: totalCardCount = getStackCardCount(nestedStack);
  $: stackLayerCount = nestedStack.items.length;
  
  function handleClick() {
    dispatch('toggle', nestedStack);
  }
  
  function handleInfoClick(event: MouseEvent) {
    event.stopPropagation();
    dispatch('info', nestedStack);
  }
  
  function handleRemoveClick(event: MouseEvent) {
    event.stopPropagation();
    dispatch('remove', nestedStack);
  }
  
  function handleUnstackClick(event: MouseEvent) {
    event.stopPropagation();
    dispatch('unstack', nestedStack);
  }
  
  function handleDragOver(event: DragEvent) {
    event.preventDefault();
    const draggedCard = parseDragCardData(event.dataTransfer!);
    if (draggedCard && primaryCard && validateStackAddition(primaryCard, draggedCard)) {
      event.dataTransfer!.dropEffect = 'move';
    }
  }
  
  function handleDrop(event: DragEvent) {
    event.preventDefault();
    const draggedCard = parseDragCardData(event.dataTransfer!);
    if (draggedCard && primaryCard && validateStackAddition(primaryCard, draggedCard)) {
      dispatch('addCard', {
        stackId: nestedStack.id,
        card: draggedCard
      });
    }
  }
  
  function handleDragStart(event: DragEvent) {
    if (!primaryCard) return;
    event.dataTransfer?.setData('application/json', JSON.stringify({
      type: 'nested-stack',
      nestedStack: nestedStack
    }));
  }
</script>

<div 
  class="nested-stack-card"
  class:active={isActive}
  draggable={true}
  on:dragstart={handleDragStart}
  on:dragover={handleDragOver}
  on:drop={handleDrop}
  on:click={handleClick}
  on:keydown
  role="button"
  tabindex="0"
>
  {#if primaryCard}
    <!-- Main card background with multi-dimensional visual effects -->
    <div 
      class="card-background" 
      style="background: {primaryCard.color}; border-color: {primaryCard.color};"
    >
      <!-- Stack depth indicators - show multiple layers -->
      <div class="stack-depth-indicators">
        {#each { length: Math.min(stackLayerCount, 4) } as _, index}
          <div 
            class="depth-layer"
            style="transform: translate({-2 + index * 2}px, {-2 + index * 2}px); z-index: {10 - index};"
          ></div>
        {/each}
      </div>
      
      <!-- Primary card content -->
      <div class="card-content">
        <div class="card-header">
          <div class="card-title-row">
            <span class="card-icon">{getCardIcon(primaryCard.type)}</span>
            <span class="card-name">{primaryCard.name}</span>
            {#if showInfoButton}
              <button class="info-btn" on:click={handleInfoClick} title="View stack details">
                ℹ️
              </button>
            {/if}
          </div>
          
          <div class="card-value"
               class:positive={isPositiveCard(primaryCard)}
               class:negative={isNegativeCard(primaryCard)}
               class:loan={isLoanCard(primaryCard)}>
            {formatCardValue(primaryCard)}
          </div>
        </div>
        
        <!-- Nested stack indicators -->
        <div class="nested-indicators">
          <div class="nested-info">
            <span class="nested-layers">📚 {stackLayerCount} layers</span>
            <span class="nested-cards">🃏 {totalCardCount} total cards</span>
          </div>
          <div class="visual-layers">
            {#each nestedStack.items as item, index}
              <div class="layer-indicator" 
                   class:card-layer={isCard(item)}
                   class:stack-layer={isStack(item)}
                   title={isCard(item) ? item.name : `Stack (${item.cards.length} cards)`}>
                {isCard(item) ? '●' : '■'}
              </div>
            {/each}
          </div>
        </div>
      </div>
      
      <!-- Action buttons -->
      <div class="action-buttons">
        {#if showRemoveButton}
          <Button size="small" on:click={handleRemoveClick} title="Remove nested stack">
            🗑️
          </Button>
        {/if}
        <Button size="small" on:click={handleUnstackClick} title="Break apart nested stack">
          ↗️
        </Button>
      </div>
    </div>
  {:else}
    <!-- Fallback for empty nested stack -->
    <div class="empty-nested-stack">
      <div class="empty-content">
        <span class="empty-icon">📦</span>
        <span class="empty-text">Empty Nested Stack</span>
        <span class="empty-details">{stackLayerCount} layers, {totalCardCount} cards</span>
      </div>
    </div>
  {/if}
</div>

<style>
  .nested-stack-card {
    position: relative;
    cursor: pointer;
    transition: all 0.3s ease;
    margin: 8px;
  }
  
  .nested-stack-card:hover {
    transform: translateY(-2px);
  }
  
  .nested-stack-card.active {
    box-shadow: 0 0 20px rgba(120, 119, 198, 0.5);
  }
  
  .card-background {
    position: relative;
    width: 280px;
    min-height: 160px;
    border-radius: 12px;
    border: 2px solid;
    padding: 1rem;
    background-size: cover;
    background-position: center;
    overflow: hidden;
  }
  
  .stack-depth-indicators {
    position: absolute;
    top: 0;
    left: 0;
    right: 0;
    bottom: 0;
    pointer-events: none;
  }
  
  .depth-layer {
    position: absolute;
    top: 0;
    left: 0;
    right: 0;
    bottom: 0;
    border: 2px solid rgba(255, 255, 255, 0.3);
    border-radius: 12px;
    background: rgba(0, 0, 0, 0.1);
  }
  
  .card-content {
    position: relative;
    z-index: 20;
    height: 100%;
    display: flex;
    flex-direction: column;
    justify-content: space-between;
  }
  
  .card-header {
    display: flex;
    flex-direction: column;
    gap: 0.5rem;
  }
  
  .card-title-row {
    display: flex;
    align-items: center;
    gap: 0.5rem;
  }
  
  .card-icon {
    font-size: 1.2rem;
  }
  
  .card-name {
    flex: 1;
    font-weight: 600;
    font-size: 1.1rem;
    color: white;
    text-shadow: 1px 1px 2px rgba(0, 0, 0, 0.7);
  }
  
  .info-btn {
    width: 24px;
    height: 24px;
    border-radius: 50%;
    background: rgba(255, 255, 255, 0.2);
    border: 1px solid rgba(255, 255, 255, 0.3);
    color: white;
    font-size: 0.8rem;
    cursor: pointer;
    transition: all 0.2s ease;
  }
  
  .info-btn:hover {
    background: rgba(255, 255, 255, 0.3);
    transform: scale(1.1);
  }
  
  .card-value {
    align-self: flex-end;
    padding: 0.3rem 0.6rem;
    border-radius: 6px;
    font-weight: 600;
    font-size: 0.9rem;
    background: rgba(0, 0, 0, 0.4);
    color: white;
  }
  
  .card-value.positive {
    background: rgba(74, 222, 128, 0.8);
    color: white;
  }
  
  .card-value.negative {
    background: rgba(239, 68, 68, 0.8);
    color: white;
  }
  
  .card-value.loan {
    background: rgba(251, 191, 36, 0.8);
    color: white;
  }
  
  .nested-indicators {
    display: flex;
    flex-direction: column;
    gap: 0.5rem;
    margin-top: 1rem;
  }
  
  .nested-info {
    display: flex;
    justify-content: space-between;
    font-size: 0.8rem;
    color: rgba(255, 255, 255, 0.9);
    text-shadow: 1px 1px 2px rgba(0, 0, 0, 0.7);
  }
  
  .visual-layers {
    display: flex;
    gap: 0.25rem;
    flex-wrap: wrap;
  }
  
  .layer-indicator {
    width: 16px;
    height: 16px;
    display: flex;
    align-items: center;
    justify-content: center;
    border-radius: 3px;
    font-size: 0.7rem;
    color: white;
    text-shadow: 1px 1px 2px rgba(0, 0, 0, 0.8);
  }
  
  .layer-indicator.card-layer {
    background: rgba(59, 130, 246, 0.7);
  }
  
  .layer-indicator.stack-layer {
    background: rgba(168, 85, 247, 0.7);
  }
  
  .action-buttons {
    position: absolute;
    bottom: 0.5rem;
    right: 0.5rem;
    display: flex;
    gap: 0.25rem;
    z-index: 25;
  }
  
  .empty-nested-stack {
    width: 280px;
    height: 160px;
    border: 2px dashed rgba(255, 255, 255, 0.3);
    border-radius: 12px;
    display: flex;
    align-items: center;
    justify-content: center;
    background: rgba(40, 40, 50, 0.5);
  }
  
  .empty-content {
    text-align: center;
    color: rgba(255, 255, 255, 0.6);
  }
  
  .empty-icon {
    font-size: 2rem;
    display: block;
    margin-bottom: 0.5rem;
  }
  
  .empty-text {
    font-weight: 500;
    display: block;
    margin-bottom: 0.25rem;
  }
  
  .empty-details {
    font-size: 0.8rem;
    opacity: 0.8;
  }
</style>