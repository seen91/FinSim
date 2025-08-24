<script lang="ts">
  import { onMount } from 'svelte';
  import type { FinancialCard } from '$lib/core/types';
  import { getVisibleCards, calculateResponsiveMaxCards, calculateCardArcStyle } from '$lib/services/ui-helpers';
  import GameCard from './GameCard.svelte';
  import Button from '../components/Button.svelte';
  import { createEventDispatcher } from 'svelte';

  export let cards: FinancialCard[] = [];
  export let activeCardIds: Set<string> = new Set();

  const dispatch = createEventDispatcher();

  let currentIndex = 0;
  let innerWidth = 0;

  $: responsiveMaxCards = calculateResponsiveMaxCards(innerWidth);
  $: visibleCards = getVisibleCards(cards, currentIndex, responsiveMaxCards);
  $: canScrollLeft = currentIndex > 0;
  $: canScrollRight = currentIndex + responsiveMaxCards < cards.length;

  function scrollLeft() {
    if (canScrollLeft) {
      currentIndex = Math.max(0, currentIndex - 1);
    }
  }

  function scrollRight() {
    if (canScrollRight) {
      currentIndex = Math.min(cards.length - responsiveMaxCards, currentIndex + 1);
    }
  }

  function handleCardToggle(event: CustomEvent<FinancialCard>) {
    dispatch('toggle', event.detail);
  }

  function handleCardInfo(event: CustomEvent<FinancialCard>) {
    dispatch('info', event.detail);
  }

  function handleCardRemove(event: CustomEvent<FinancialCard>) {
    dispatch('remove', event.detail);
  }

  function handleKeydown(event: KeyboardEvent) {
    if (event.key === 'ArrowLeft') {
      event.preventDefault();
      scrollLeft();
    } else if (event.key === 'ArrowRight') {
      event.preventDefault();
      scrollRight();
    }
  }

  onMount(() => {
    if (cards.length > responsiveMaxCards) {
      currentIndex = Math.max(0, cards.length - responsiveMaxCards);
    }
  });

  $: {
    if (cards.length <= responsiveMaxCards) {
      currentIndex = 0;
    } else if (currentIndex >= cards.length - responsiveMaxCards + 1) {
      currentIndex = Math.max(0, cards.length - responsiveMaxCards);
    }
  }
</script>

<svelte:window on:keydown={handleKeydown} bind:innerWidth />

<div class="circular-hand">
  {#if cards.length > responsiveMaxCards}
    <Button
      variant="secondary"
      size="medium"
      onClick={scrollLeft}
      disabled={!canScrollLeft}
      ariaLabel="Show previous cards"
      class="nav-btn nav-btn-left"
    >
      ‹
    </Button>
    
    <Button
      variant="secondary"
      size="medium"
      onClick={scrollRight}
      disabled={!canScrollRight}
      ariaLabel="Show next cards"
      class="nav-btn nav-btn-right"
    >
      ›
    </Button>
  {/if}

  <div class="cards-container" class:empty={visibleCards.length === 0}>
    {#if visibleCards.length === 0}
      <div class="empty-hand">
        <div class="empty-icon">🎴</div>
        <p>Your hand is empty</p>
        <small>Add cards from the decks on the left</small>
      </div>
    {:else}
      {#each visibleCards as card, index (card.id)}
        <div 
          class="card-position" 
          style={calculateCardArcStyle(index, visibleCards.length)}
        >
          <GameCard 
            {card}
            isActive={activeCardIds.has(card.id)} 
            showRemoveButton={true}
            on:toggle={handleCardToggle}
            on:info={handleCardInfo}
            on:remove={handleCardRemove}
          />
        </div>
      {/each}
    {/if}
  </div>
</div>

<style>
  .circular-hand {
    position: relative;
    width: 100%;
    height: 100%;
    display: flex;
    align-items: center;
    justify-content: center;
    overflow: visible;
    min-height: 280px;
  }

  .cards-container {
    position: relative;
    width: 100%;
    height: 100%;
    display: flex;
    align-items: flex-end;
    justify-content: center;
    perspective: 1000px;
  }

  .cards-container.empty {
    align-items: center;
  }

  .card-position {
    position: absolute;
    bottom: 60px;
    left: 50%;
    transform-origin: center bottom;
    pointer-events: auto;
  }

  .empty-hand {
    text-align: center;
    color: #666;
    user-select: none;
  }

  .empty-icon {
    font-size: 3rem;
    margin-bottom: 1rem;
    opacity: 0.5;
  }

  .empty-hand p {
    font-size: 1.2rem;
    margin: 0 0 0.5rem 0;
    color: #888;
  }

  .empty-hand small {
    font-size: 0.9rem;
    color: #666;
  }

  :global(.circular-hand .nav-btn) {
    position: absolute;
    top: 50%;
    transform: translateY(-50%);
    width: 50px !important;
    height: 50px !important;
    border-radius: 50% !important;
    z-index: 100;
    backdrop-filter: blur(10px);
    font-size: 1.5rem !important;
  }

  :global(.circular-hand .nav-btn:hover:not(:disabled)) {
    transform: translateY(-50%) scale(1.1) !important;
  }

  :global(.circular-hand .nav-btn:disabled) {
    opacity: 0.3;
    transform: translateY(-50%) scale(0.9) !important;
  }

  :global(.circular-hand .nav-btn-left) {
    left: 20px;
  }

  :global(.circular-hand .nav-btn-right) {
    right: 20px;
  }

  @media (max-width: 768px) {
    .circular-hand {
      min-height: 240px;
    }

    :global(.circular-hand .nav-btn) {
      width: 40px !important;
      height: 40px !important;
      font-size: 1.2rem !important;
    }

    :global(.circular-hand .nav-btn-left) {
      left: 10px;
    }

    :global(.circular-hand .nav-btn-right) {
      right: 10px;
    }

    .card-position {
      bottom: 40px;
    }
  }

  @media (max-width: 480px) {
    :global(.circular-hand .nav-btn) {
      width: 35px !important;
      height: 35px !important;
      font-size: 1rem !important;
    }
  }
</style>
