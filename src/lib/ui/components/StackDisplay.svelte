<script lang="ts">
  import type { CardStack } from '$lib/core/types';
  import { createEventDispatcher } from 'svelte';
  import CardMiniDisplay from '../components/CardMiniDisplay.svelte';

  export let stack: CardStack;
  export let title: string = 'Stacked Cards';
  export let readonly: boolean = false;
  let expanded = false;
  const dispatch = createEventDispatcher();

  function toggleExpanded() {
    expanded = !expanded;
  }

  function handleExpandClick(e: Event) {
    e.stopPropagation();
    toggleExpanded();
  }

  function handleAddStack(e: Event) {
    e.stopPropagation();
    dispatch('addStack', stack);
  }

  function handleCardAdd(event: CustomEvent) {
    dispatch('addCard', event.detail);
  }

  function handleCardInfo(event: CustomEvent) {
    dispatch('cardInfo', event.detail);
  }
</script><div class="stack-container">
  <div class="stack-item" on:click={toggleExpanded} on:keydown role="button" tabindex="0">
    <div class="stack-details">
      <div class="stack-name">📚 {title}</div>
      <div class="stack-info">{stack.cards.length} cards • Calculated in order of appearance</div>
    </div>
    <div class="stack-controls">
      <button class="expand-btn" on:click={handleExpandClick} title={expanded ? "Collapse stack contents" : "Expand stack contents"}>
        <span class="expand-icon" class:expanded>{expanded ? '▼' : '▶'}</span>
      </button>
      {#if !readonly}
        <button class="add-btn" on:click={handleAddStack} title="Add this stack">+</button>
      {/if}
    </div>
  </div>
  
  {#if expanded}
    <div class="stack-contents">
      <!-- Card list -->
      <div class="cards-list">
        {#each stack.cards as card}
          <CardMiniDisplay 
            {card} 
            showAddButton={!readonly}
            on:add={handleCardAdd}
            on:info={handleCardInfo}
          />
        {/each}
      </div>
    </div>
  {/if}
</div>

<style>
  .stack-container { 
    margin-bottom: 1rem; 
  }
  
  .stack-item { 
    background: rgba(168, 85, 247, 0.15); 
    border: 1px solid rgba(168, 85, 247, 0.3); 
    border-radius: 8px; 
    padding: 1rem; 
    display: flex; 
    justify-content: space-between; 
    align-items: center; 
    cursor: pointer; 
  }
  
  .stack-item:hover { 
    background: rgba(168, 85, 247, 0.25); 
  }
  
  .stack-name { 
    color: #a855f7; 
    font-weight: 600; 
  }
  
  .stack-info { 
    color: #c084fc; 
    font-size: 0.9rem; 
  }
  
  .stack-contents { 
    margin-top: 1rem; 
    padding-left: 1rem; 
    border-left: 2px solid rgba(168, 85, 247, 0.3);
    display: flex;
    flex-direction: column;
    gap: 1rem;
  }
  
  .stack-controls {
    display: flex;
    align-items: center;
    gap: 0.5rem;
  }
  
  .expand-btn {
    background: none;
    border: none;
    cursor: pointer;
    color: #a855f7;
    font-size: 1rem;
    padding: 0.25rem;
    display: flex;
    align-items: center;
    justify-content: center;
    transition: transform 0.2s ease;
  }
  
  .expand-btn:hover {
    color: #8b5cf6;
    transform: scale(1.1);
  }
  
  .expand-icon {
    transition: transform 0.2s ease;
  }
  
  .cards-list {
    display: flex;
    flex-direction: column;
    gap: 0.5rem;
  }
  
  .add-btn { 
    width: 30px; 
    height: 30px; 
    border-radius: 50%; 
    background: rgba(168, 85, 247, 0.2); 
    border: 1px solid rgba(168, 85, 247, 0.4); 
    color: #a855f7; 
    cursor: pointer; 
    font-weight: bold;
  }

  .add-btn:hover { 
    background: rgba(168, 85, 247, 0.4); 
    color: white;
  }
</style>