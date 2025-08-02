<script lang="ts">
  import type { FinancialCard } from '$lib/types';
  
  export let card: FinancialCard | null = null;
  export let isOpen: boolean = false;
  
  function closeModal() {
    isOpen = false;
  }
  
  function handleBackdropClick(event: MouseEvent) {
    if (event.target === event.currentTarget) {
      closeModal();
    }
  }
  
  function handleBackdropKeydown(event: KeyboardEvent) {
    if (event.key === 'Enter' || event.key === ' ') {
      if (event.target === event.currentTarget) {
        closeModal();
      }
    }
  }
  
  function handleGlobalKeydown(event: KeyboardEvent) {
    if (event.key === 'Escape') {
      closeModal();
    }
  }
  
  function formatParameters(card: FinancialCard): string {
    const params = [];
    if (card.parameters.principal) {
      params.push(`Initial: $${card.parameters.principal.toLocaleString()}`);
    }
    if (card.parameters.rate) {
      params.push(`Rate: ${card.parameters.rate}%`);
    }
    if (card.parameters.monthlyAmount) {
      const monthly = card.parameters.monthlyAmount;
      params.push(`Monthly: ${monthly > 0 ? '+' : ''}$${Math.abs(monthly).toLocaleString()}`);
    }
    return params.join(' • ');
  }
  
  function getRiskColor(riskLevel: string): string {
    switch (riskLevel) {
      case 'Low': return '#22c55e';
      case 'Medium': return '#f59e0b';
      case 'High': return '#ef4444';
      default: return '#6b7280';
    }
  }
</script>

<svelte:window on:keydown={handleGlobalKeydown} />

{#if isOpen && card}
  <div 
    class="modal-backdrop" 
    on:click={handleBackdropClick}
    on:keydown={handleBackdropKeydown}
    role="dialog"
    aria-modal="true"
    tabindex="-1"
  >
    <div class="modal-content">
      <!-- Header -->
      <div class="modal-header">
        <div class="card-header-info">
          <div class="card-icon" style="background: {card.color}20">
            <div class="card-icon-symbol">
              {#if card.type === 'compound'}⤴️
              {:else if card.type === 'linear'}📏
              {:else if card.type === 'exponential'}🚀
              {:else}⚙️{/if}
            </div>
          </div>
          <div>
            <h2 class="card-title">{card.name}</h2>
            <p class="card-type">{card.type.toUpperCase()} Strategy</p>
          </div>
        </div>
        <button class="close-btn" on:click={closeModal}>✕</button>
      </div>
      
      <!-- Content -->
      <div class="modal-body">
        {#if card.detailedInfo}
          <!-- Strategy Description -->
          <section class="info-section">
            <h3>Strategy Overview</h3>
            <p class="strategy-description">{card.detailedInfo.strategy}</p>
          </section>
          
          <!-- Key Metrics -->
          <section class="info-section">
            <h3>Key Metrics</h3>
            <div class="metrics-grid">
              <div class="metric-item">
                <span class="metric-label">Risk Level</span>
                <span class="risk-badge" style="background-color: {getRiskColor(card.detailedInfo.riskLevel)}20; color: {getRiskColor(card.detailedInfo.riskLevel)}">
                  {card.detailedInfo.riskLevel}
                </span>
              </div>
              <div class="metric-item">
                <span class="metric-label">Expected Return</span>
                <span class="metric-value">{card.detailedInfo.expectedReturn}</span>
              </div>
              <div class="metric-item">
                <span class="metric-label">Time Commitment</span>
                <span class="metric-value">{card.detailedInfo.timeCommitment}</span>
              </div>
              <div class="metric-item">
                <span class="metric-label">Parameters</span>
                <span class="metric-value">{formatParameters(card)}</span>
              </div>
            </div>
          </section>
          
          <!-- Pros and Cons -->
          <section class="info-section">
            <div class="pros-cons-grid">
              <div class="pros-section">
                <h4 class="pros-title">✅ Advantages</h4>
                <ul class="pros-list">
                  {#each card.detailedInfo.pros as pro}
                    <li>{pro}</li>
                  {/each}
                </ul>
              </div>
              <div class="cons-section">
                <h4 class="cons-title">⚠️ Considerations</h4>
                <ul class="cons-list">
                  {#each card.detailedInfo.cons as con}
                    <li>{con}</li>
                  {/each}
                </ul>
              </div>
            </div>
          </section>
          
          {#if card.detailedInfo.tooltip}
            <section class="info-section">
              <div class="tooltip-box">
                <strong>💡 Pro Tip:</strong> {card.detailedInfo.tooltip}
              </div>
            </section>
          {/if}
        {:else}
          <p class="no-details">No detailed information available for this card.</p>
        {/if}
      </div>
    </div>
  </div>
{/if}

<style>
  .modal-backdrop {
    position: fixed;
    top: 0;
    left: 0;
    width: 100%;
    height: 100%;
    background: rgba(0, 0, 0, 0.8);
    backdrop-filter: blur(4px);
    display: flex;
    align-items: center;
    justify-content: center;
    z-index: 1000;
    padding: 2rem;
    box-sizing: border-box;
  }
  
  .modal-content {
    background: linear-gradient(135deg, #1e1e2e, #2a2a3e);
    border-radius: 16px;
    border: 1px solid rgba(255, 255, 255, 0.1);
    max-width: 600px;
    width: 100%;
    max-height: 80vh;
    overflow-y: auto;
    box-shadow: 0 20px 60px rgba(0, 0, 0, 0.5);
    animation: modalSlideIn 0.3s ease-out;
  }
  
  @keyframes modalSlideIn {
    from {
      opacity: 0;
      transform: translateY(-20px) scale(0.95);
    }
    to {
      opacity: 1;
      transform: translateY(0) scale(1);
    }
  }
  
  .modal-header {
    display: flex;
    align-items: center;
    justify-content: space-between;
    padding: 1.5rem;
    border-bottom: 1px solid rgba(255, 255, 255, 0.1);
  }
  
  .card-header-info {
    display: flex;
    align-items: center;
    gap: 1rem;
  }
  
  .card-icon {
    width: 60px;
    height: 60px;
    border-radius: 12px;
    display: flex;
    align-items: center;
    justify-content: center;
    font-size: 1.5rem;
  }
  
  .card-title {
    margin: 0;
    color: white;
    font-size: 1.5rem;
    font-weight: 700;
  }
  
  .card-type {
    margin: 0.25rem 0 0 0;
    color: #888;
    font-size: 0.9rem;
    font-weight: 500;
    letter-spacing: 1px;
  }
  
  .close-btn {
    background: rgba(255, 255, 255, 0.1);
    border: none;
    color: white;
    font-size: 1.25rem;
    width: 40px;
    height: 40px;
    border-radius: 50%;
    cursor: pointer;
    transition: all 0.2s ease;
    display: flex;
    align-items: center;
    justify-content: center;
  }
  
  .close-btn:hover {
    background: rgba(255, 255, 255, 0.2);
    transform: scale(1.1);
  }
  
  .modal-body {
    padding: 1.5rem;
    color: white;
  }
  
  .info-section {
    margin-bottom: 2rem;
  }
  
  .info-section h3 {
    margin: 0 0 1rem 0;
    color: white;
    font-size: 1.25rem;
    font-weight: 600;
  }
  
  .strategy-description {
    color: #e5e5e5;
    line-height: 1.6;
    margin: 0;
  }
  
  .metrics-grid {
    display: grid;
    grid-template-columns: repeat(auto-fit, minmax(200px, 1fr));
    gap: 1rem;
  }
  
  .metric-item {
    display: flex;
    flex-direction: column;
    gap: 0.5rem;
    padding: 1rem;
    background: rgba(255, 255, 255, 0.05);
    border-radius: 8px;
    border: 1px solid rgba(255, 255, 255, 0.1);
  }
  
  .metric-label {
    font-size: 0.85rem;
    color: #888;
    font-weight: 500;
    text-transform: uppercase;
    letter-spacing: 0.5px;
  }
  
  .metric-value {
    color: white;
    font-weight: 600;
  }
  
  .risk-badge {
    display: inline-block;
    padding: 0.25rem 0.75rem;
    border-radius: 20px;
    font-size: 0.85rem;
    font-weight: 600;
    text-align: center;
  }
  
  .pros-cons-grid {
    display: grid;
    grid-template-columns: 1fr 1fr;
    gap: 1.5rem;
  }
  
  .pros-title, .cons-title {
    margin: 0 0 1rem 0;
    font-size: 1rem;
    font-weight: 600;
  }
  
  .pros-title {
    color: #22c55e;
  }
  
  .cons-title {
    color: #f59e0b;
  }
  
  .pros-list, .cons-list {
    margin: 0;
    padding: 0;
    list-style: none;
  }
  
  .pros-list li, .cons-list li {
    padding: 0.5rem 0;
    color: #e5e5e5;
    position: relative;
    padding-left: 1.5rem;
  }
  
  .pros-list li::before {
    content: "•";
    position: absolute;
    left: 0;
    color: #22c55e;
    font-weight: bold;
  }
  
  .cons-list li::before {
    content: "•";
    position: absolute;
    left: 0;
    color: #f59e0b;
    font-weight: bold;
  }
  
  .tooltip-box {
    background: rgba(59, 130, 246, 0.1);
    border: 1px solid rgba(59, 130, 246, 0.3);
    border-radius: 8px;
    padding: 1rem;
    color: #93c5fd;
    line-height: 1.5;
  }
  
  .no-details {
    text-align: center;
    color: #888;
    font-style: italic;
    padding: 2rem;
  }
  
  @media (max-width: 640px) {
    .modal-backdrop {
      padding: 1rem;
    }
    
    .metrics-grid {
      grid-template-columns: 1fr;
    }
    
    .pros-cons-grid {
      grid-template-columns: 1fr;
      gap: 1rem;
    }
  }
</style>
