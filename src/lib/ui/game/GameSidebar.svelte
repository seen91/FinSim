<script lang="ts">
  import type { Deck, FinancialCard } from '$lib/core/types';
  import DeckDisplay from './DeckDisplay.svelte';
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
  
  function handleDirectCardAdd(card: FinancialCard) {
    dispatch('addCard', card);
  }
  
  function handleDirectCardInfo(card: FinancialCard) {
    dispatch('showCardInfo', card);
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
      {#each individualCards as card}
        <div class="card-item">
          <div class="card-mini-inline">
            <div class="card-mini-header">
              <div class="card-mini-header-left">
                <span class="card-mini-icon">{card.type === 'compound' ? '⤴️' : card.type === 'linear' ? '📏' : '🚀'}</span>
                <span class="card-role-icon" 
                      class:base-card={card.role === 'base'}
                      class:modifier-card={card.role === 'modifier'}
                      title={card.role === 'base' ? 'Base card - can have other cards stacked on it' : 'Modifier card - can be stacked on base cards'}>
                  {card.role === 'base' ? '🃏' : '⚡'}
                </span>
                {#if card.detailedInfo}
                  <button 
                    class="info-btn-mini" 
                    on:click={(e) => { e.stopPropagation(); handleDirectCardInfo(card); }}
                    title="View detailed information"
                    aria-label="View card details"
                  >ℹ️</button>
                {/if}
              </div>
              <span class="card-mini-value" 
                    class:positive={(card.parameters.rate ?? 0) > 0 || (card.parameters.monthlyAmount ?? 0) > 0}
                    class:negative={(card.parameters.rate ?? 0) < 0 || (card.parameters.monthlyAmount ?? 0) < 0}>
                {card.parameters.rate ? `${card.parameters.rate > 0 ? '+' : ''}${card.parameters.rate}%` : 
                 card.parameters.monthlyAmount ? `${card.parameters.monthlyAmount > 0 ? '+' : ''}${(card.parameters.monthlyAmount / 1000).toFixed(1)}k/mo` : ''}
              </span>
            </div>
            <div class="card-mini-name">{card.name}</div>
          </div>
          <button class="add-btn" on:click={() => handleDirectCardAdd(card)} title="Add this card">+</button>
        </div>
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
  
  .card-item {
    display: flex;
    align-items: center;
    gap: 0.75rem;
  }
  
  .card-mini-inline {
    flex: 1;
    background: rgba(40, 40, 50, 0.4);
    border: 1px solid rgba(255, 255, 255, 0.1);
    border-radius: 8px;
    padding: 0.75rem;
    transition: all 0.2s ease;
    color: white;
  }
  
  .card-item:hover .card-mini-inline {
    background: rgba(50, 50, 60, 0.6);
    border-color: rgba(120, 119, 198, 0.3);
  }
  
  .card-mini-header {
    display: flex;
    justify-content: space-between;
    align-items: center;
    margin-bottom: 0.5rem;
  }
  
  .card-mini-header-left {
    display: flex;
    align-items: center;
    gap: 0.5rem;
  }
  
  .card-mini-icon {
    font-size: 0.8rem;
  }

  .card-role-icon {
    font-size: 0.8rem;
    text-shadow: 0 1px 2px rgba(0, 0, 0, 0.5);
  }

  .card-role-icon.base-card {
    color: #60a5fa;
  }

  .card-role-icon.modifier-card {
    color: #fbbf24;
    animation: pulse-glow 2s ease-in-out infinite alternate;
  }

  @keyframes pulse-glow {
    0% { 
      color: #fbbf24; 
      filter: drop-shadow(0 0 1px rgba(251, 191, 36, 0.5));
    }
    100% { 
      color: #f59e0b; 
      filter: drop-shadow(0 0 2px rgba(245, 158, 11, 0.7));
    }
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
