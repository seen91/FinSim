<script lang="ts">
  import type { Deck } from '$lib/core/types';
  import { createEventDispatcher } from 'svelte';
  import { formatCardValue, getCardIcon } from '$lib/services/card-formatter';

  export let deck: Deck;
  
  let expanded = false;
  const dispatch = createEventDispatcher();
  
  // Group cards by base cards and their stackable modifiers
  $: groupedCards = groupCardsByStacking(deck.cards);
  
  function groupCardsByStacking(cards: any[]) {
    const baseCards = cards.filter(card => card.role === 'base');
    const modifierCards = cards.filter(card => card.role === 'modifier');
    
    return baseCards.map(baseCard => {
      // Find modifiers that are compatible with this base card
      const compatibleModifiers = modifierCards.filter(modifier => {
        if (!modifier.compatibleWith || !baseCard.stackCategory) return false;
        return modifier.compatibleWith.includes(baseCard.stackCategory);
      });
      
      return {
        baseCard,
        modifiers: compatibleModifiers
      };
    });
  }
  
  function toggleExpanded() {
    expanded = !expanded;
  }
  
  function handleAddDeck(e: Event) {
    e.stopPropagation();
    dispatch('addDeck', deck);
  }
  
  function handleCardAdd(e: Event, card: any) {
    e.stopPropagation();
    dispatch('addCard', card);
  }
  
  function handleCardInfo(e: Event, card: any) {
    e.stopPropagation();
    dispatch('cardInfo', card);
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
      {#each groupedCards as group}
        <!-- Base Card or Stacked Card Group -->
        <div class="card-group">
          {#if group.modifiers.length > 0}
            <!-- Stacked Card Representation -->
            <div class="card-item stacked-card-item">
              <div class="card-mini stacked-card-mini">
                <!-- Base card layer -->
                <div class="card-layer base-layer"></div>
                <!-- Modifier layers with purple overlay -->
                {#each group.modifiers as _, index}
                  <div 
                    class="card-layer modifier-layer"
                    style="transform: translateY(-{2 + (index * 1)}px) translateX({index * 1}px);">
                  </div>
                {/each}
                <!-- Top overlay with combined information -->
                <div class="stack-overlay-mini">
                  <div class="card-mini-header">
                    <div class="card-mini-header-left">
                      <span class="card-mini-icon">{getCardIcon(group.baseCard.type)}</span>
                      <span class="card-mini-type">{group.baseCard.type}</span>
                      <span class="stacked-badge">STACKED ({group.modifiers.length + 1})</span>
                      {#if group.baseCard.detailedInfo}
                        <button 
                          class="info-btn-mini" 
                          on:click={(e) => handleCardInfo(e, group.baseCard)}
                          title="View detailed information"
                          aria-label="View card details"
                        >ℹ️</button>
                      {/if}
                    </div>
                    <span class="card-mini-value" 
                          class:positive={(group.baseCard.parameters.rate ?? 0) > 0 || (group.baseCard.parameters.monthlyAmount ?? 0) > 0}
                          class:negative={(group.baseCard.parameters.rate ?? 0) < 0 || (group.baseCard.parameters.monthlyAmount ?? 0) < 0}>
                      {formatCardValue(group.baseCard)}
                      <span class="modifier-count">+ {group.modifiers.length} effects</span>
                    </span>
                  </div>
                  <div class="card-mini-name">{group.baseCard.name}</div>
                  {#if group.modifiers.length > 0}
                    <div class="modifier-effects">
                      {#each group.modifiers as modifier}
                        {#if modifier.stackEffects && modifier.stackEffects[0]}
                          <span class="effect-item">{modifier.stackEffects[0].description}</span>
                        {/if}
                      {/each}
                    </div>
                  {/if}
                </div>
              </div>
              <button class="add-btn" on:click={(e) => handleCardAdd(e, group.baseCard)} title="Add stacked cards">+</button>
            </div>
          {:else}
            <!-- Single Base Card -->
            <div class="card-item base-card-item">
              <div class="card-mini">
                <div class="card-mini-header">
                  <div class="card-mini-header-left">
                    <span class="card-mini-icon">{getCardIcon(group.baseCard.type)}</span>
                    <span class="card-mini-type">{group.baseCard.type}</span>
                    <span class="base-card-badge">BASE</span>
                    {#if group.baseCard.detailedInfo}
                      <button 
                        class="info-btn-mini" 
                        on:click={(e) => handleCardInfo(e, group.baseCard)}
                        title="View detailed information"
                        aria-label="View card details"
                      >ℹ️</button>
                    {/if}
                  </div>
                  <span class="card-mini-value" 
                        class:positive={(group.baseCard.parameters.rate ?? 0) > 0 || (group.baseCard.parameters.monthlyAmount ?? 0) > 0}
                        class:negative={(group.baseCard.parameters.rate ?? 0) < 0 || (group.baseCard.parameters.monthlyAmount ?? 0) < 0}>
                    {formatCardValue(group.baseCard)}
                  </span>
                </div>
                <div class="card-mini-name">{group.baseCard.name}</div>
              </div>
              <button class="add-btn" on:click={(e) => handleCardAdd(e, group.baseCard)} title="Add this card">+</button>
            </div>
          {/if}
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
  
  .card-group {
    margin-bottom: 1.5rem;
  }
  
  .card-group:last-child {
    margin-bottom: 0;
  }
  
  .card-item {
    display: flex;
    align-items: center;
    gap: 0.75rem;
    margin-bottom: 0.75rem;
    position: relative;
  }

  .card-item.base-card-item {
    margin-bottom: 0.75rem;
  }

  .card-item.stacked-card-item {
    margin-bottom: 1rem;
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
    position: relative;
  }

  .card-mini.stacked-card-mini {
    background: none;
    border: none;
    padding: 0;
    min-height: 90px;
  }

  .card-layer {
    position: absolute;
    top: 0;
    left: 0;
    right: 0;
    bottom: 0;
    border-radius: 8px;
    border: 2px solid;
  }

  .card-layer.base-layer {
    border-color: #8B5CF6;
    background: linear-gradient(135deg, rgba(139, 92, 246, 0.1), rgba(139, 92, 246, 0.05));
  }

  .card-layer.modifier-layer {
    border-color: rgba(139, 92, 246, 0.7);
    background: linear-gradient(135deg, rgba(139, 92, 246, 0.15), rgba(139, 92, 246, 0.08));
    box-shadow: 0 1px 3px rgba(0, 0, 0, 0.1);
  }

  .stack-overlay-mini {
    position: relative;
    z-index: 10;
    padding: 0.75rem;
    background: linear-gradient(135deg, 
      rgba(139, 92, 246, 0.9) 0%, 
      rgba(124, 58, 237, 0.85) 50%, 
      rgba(109, 40, 217, 0.9) 100%);
    border-radius: 8px;
    color: white;
    min-height: 80px;
    display: flex;
    flex-direction: column;
    justify-content: space-between;
  }
  
  .card-item:hover .card-mini {
    background: rgba(50, 50, 60, 0.6);
    border-color: rgba(120, 119, 198, 0.3);
  }
  
  .base-card-badge, .stacked-badge {
    font-size: 0.5rem;
    padding: 0.1rem 0.3rem;
    border-radius: 3px;
    font-weight: 600;
    letter-spacing: 0.5px;
  }
  
  .base-card-badge {
    background: rgba(59, 130, 246, 0.2);
    color: #60a5fa;
    border: 1px solid rgba(59, 130, 246, 0.3);
  }
  
  .stacked-badge {
    background: rgba(139, 92, 246, 0.3);
    color: #c4b5fd;
    border: 1px solid rgba(139, 92, 246, 0.5);
  }
  
  .modifier-count {
    font-size: 0.65rem;
    color: rgba(255, 255, 255, 0.7);
    font-style: italic;
    margin-left: 0.5rem;
  }

  .modifier-effects {
    margin-top: 0.5rem;
    display: flex;
    flex-direction: column;
    gap: 0.25rem;
  }

  .effect-item {
    font-size: 0.65rem;
    color: rgba(255, 255, 255, 0.8);
    background: rgba(0, 0, 0, 0.2);
    padding: 0.2rem 0.4rem;
    border-radius: 4px;
    border-left: 2px solid rgba(139, 92, 246, 0.6);
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
