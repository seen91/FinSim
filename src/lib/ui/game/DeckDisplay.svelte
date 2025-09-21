<script lang="ts">
  import type { Deck } from '$lib/core/types';
  import { createEventDispatcher } from 'svelte';
  import CardMiniDisplay from '../components/CardMiniDisplay.svelte';
  import StackDisplay from '../components/StackDisplay.svelte';

  export let deck: Deck;
  let expanded = false;
  const dispatch = createEventDispatcher();

  function toggleExpanded() {
    expanded = !expanded;
  }

  function handleAddDeck(e: Event) {
    e.stopPropagation();
    dispatch('addDeck', deck);
  }

  function handleCardAdd(event: CustomEvent) {
    dispatch('addCard', event.detail);
  }

  function handleCardInfo(event: CustomEvent) {
    dispatch('cardInfo', event.detail);
  }

  function handleStackAdd(event: CustomEvent) {
    // When a stack is added from within a deck, we dispatch it as adding the whole deck
    // The deck addition logic will handle creating the proper stacks
    dispatch('addDeck', deck);
  }

  // Calculate total number of cards (individual cards + cards in stacks)
  $: totalCards = deck.cards.length + (deck.stacks ? deck.stacks.reduce((sum, stack) => sum + stack.cards.length, 0) : 0);
</script>

<div class="deck-container">
  <div class="deck-item" on:click={toggleExpanded} on:keydown role="button" tabindex="0">
    <div class="deck-name">{deck.name} - {totalCards} cards</div>
    <button class="add-btn" on:click={handleAddDeck} title="Add entire deck">+</button>
  </div>
  
  {#if expanded}
    <div class="deck-contents">
      <!-- Show pre-defined stacks using StackDisplay component -->
      {#if deck.stacks}
        {#each deck.stacks as stack, index}
          <StackDisplay 
            {stack}
            title={deck.name}
            on:addStack={handleStackAdd}
            on:addCard={handleCardAdd}
            on:cardInfo={handleCardInfo}
          />
        {/each}
      {/if}
      
      <!-- Show individual cards -->
      {#each deck.cards as card}
        <CardMiniDisplay 
          {card} 
          on:add={handleCardAdd}
          on:info={handleCardInfo}
        />
      {/each}
    </div>
  {/if}
</div>

<style>
  .deck-container { 
    margin-bottom: 1rem; 
  }
  
  .deck-item { 
    background: rgba(59, 130, 246, 0.1); 
    border: 1px solid rgba(255, 255, 255, 0.1); 
    border-radius: 8px; 
    padding: 1rem; 
    display: flex; 
    justify-content: space-between; 
    align-items: center; 
    cursor: pointer; 
  }
  
  .deck-item:hover { 
    background: rgba(59, 130, 246, 0.15); 
  }
  
  .deck-name { 
    color: white; 
    font-weight: 600; 
  }
  
  .deck-contents {
    padding: 0.75rem;
    border-top: 1px solid #e5e7eb;
    max-height: 200px;
    overflow-y: auto;
    display: flex;
    flex-direction: column;
    gap: 0.5rem;
  }
  
  .add-btn { 
    width: 30px; 
    height: 30px; 
    border-radius: 50%; 
    background: rgba(120, 119, 198, 0.2); 
    border: 1px solid rgba(120, 119, 198, 0.4); 
    color: white; 
    cursor: pointer; 
  }
  
  .add-btn:hover { 
    background: rgba(120, 119, 198, 0.4); 
  }
</style>
