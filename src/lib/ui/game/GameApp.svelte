<script lang="ts">
  import type { FinancialCard, Deck, CardStack } from '$lib/core/types';
  import { gameState } from '$lib/core/stores';
  import { addCardToHand, addDeckToHand, toggleCard, toggleStack, removeCardFromHand, removeStack, unstackCards, createCardStack } from '$lib/core/stores/game-actions';
  import { allIndividualCards } from '$lib/data';
  import GameSidebar from './GameSidebar.svelte';
  import PlayArea from './PlayArea.svelte';
  import CardDetailModal from '../components/CardDetailModal.svelte';

  let selectedCard: FinancialCard | null = null;
  let selectedStack: CardStack | null = null;
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
  
  function handleToggleStack(event: CustomEvent<CardStack>) {
    toggleStack(event.detail.id);
  }
  
  function handleRemoveCard(event: CustomEvent<FinancialCard>) {
    removeCardFromHand(event.detail.id);
  }
  
  function handleRemoveStack(event: CustomEvent<CardStack>) {
    removeStack(event.detail.id);
  }
  
  function handleUnstack(event: CustomEvent<CardStack>) {
    unstackCards(event.detail.id);
  }
  
  function handleShowCardInfo(event: CustomEvent<FinancialCard>) {
    selectedCard = event.detail;
    selectedStack = null;
    isModalOpen = true;
  }
  
  function handleShowStackInfo(event: CustomEvent<CardStack>) {
    selectedStack = event.detail;
    selectedCard = null;
    isModalOpen = true;
  }
  
  function handleStackCards(event: CustomEvent<{baseCard: FinancialCard, modifierCard: FinancialCard}>) {
    const success = createCardStack(event.detail.baseCard.id, event.detail.modifierCard.id);
    if (!success) {
      console.error('Failed to create stack - cards may not be compatible');
    }
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
    stacks={$gameState.cardStacks}
    activeCardIds={$gameState.activeCardIds}
    activeStackIds={$gameState.activeStackIds}
    on:toggleCard={handleToggleCard}
    on:toggleStack={handleToggleStack}
    on:removeCard={handleRemoveCard}
    on:removeStack={handleRemoveStack}
    on:unstack={handleUnstack}
    on:showCardInfo={handleShowCardInfo}
    on:showStackInfo={handleShowStackInfo}
    on:stackCards={handleStackCards}
  />
</div>

<CardDetailModal bind:isOpen={isModalOpen} card={selectedCard} stack={selectedStack} />

<style>
  :global(body) {
    margin: 0;
    padding: 0;
    font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
    background: #0a0a0a;
    color: #fff;
    overflow: hidden;
  }
  
  :global(html) {
    margin: 0;
    padding: 0;
    overflow: hidden;
  }
  
  .game-container {
    display: flex;
    height: 100vh;
    position: relative;
    background: radial-gradient(ellipse at center, rgba(20, 20, 30, 0.9) 0%, rgba(10, 10, 10, 1) 100%);
  }
</style>
