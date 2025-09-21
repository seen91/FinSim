<script lang="ts">
  import type { Deck, FinancialCard } from '$lib/core/types';
  import DeckDisplay from './DeckDisplay.svelte';
  import CardMiniDisplay from '$lib/ui/components/CardMiniDisplay.svelte';
  import { createEventDispatcher } from 'svelte';

  export let decks: Deck[] = [];
  export let individualCards: FinancialCard[] = [];
  
  const dispatch = createEventDispatcher();
  
  function handleDeckAdd(event: CustomEvent<Deck>) {
    dispatch('addDeck', event.detail);
  }
  
  function handleCardAdd(event: CustomEvent<FinancialCard>) {
    dispatch('addCard', event.detail);
  }
  
  function handleCardInfo(event: CustomEvent<FinancialCard>) {
    dispatch('showCardInfo', event.detail);
  }
</script>

<aside class="sidebar">
  <div class="available-section">
    <h3 class="section-title">Available Decks</h3>
    {#each decks as deck}
      <DeckDisplay 
        {deck} 
        on:addDeck={handleDeckAdd}
        on:addCard={handleCardAdd}
        on:cardInfo={handleCardInfo}
      />
    {/each}
  </div>
  
  <div class="available-section">
    <h3 class="section-title">Individual Cards</h3>
    <div class="individual-cards">
      {#each individualCards.filter(card => card != null) as card}
        <CardMiniDisplay 
          {card} 
          on:add={handleCardAdd}
          on:info={handleCardInfo}
        />
      {/each}
    </div>
  </div>
</aside>

<style>
  .sidebar {
    width: 320px;
    background: rgba(15, 15, 20, 0.95);
    border-right: 1px solid rgba(255, 255, 255, 0.1);
    padding: 1.5rem;
    overflow-y: auto;
    display: flex;
    flex-direction: column;
    gap: 2rem;
  }
  
  .available-section {
    background: rgba(25, 25, 35, 0.5);
    border-radius: 12px;
    padding: 1rem;
  }
  
  .section-title {
    font-size: 0.9rem;
    font-weight: 600;
    color: #999;
    text-transform: uppercase;
    letter-spacing: 1px;
    margin-bottom: 1rem;
  }
  
  .individual-cards {
    display: flex;
    flex-direction: column;
    gap: 0.75rem;
  }
</style>
