<script lang="ts">
  import { gameState } from '$lib/stores/gameState';
  import Card from '$lib/components/Card.svelte';
  import Deck from '$lib/components/Deck.svelte';
  import Chart from '$lib/components/Chart.svelte';
  import { individualCards } from '$lib/utils/sampleData';
</script>

<div class="game-container">
  <!-- Left sidebar with decks -->
  <aside class="deck-area">
    <div class="available-section">
      <h3 class="section-title">Available Decks</h3>
      {#each $gameState.availableDecks as deck}
        <Deck {deck} />
      {/each}
    </div>
    
    <div class="available-section">
      <h3 class="section-title">Individual Cards</h3>
      {#each individualCards as card}
        <div class="card-item">
          <div class="card-mini">
            <div class="card-mini-header">
              <span class="card-mini-type">{card.type}</span>
              <span class="card-mini-value">
                {card.parameters.rate ? `${card.parameters.rate > 0 ? '+' : ''}${card.parameters.rate}%` : ''}
              </span>
            </div>
            <div class="card-mini-name">{card.name}</div>
          </div>
          <button 
            class="add-btn" 
            on:click={() => $gameState.hand = [...$gameState.hand, {...card, id: `${card.id}-${Date.now()}`}]}
            title="Add this card"
          >+</button>
        </div>
      {/each}
    </div>
  </aside>
  
  <!-- Main play area -->
  <main class="play-area">
    <!-- Top bar -->
    <div class="top-bar">
      <h1 class="game-logo">FinSim</h1>
      <div class="game-actions">
        <a href="/workshop" class="action-btn primary">🎴 Card Workshop</a>
      </div>
    </div>
    
    <!-- Battlefield/Chart area -->
    <div class="battlefield">
      <div class="chart-zone">
        <Chart />
      </div>
    </div>
    
    <!-- Hand area -->
    <div class="hand-area">
      <div class="hand-container">
        {#each $gameState.hand as card}
          <Card {card} isActive={$gameState.activeCardIds.has(card.id)} />
        {/each}
      </div>
    </div>
  </main>
</div>

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
  
  /* Deck area */
  .deck-area {
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
  
  /* Play area */
  .play-area {
    flex: 1;
    display: flex;
    flex-direction: column;
    position: relative;
  }
  
  .top-bar {
    background: rgba(20, 20, 25, 0.8);
    backdrop-filter: blur(10px);
    border-bottom: 1px solid rgba(255, 255, 255, 0.1);
    padding: 1rem 2rem;
    display: flex;
    justify-content: space-between;
    align-items: center;
  }
  
  .game-logo {
    font-size: 1.5rem;
    font-weight: 900;
    background: linear-gradient(45deg, #7877c6, #ff77c6);
    -webkit-background-clip: text;
    -webkit-text-fill-color: transparent;
    background-clip: text;
    margin: 0;
  }
  
  .action-btn {
    background: rgba(120, 119, 198, 0.2);
    border: 1px solid rgba(120, 119, 198, 0.4);
    color: #fff;
    padding: 0.5rem 1rem;
    border-radius: 6px;
    text-decoration: none;
    transition: all 0.2s ease;
    font-size: 0.85rem;
  }
  
  .action-btn:hover {
    background: rgba(120, 119, 198, 0.3);
    border-color: rgba(120, 119, 198, 0.6);
    box-shadow: 0 0 20px rgba(120, 119, 198, 0.3);
  }
  
  /* Battlefield */
  .battlefield {
    flex: 1;
    padding: 2rem;
    display: flex;
    align-items: center;
    justify-content: center;
  }
  
  .chart-zone {
    width: 100%;
    max-width: 1000px;
    height: 80%;
    background: rgba(25, 25, 35, 0.8);
    border: 2px solid rgba(120, 119, 198, 0.2);
    border-radius: 20px;
    padding: 2rem;
    box-shadow: 0 0 50px rgba(120, 119, 198, 0.1);
    position: relative;
  }
  
  /* Hand area */
  .hand-area {
    position: absolute;
    bottom: 0;
    left: 0;
    right: 0;
    height: 220px;
    background: linear-gradient(to top, rgba(10, 10, 15, 0.95) 0%, transparent 100%);
    padding: 1rem 2rem 2rem;
    display: flex;
    align-items: flex-end;
    justify-content: center;
  }
  
  .hand-container {
    display: flex;
    gap: 1rem;
    align-items: flex-end;
    padding-bottom: 1rem;
  }
  
  /* Card items in sidebar */
  .card-item {
    display: flex;
    align-items: center;
    gap: 0.75rem;
    margin-bottom: 0.75rem;
  }
  
  .card-mini {
    flex: 1;
    background: rgba(40, 40, 50, 0.4);
    border: 1px solid rgba(255, 255, 255, 0.1);
    border-radius: 8px;
    padding: 0.75rem;
    transition: all 0.2s ease;
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
  
  .card-mini-type {
    font-size: 0.65rem;
    color: #888;
    text-transform: uppercase;
    letter-spacing: 1px;
  }
  
  .card-mini-value {
    font-size: 0.75rem;
    font-weight: 600;
    color: #4ade80;
  }
  
  .card-mini-name {
    font-size: 0.85rem;
    font-weight: 500;
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