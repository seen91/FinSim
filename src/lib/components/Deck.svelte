<script lang="ts">
  import type { Deck } from '$lib/types';
  import { addDeckToHand, addCardToHand } from '$lib/stores/gameState';
  import { createEventDispatcher } from 'svelte';
  
  export let deck: Deck;
  
  let expanded = false;
  const dispatch = createEventDispatcher();
  
  function toggleExpanded() {
    expanded = !expanded;
  }
  
  function handleAddDeck(e: Event) {
    e.stopPropagation();
    addDeckToHand(deck);
  }
  
  function handleAddCard(e: Event, card: any) {
    e.stopPropagation();
    addCardToHand(card);
  }
  
  function handleInfoClick(e: Event, card: any) {
    e.stopPropagation();
    dispatch('showDetails', card);
  }

  function formatValue(card: any): string {
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

<div class="deck-container">
  <div class="deck-item" on:click={toggleExpanded} on:keydown role="button" tabindex="0">
    <div class="deck-preview">
      <div class="mini-deck-cards">
        <div class="mini-deck-card"></div>
        <div class="mini-deck-card"></div>
        <div class="mini-deck-card"></div>
      </div>
    </div>
    <div class="deck-details">
      <div class="deck-name">{deck.name}</div>
      <div class="deck-info">{deck.cards.length} cards • {deck.description}</div>
    </div>
    <button class="add-btn" on:click={handleAddDeck} title="Add entire deck">+</button>
  </div>
  
  {#if expanded}
    <div class="deck-contents">
      {#each deck.cards as card}
        <div class="card-item">
          <div class="card-mini">
            <div class="card-mini-header">
              <div class="card-mini-header-left">
                <span class="card-mini-type">{card.type}</span>
                {#if card.detailedInfo}
                  <button 
                    class="info-btn-mini" 
                    on:click={(e) => handleInfoClick(e, card)}
                    title="View detailed information"
                    aria-label="View card details"
                  >ℹ️</button>
                {/if}
              </div>
              <span class="card-mini-value" 
                    class:positive={(card.parameters.rate ?? 0) > 0 || (card.parameters.monthlyAmount ?? 0) > 0}
                    class:negative={(card.parameters.rate ?? 0) < 0 || (card.parameters.monthlyAmount ?? 0) < 0}>
                {formatValue(card)}
              </span>
            </div>
            <div class="card-mini-name">{card.name}</div>
          </div>
          <button class="add-btn" on:click={(e) => handleAddCard(e, card)} title="Add this card">+</button>
        </div>
      {/each}
    </div>
  {/if}
</div>

<style>
  .deck-container {
    margin-bottom: 1rem;
    border: 1px solid rgba(255, 255, 255, 0.05);
    border-radius: 8px;
    overflow: hidden;
    background: rgba(25, 25, 35, 0.5);
  }
  
  .deck-item {
    display: flex;
    align-items: center;
    gap: 0.75rem;
    padding: 0.75rem;
    background: rgba(40, 40, 50, 0.4);
    transition: all 0.2s ease;
    cursor: pointer;
  }
  
  .deck-item:hover {
    background: rgba(50, 50, 60, 0.6);
  }
  
  .deck-preview {
    position: relative;
    width: 40px;
    height: 50px;
  }
  
  .mini-deck-cards {
    position: relative;
    height: 100%;
  }
  
  .mini-deck-card {
    position: absolute;
    width: 30px;
    height: 40px;
    background: linear-gradient(135deg, #2a2a3e, #1a1a2e);
    border: 1px solid rgba(120, 119, 198, 0.3);
    border-radius: 4px;
  }
  
  .mini-deck-card:nth-child(1) { top: 0; left: 0; z-index: 3; }
  .mini-deck-card:nth-child(2) { top: 3px; left: 3px; z-index: 2; }
  .mini-deck-card:nth-child(3) { top: 6px; left: 6px; z-index: 1; }
  
  .deck-details {
    flex: 1;
    color: white;
  }
  
  .deck-name {
    font-weight: 600;
    font-size: 0.9rem;
    margin-bottom: 0.25rem;
  }
  
  .deck-info {
    font-size: 0.75rem;
    color: #888;
  }
  
  .deck-contents {
    background: rgba(20, 20, 30, 0.5);
    padding: 0.75rem;
    border-top: 1px solid rgba(255, 255, 255, 0.05);
  }
  
  .card-item {
    display: flex;
    align-items: center;
    gap: 0.75rem;
    margin-bottom: 0.75rem;
    margin-left: 1rem;
  }
  
  .card-item:last-child {
    margin-bottom: 0;
  }
  
  .card-mini {
    flex: 1;
    background: rgba(40, 40, 50, 0.4);
    border: 1px solid rgba(255, 255, 255, 0.1);
    border-radius: 8px;
    padding: 0.75rem;
    transition: all 0.2s ease;
    color: white;
  }
  
  .card-item:hover .card-mini {
    background: rgba(50, 50, 60, 0.6);
    border-color: rgba(120, 119, 198, 0.3);
  }
  
  .card-mini-header {
    display: flex;
    justify-content: space-between;
    align-items: center;
    margin-bottom: 0.5rem;
  }
  
  .card-mini-header-right {
    display: flex;
    align-items: center;
    gap: 0.5rem;
  }
  
  .card-mini-header-left {
    display: flex;
    align-items: center;
    gap: 0.5rem;
  }
  
  .card-mini-type {
    font-size: 0.65rem;
    color: #888;
    text-transform: uppercase;
    letter-spacing: 1px;
  }
  
  .card-mini-value {
    font-size: 0.75rem;
    font-weight: 600;
  }
  
  .card-mini-value.positive {
    color: #4ade80;
  }
  
  .card-mini-value.negative {
    color: #ef4444;
  }
  
  .card-mini-name {
    font-size: 0.85rem;
    font-weight: 500;
  }
  
  .info-btn-mini {
    width: 20px;
    height: 20px;
    border-radius: 50%;
    background: rgba(255, 255, 255, 0.1);
    border: 1px solid rgba(255, 255, 255, 0.2);
    color: white;
    font-size: 0.65rem;
    cursor: pointer;
    transition: all 0.2s ease;
    display: flex;
    align-items: center;
    justify-content: center;
  }
  
  .info-btn-mini:hover {
    background: rgba(255, 255, 255, 0.2);
    transform: scale(1.1);
  }
  
  .add-btn {
    width: 32px;
    height: 32px;
    border-radius: 50%;
    background: rgba(120, 119, 198, 0.2);
    border: 1px solid rgba(120, 119, 198, 0.4);
    color: white;
    font-size: 1.2rem;
    cursor: pointer;
    transition: all 0.2s ease;
    display: flex;
    align-items: center;
    justify-content: center;
  }
  
  .add-btn:hover {
    background: rgba(120, 119, 198, 0.4);
    transform: scale(1.1);
    box-shadow: 0 0 20px rgba(120, 119, 198, 0.4);
  }
</style>