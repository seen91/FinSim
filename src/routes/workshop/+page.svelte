<script lang="ts">
  import { goto } from '$app/navigation';
</script>

<div class="workshop-container">
  <header class="workshop-header">
    <h1>Card Workshop</h1>
    <button class="back-btn" on:click={() => goto('/')}>← Back to Game</button>
  </header>
  
  <main class="workshop-content">
    <p>Card creation interface coming soon...</p>
  </main>
</div>

<style>
  .workshop-container {
    min-height: 100vh;
    background: #0a0a0a;
    color: white;
    padding: 2rem;
  }
  
  .workshop-header {
    display: flex;
    justify-content: space-between;
    align-items: center;
    margin-bottom: 2rem;
  }
  
  .back-btn {
    background: rgba(120, 119, 198, 0.2);
    border: 1px solid rgba(120, 119, 198, 0.4);
    color: white;
    padding: 0.5rem 1rem;
    border-radius: 6px;
    cursor: pointer;
    transition: all 0.2s ease;
  }
  
  .back-btn:hover {
    background: rgba(120, 119, 198, 0.3);
  }
  
  .workshop-content {
    background: rgba(25, 25, 35, 0.5);
    border-radius: 12px;
    padding: 2rem;
  }
</style>