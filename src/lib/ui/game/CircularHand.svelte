<script lang="ts">
  import { onMount } from 'svelte';
  import type { FinancialCard } from '$lib/core/types';
  import { getVisibleCards, calculateResponsiveMaxCards, calculateCardArcStyle, calculateStackCardStyle } from '$lib/services/ui-helpers';
  import GameCard from './GameCard.svelte';
  import { createEventDispatcher } from 'svelte';

  export let cards: FinancialCard[] = [];
  export let activeCardIds: Set<string> = new Set();

  const dispatch = createEventDispatcher();

  let currentIndex = 0;
  let innerWidth = 0;
  let handContainer: HTMLElement;
  
  // Touch/swipe handling
  let touchStartX = 0;
  let touchStartY = 0;
  let isSwiping = false;

  $: responsiveMaxCards = calculateResponsiveMaxCards(innerWidth);
  $: visibleCards = getVisibleCards(cards, currentIndex, responsiveMaxCards);
  $: canScrollLeft = currentIndex > 0;
  $: canScrollRight = currentIndex + responsiveMaxCards < cards.length;
  
  // Get preview cards for left and right stacks
  $: leftPreviewCards = currentIndex > 0 ? cards.slice(Math.max(0, currentIndex - 2), currentIndex) : [];
  $: rightPreviewCards = canScrollRight ? cards.slice(currentIndex + responsiveMaxCards, Math.min(cards.length, currentIndex + responsiveMaxCards + 2)) : [];

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

  // Mouse wheel scrolling
  function handleWheel(event: WheelEvent) {
    if (cards.length <= responsiveMaxCards) return;
    
    event.preventDefault();
    const delta = event.deltaY || event.deltaX;
    
    if (delta > 0) {
      scrollRight();
    } else if (delta < 0) {
      scrollLeft();
    }
  }

  // Touch/swipe handling
  function handleTouchStart(event: TouchEvent) {
    if (cards.length <= responsiveMaxCards) return;
    
    const touch = event.touches[0];
    touchStartX = touch.clientX;
    touchStartY = touch.clientY;
    isSwiping = false;
  }

  function handleTouchMove(event: TouchEvent) {
    if (cards.length <= responsiveMaxCards) return;
    
    const touch = event.touches[0];
    const deltaX = touch.clientX - touchStartX;
    const deltaY = touch.clientY - touchStartY;
    
    // Only consider horizontal swipes (more horizontal than vertical movement)
    if (Math.abs(deltaX) > Math.abs(deltaY) && Math.abs(deltaX) > 10) {
      isSwiping = true;
      event.preventDefault(); // Prevent scrolling
    }
  }

  function handleTouchEnd(event: TouchEvent) {
    if (cards.length <= responsiveMaxCards || !isSwiping) return;
    
    const touch = event.changedTouches[0];
    const deltaX = touch.clientX - touchStartX;
    const swipeThreshold = 50; // Minimum distance for a swipe
    
    if (Math.abs(deltaX) > swipeThreshold) {
      if (deltaX > 0) {
        scrollLeft(); // Swiped right, show previous cards
      } else {
        scrollRight(); // Swiped left, show next cards
      }
    }
    
    isSwiping = false;
  }

  // Handle keyboard navigation for card stacks
  function handleStackKeydown(event: KeyboardEvent, direction: 'left' | 'right') {
    if (event.key === 'Enter' || event.key === ' ') {
      event.preventDefault();
      if (direction === 'left') {
        scrollLeft();
      } else {
        scrollRight();
      }
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

<div 
  class="circular-hand"
  bind:this={handContainer}
  on:wheel={handleWheel}
  on:touchstart={handleTouchStart}
  on:touchmove={handleTouchMove}
  on:touchend={handleTouchEnd}
  role="application"
  aria-label="Card hand - use arrow keys, mouse wheel, or swipe to navigate"
>
  <div class="cards-container" class:empty={visibleCards.length === 0}>
    <!-- Left stack preview cards -->
    {#if leftPreviewCards.length > 0}
      {#each leftPreviewCards as card, index (card.id)}
        <div 
          class="card-position stack-card-preview left-preview" 
          style={calculateStackCardStyle(index, leftPreviewCards.length, 'left', -250)}
          on:click={scrollLeft}
          on:keydown={(event) => handleStackKeydown(event, 'left')}
          role="button"
          tabindex="0"
          aria-label="Show previous cards"
        >
          <GameCard 
            {card}
            isActive={false}
            showRemoveButton={false}
            showInfoButton={false}
          />
        </div>
      {/each}
    {/if}

    <!-- Right stack preview cards -->
    {#if rightPreviewCards.length > 0}
      {#each rightPreviewCards as card, index (card.id)}
        <div 
          class="card-position stack-card-preview right-preview" 
          style={calculateStackCardStyle(index, rightPreviewCards.length, 'right', 250)}
          on:click={scrollRight}
          on:keydown={(event) => handleStackKeydown(event, 'right')}
          role="button"
          tabindex="0"
          aria-label="Show next cards"
        >
          <GameCard 
            {card}
            isActive={false}
            showRemoveButton={false}
            showInfoButton={false}
          />
        </div>
      {/each}
    {/if}

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
    flex-direction: column;
    align-items: center;
    justify-content: center;
    overflow: visible;
    min-height: 180px;
    outline: none; /* Remove focus outline since we handle it visually */
  }

  .circular-hand:focus-within {
    /* Subtle visual feedback when focused for keyboard navigation */
    filter: brightness(1.05);
  }

  .cards-container {
    position: relative;
    width: 100%;
    height: 100%;
    display: flex;
    align-items: flex-end;
    justify-content: center;
    perspective: 1000px;
    flex: 1;
  }

  .cards-container.empty {
    align-items: center;
  }

  .card-position {
    position: absolute;
    bottom: 20px;
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

  .stack-card-preview {
    pointer-events: auto;
    cursor: pointer;
  }

  .stack-card-preview:hover {
    filter: brightness(1.1);
  }

  .stack-card-preview:focus {
    outline: 2px solid rgba(120, 119, 198, 0.6);
    outline-offset: 2px;
  }

  /* Dim the preview cards to show they're not active */
  .stack-card-preview :global(.game-card) {
    filter: brightness(0.7) saturate(0.8);
    border-color: rgba(255, 255, 255, 0.1);
  }

  .stack-card-preview:hover :global(.game-card) {
    filter: brightness(0.9) saturate(1);
    border-color: rgba(255, 255, 255, 0.2);
  }

  @media (max-width: 768px) {
    .circular-hand {
      min-height: 140px;
    }

    .card-position {
      bottom: 10px;
    }
  }

  @media (max-width: 480px) {
  }
</style>
