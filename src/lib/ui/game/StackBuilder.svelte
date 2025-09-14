<script lang="ts">
  import type { FinancialCard } from '$lib/core/types';
  import { createCardStack } from '$lib/core/stores/game-actions';
  import Button from '../components/Button.svelte';
  import { createEventDispatcher } from 'svelte';

  export let availableCards: FinancialCard[] = [];

  const dispatch = createEventDispatcher();

  let selectedBaseCard: FinancialCard | null = null;
  let selectedModifierCard: FinancialCard | null = null;

  function selectBaseCard(card: FinancialCard) {
    if (card.role === 'base' && card.canBeStacked) {
      selectedBaseCard = card;
    }
  }

  function selectModifierCard(card: FinancialCard) {
    if (card.role === 'modifier' && card.canStack) {
      selectedModifierCard = card;
    }
  }

  function tryCreateStack() {
    if (selectedBaseCard && selectedModifierCard) {
      const success = createCardStack(selectedBaseCard.id, selectedModifierCard.id);
      if (success) {
        selectedBaseCard = null;
        selectedModifierCard = null;
        dispatch('stackCreated');
      } else {
        alert('Failed to create stack!');
      }
    }
  }

  function clearSelection() {
    selectedBaseCard = null;
    selectedModifierCard = null;
  }

  $: baseCards = availableCards.filter(card => card.role === 'base' && card.canBeStacked);
  $: modifierCards = availableCards.filter(card => card.role === 'modifier' && card.canStack);
  $: canCreateStack = selectedBaseCard && selectedModifierCard;
</script>

<div class="stack-builder">
  <h3>🏗️ Stack Builder</h3>
  <p>Select a base card and a modifier card to create a stack. Any modifier can be stacked on any base card.</p>
  
  <div class="selection-area">
    <div class="card-group">
      <h4>Base Cards</h4>
      <div class="card-list">
        {#each baseCards as card}
          <button 
            class="card-option" 
            class:selected={selectedBaseCard?.id === card.id}
            on:click={() => selectBaseCard(card)}
          >
            {card.name}
            <small>Base card</small>
          </button>
        {/each}
      </div>
    </div>
    
    <div class="stack-arrow">→</div>
    
    <div class="card-group">
      <h4>Modifier Cards</h4>
      <div class="card-list">
        {#each modifierCards as card}
          <button 
            class="card-option" 
            class:selected={selectedModifierCard?.id === card.id}
            on:click={() => selectModifierCard(card)}
          >
            {card.name}
            <small>Modifier card</small>
          </button>
        {/each}
      </div>
    </div>
  </div>
  
  <div class="actions">
    {#if canCreateStack}
      <Button variant="primary" onClick={tryCreateStack}>
        Create Stack: {selectedBaseCard?.name} + {selectedModifierCard?.name}
      </Button>
    {/if}
    {#if selectedBaseCard || selectedModifierCard}
      <Button variant="secondary" onClick={clearSelection}>
        Clear Selection
      </Button>
    {/if}
  </div>
</div>

<style>
  .stack-builder {
    background: rgba(255, 255, 255, 0.05);
    border: 1px solid rgba(255, 255, 255, 0.1);
    border-radius: 12px;
    padding: 1rem;
    margin: 1rem 0;
    color: white;
  }

  .stack-builder h3 {
    margin: 0 0 0.5rem 0;
    color: #c896ff;
  }

  .stack-builder p {
    margin: 0 0 1rem 0;
    color: #888;
    font-size: 0.9rem;
  }

  .selection-area {
    display: flex;
    gap: 1rem;
    align-items: flex-start;
    margin: 1rem 0;
  }

  .card-group {
    flex: 1;
  }

  .card-group h4 {
    margin: 0 0 0.5rem 0;
    color: #fff;
    font-size: 0.9rem;
  }

  .card-list {
    display: flex;
    flex-direction: column;
    gap: 0.5rem;
  }

  .card-option {
    background: rgba(255, 255, 255, 0.1);
    border: 1px solid rgba(255, 255, 255, 0.2);
    border-radius: 6px;
    padding: 0.5rem;
    color: white;
    cursor: pointer;
    transition: all 0.2s ease;
    text-align: left;
    display: flex;
    flex-direction: column;
    gap: 0.25rem;
  }

  .card-option:hover {
    background: rgba(255, 255, 255, 0.15);
    border-color: rgba(255, 255, 255, 0.3);
  }

  .card-option.selected {
    background: rgba(120, 119, 198, 0.3);
    border-color: rgba(120, 119, 198, 0.5);
  }

  .card-option small {
    color: #888;
    font-size: 0.75rem;
  }

  .stack-arrow {
    align-self: center;
    font-size: 1.5rem;
    color: #888;
    margin: 0 0.5rem;
  }

  .actions {
    display: flex;
    gap: 0.5rem;
    flex-wrap: wrap;
  }

  @media (max-width: 768px) {
    .selection-area {
      flex-direction: column;
    }

    .stack-arrow {
      align-self: center;
      transform: rotate(90deg);
    }
  }
</style>
