<script lang="ts">
  import { onMount } from 'svelte';
  import type { FinancialCard } from '$lib/types';
  import Card from './Card.svelte';
  import { createEventDispatcher } from 'svelte';

  export let cards: FinancialCard[] = [];
  export let activeCardIds: Set<string> = new Set();
  export let maxVisibleCards: number = 7; // Odd number for better centering

  const dispatch = createEventDispatcher();

  let currentIndex = 0;
  let handContainer: HTMLElement;
  let innerWidth = 0;

  // Adjust max visible cards based on screen size
  $: responsiveMaxCards = innerWidth < 480 ? 3 : 
                         innerWidth < 768 ? 5 : 
                         maxVisibleCards;

  // Calculate visible cards based on current index
  $: visibleCards = getVisibleCards(cards, currentIndex, responsiveMaxCards);
  $: canScrollLeft = currentIndex > 0;
  $: canScrollRight = currentIndex + responsiveMaxCards < cards.length;

  function getVisibleCards(allCards: FinancialCard[], index: number, maxVisible: number) {
    if (allCards.length === 0) return [];
    
    const startIndex = Math.max(0, Math.min(index, allCards.length - maxVisible));
    const endIndex = Math.min(startIndex + maxVisible, allCards.length);
    
    return allCards.slice(startIndex, endIndex);
  }

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

  function handleCardDetails(event: CustomEvent<FinancialCard>) {
    dispatch('showDetails', event.detail);
  }

  function getCardStyle(index: number, totalVisible: number): string {
    const centerIndex = Math.floor(totalVisible / 2);
    const relativeIndex = index - centerIndex;
    
    // Arc parameters
    const arcRadius = 300; // Distance from center
    const maxAngle = 45; // Maximum angle spread (degrees)
    const angleStep = totalVisible > 1 ? (maxAngle * 2) / (totalVisible - 1) : 0;
    const angle = relativeIndex * angleStep;
    
    // Calculate position
    const angleRad = (angle * Math.PI) / 180;
    const x = Math.sin(angleRad) * arcRadius;
    const y = Math.cos(angleRad) * arcRadius - arcRadius; // Offset to bring cards down
    
    // Calculate scale and z-index (center card is largest)
    const distanceFromCenter = Math.abs(relativeIndex);
    const scale = 1 - (distanceFromCenter * 0.15); // Scale down cards further from center
    const zIndex = totalVisible - distanceFromCenter;
    
    // Calculate rotation for the arc effect
    const rotation = angle * 0.7; // Subtle rotation following the arc
    
    return `
      transform: translate(${x}px, ${y}px) scale(${scale}) rotate(${rotation}deg);
      z-index: ${zIndex};
      transition: all 0.4s cubic-bezier(0.4, 0, 0.2, 1);
    `;
  }

  // Handle keyboard navigation
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
    // Auto-scroll to show newer cards (assuming cards are added to the end)
    if (cards.length > responsiveMaxCards) {
      currentIndex = Math.max(0, cards.length - responsiveMaxCards);
    }
  });

  // Reset scroll position when cards change significantly
  $: {
    if (cards.length <= responsiveMaxCards) {
      currentIndex = 0;
    } else if (currentIndex >= cards.length - responsiveMaxCards + 1) {
      currentIndex = Math.max(0, cards.length - responsiveMaxCards);
    }
  }
</script>

<svelte:window on:keydown={handleKeydown} bind:innerWidth />

<div class="circular-hand" bind:this={handContainer}>
  <!-- Navigation buttons -->
  {#if cards.length > responsiveMaxCards}
    <button 
      class="nav-btn nav-btn-left" 
      class:disabled={!canScrollLeft}
      on:click={scrollLeft}
      disabled={!canScrollLeft}
      aria-label="Show previous cards"
    >
      ‹
    </button>
    
    <button 
      class="nav-btn nav-btn-right" 
      class:disabled={!canScrollRight}
      on:click={scrollRight}
      disabled={!canScrollRight}
      aria-label="Show next cards"
    >
      ›
    </button>
  {/if}

  <!-- Cards container -->
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
          style={getCardStyle(index, visibleCards.length)}
        >
          <Card 
            {card} 
            isActive={activeCardIds.has(card.id)} 
            on:showDetails={handleCardDetails}
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
    bottom: 60px; /* Offset from bottom */
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

  /* Navigation buttons */
  .nav-btn {
    position: absolute;
    top: 50%;
    transform: translateY(-50%);
    width: 50px;
    height: 50px;
    border-radius: 50%;
    background: rgba(120, 119, 198, 0.2);
    border: 2px solid rgba(120, 119, 198, 0.4);
    color: white;
    font-size: 1.5rem;
    cursor: pointer;
    transition: all 0.3s ease;
    display: flex;
    align-items: center;
    justify-content: center;
    z-index: 100;
    backdrop-filter: blur(10px);
  }

  .nav-btn:hover:not(.disabled) {
    background: rgba(120, 119, 198, 0.4);
    border-color: rgba(120, 119, 198, 0.6);
    transform: translateY(-50%) scale(1.1);
    box-shadow: 0 0 20px rgba(120, 119, 198, 0.3);
  }

  .nav-btn.disabled {
    opacity: 0.3;
    cursor: not-allowed;
    transform: translateY(-50%) scale(0.9);
  }

  .nav-btn-left {
    left: 20px;
  }

  .nav-btn-right {
    right: 20px;
  }

  /* Responsive adjustments */
  @media (max-width: 768px) {
    .circular-hand {
      min-height: 240px;
    }

    .nav-btn {
      width: 40px;
      height: 40px;
      font-size: 1.2rem;
    }

    .nav-btn-left {
      left: 10px;
    }

    .nav-btn-right {
      right: 10px;
    }

    .card-position {
      bottom: 40px;
    }
  }

  @media (max-width: 480px) {
    .nav-btn {
      width: 35px;
      height: 35px;
      font-size: 1rem;
    }
  }
</style>