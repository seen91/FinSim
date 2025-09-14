<script lang="ts">
  import type { FinancialCard, CardStack } from '$lib/core/types';
  import CircularHand from './CircularHand.svelte';
  import Chart from '../components/Chart.svelte';
  import Button from '../components/Button.svelte';
  import { createEventDispatcher } from 'svelte';

  export let cards: FinancialCard[] = [];
  export let stacks: CardStack[] = [];
  export let activeCardIds: Set<string> = new Set();
  export let activeStackIds: Set<string> = new Set();
  
  const dispatch = createEventDispatcher();
  
  function handleCardToggle(event: CustomEvent<FinancialCard>) {
    dispatch('toggleCard', event.detail);
  }
  
  function handleStackToggle(event: CustomEvent<CardStack>) {
    dispatch('toggleStack', event.detail);
  }
  
  function handleCardInfo(event: CustomEvent<FinancialCard>) {
    dispatch('showCardInfo', event.detail);
  }
  
  function handleStackInfo(event: CustomEvent<CardStack>) {
    dispatch('showStackInfo', event.detail);
  }
  
  function handleCardRemove(event: CustomEvent<FinancialCard>) {
    dispatch('removeCard', event.detail);
  }
  
  function handleStackRemove(event: CustomEvent<CardStack>) {
    dispatch('removeStack', event.detail);
  }
  
  function handleUnstack(event: CustomEvent<CardStack>) {
    dispatch('unstack', event.detail);
  }
  
  function handleStackCards(event: CustomEvent<{baseCard: FinancialCard, modifierCard: FinancialCard}>) {
    dispatch('stackCards', event.detail);
  }
  
  function handleAddToStack(event: CustomEvent<{stackId: string, modifierCard: FinancialCard}>) {
    dispatch('addToStack', event.detail);
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
      {stacks}
      {activeCardIds}
      {activeStackIds}
      on:toggle={handleCardToggle}
      on:toggleStack={handleStackToggle}
      on:info={handleCardInfo}
      on:stackInfo={handleStackInfo}
      on:remove={handleCardRemove}
      on:removeStack={handleStackRemove}
      on:unstack={handleUnstack}
      on:stackCards={handleStackCards}
      on:addToStack={handleAddToStack}
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
    padding: 0.5rem 1rem;
    display: flex;
    justify-content: space-between;
    align-items: center;
    min-height: 40px;
  }
  
  .game-logo {
    font-size: 1.2rem;
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
    padding: 0;
    display: flex;
    align-items: flex-start;
    justify-content: flex-start;
  }
  
  .chart-zone {
    width: 100%;
    max-width: none;
    height: 99%;
    background: rgba(25, 25, 35, 0.8);
    border: 2px solid rgba(120, 119, 198, 0.2);
    border-radius: 20px;
    padding: 0.5rem;
    box-shadow: 0 0 50px rgba(120, 119, 198, 0.1);
    position: relative;
    margin: 0;
  }
  
  .hand-area {
    position: absolute;
    bottom: 0;
    left: 0;
    right: 0;
    height: 140px;
    background: linear-gradient(to top, rgba(10, 10, 15, 0.95) 0%, transparent 100%);
    padding: 0.5rem;
    display: flex;
    align-items: flex-end;
    justify-content: center;
  }
</style>
