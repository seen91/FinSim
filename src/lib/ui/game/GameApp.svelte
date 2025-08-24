<script lang="ts">
  import type { FinancialCard, Deck } from '$lib/core/types';
  import { gameState, addCardToHand, addDeckToHand, toggleCard, removeCardFromHand } from '$lib/core/stores';
  import { allIndividualCards } from '$lib/data';
  import GameSidebar from './GameSidebar.svelte';
  import PlayArea from './PlayArea.svelte';
  import CardDetailModal from '../components/CardDetailModal.svelte';

  let selectedCard: FinancialCard | null = null;
  let isModalOpen = false;
  
  function handleAddCard(event: CustomEvent<FinancialCard>) {
    addCardToHand(event.detail);
  }
  
  function handleAddDeck(event: CustomEvent<Deck>) {
    addDeckToHand(event.detail);
  }
  
  function handleToggleCard(event: CustomEvent<FinancialCard>) {
    toggleCard(event.detail.id);
  }
  
  function handleRemoveCard(event: CustomEvent<FinancialCard>) {
    removeCardFromHand(event.detail.id);
  }
  
  function handleShowCardInfo(event: CustomEvent<FinancialCard>) {
    selectedCard = event.detail;
    isModalOpen = true;
  }
</script>

<div class="game-container">
  <GameSidebar
    decks={$gameState.availableDecks}
    individualCards={allIndividualCards}
    on:addCard={handleAddCard}
    on:addDeck={handleAddDeck}
    on:showCardInfo={handleShowCardInfo}
  />
  
  <PlayArea
    cards={$gameState.hand}
    activeCardIds={$gameState.activeCardIds}
    on:toggleCard={handleToggleCard}
    on:removeCard={handleRemoveCard}
    on:showCardInfo={handleShowCardInfo}
  />
</div>

<CardDetailModal bind:isOpen={isModalOpen} card={selectedCard} />

<style>
  :global(body) {
    margin: 0;
    font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
    background: #0a0a0a;
    color: #fff;
  }
  
  .game-container {
    display: flex;
    height: 100vh;
    position: relative;
    background: radial-gradient(ellipse at center, rgba(20, 20, 30, 0.9) 0%, rgba(10, 10, 10, 1) 100%);
  }
</style>
