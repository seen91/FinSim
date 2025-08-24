<script lang="ts">
  import type { FinancialCard } from '$lib/core/types';
  import CircularHand from './CircularHand.svelte';
  import Chart from '../components/Chart.svelte';
  import Button from '../components/Button.svelte';
  import { createEventDispatcher } from 'svelte';

  export let cards: FinancialCard[] = [];
  export let activeCardIds: Set<string> = new Set();
  
  const dispatch = createEventDispatcher();
  
  function handleCardToggle(event: CustomEvent<FinancialCard>) {
    dispatch('toggleCard', event.detail);
  }
  
  function handleCardInfo(event: CustomEvent<FinancialCard>) {
    dispatch('showCardInfo', event.detail);
  }
  
  function handleCardRemove(event: CustomEvent<FinancialCard>) {
    dispatch('removeCard', event.detail);
  }
</script>

<main class="play-area">
  <!-- Top bar -->
  <div class="top-bar">
    <h1 class="game-logo">FinSim</h1>
    <div class="game-actions">
      <Button variant="primary" size="medium">
        <a href="/workshop" class="workshop-link">🎴 Card Workshop</a>
      </Button>
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
    <CircularHand 
      {cards}
      {activeCardIds}
      on:toggle={handleCardToggle}
      on:info={handleCardInfo}
      on:remove={handleCardRemove}
    />
  </div>
</main>

<style>
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
  
  .workshop-link {
    color: inherit;
    text-decoration: none;
    font-size: 0.85rem;
  }
  
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
</style>
