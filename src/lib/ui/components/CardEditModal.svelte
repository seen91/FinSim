<script lang="ts">
  import type { FinancialCard, CurveType } from '$lib/core/types';
  import Button from './Button.svelte';
  import { createEventDispatcher } from 'svelte';

  export let card: FinancialCard;
  export let isOpen = false;

  const dispatch = createEventDispatcher();

  // Create editable copy of the card
  let editableCard: FinancialCard = JSON.parse(JSON.stringify(card));

  // Card type options
  const cardTypes: { value: CurveType; label: string }[] = [
    { value: 'compound', label: 'Compound Growth' },
    { value: 'linear', label: 'Linear Growth' },
    { value: 'exponential', label: 'Exponential Growth' },
    { value: 'loan', label: 'Loan/Debt' }
  ];

  function handleClose() {
    dispatch('close');
  }

  function handleSave() {
    dispatch('save', editableCard);
  }

  function handleCancel() {
    // Reset to original card values
    editableCard = JSON.parse(JSON.stringify(card));
    dispatch('close');
  }

  function handleKeydown(event: KeyboardEvent) {
    if (event.key === 'Escape') {
      handleCancel();
    } else if (event.key === 'Enter' && (event.ctrlKey || event.metaKey)) {
      handleSave();
    }
  }

  function handleOverlayClick(event: MouseEvent) {
    if (event.target === event.currentTarget) {
      handleCancel();
    }
  }

  // Update editable card when prop changes
  $: if (card) {
    editableCard = JSON.parse(JSON.stringify(card));
  }

  // Helper to show/hide fields based on card type
  function shouldShowField(field: string, type: CurveType): boolean {
    switch (field) {
      case 'principal':
        return true; // All types can have initial amount
      case 'rate':
        return type === 'compound' || type === 'exponential' || type === 'loan';
      case 'monthlyAmount':
        return type === 'linear' || type === 'compound';
      case 'loanTerm':
        return type === 'loan';
      case 'customFormula':
        return type === 'custom';
      default:
        return true;
    }
  }
</script>

{#if isOpen}
  <div 
    class="modal-overlay" 
    role="button" 
    tabindex="-1"
    on:click={handleOverlayClick}
    on:keydown={handleKeydown}
  >
    <div class="modal" role="dialog" aria-labelledby="modal-title" aria-modal="true">
      <div class="modal-header">
        <h2 id="modal-title">Edit Card</h2>
        <Button
          variant="secondary"
          size="small"
          onClick={handleClose}
          title="Close"
          ariaLabel="Close modal"
          class="close-btn"
        >×</Button>
      </div>

      <div class="modal-content">
        <!-- Card Basic Info -->
        <div class="form-section">
          <h3>Basic Information</h3>
          
          <div class="form-row">
            <label for="card-name">Card Name:</label>
            <input 
              id="card-name"
              type="text" 
              bind:value={editableCard.name}
              placeholder="Enter card name"
            />
          </div>

          <div class="form-row">
            <label for="card-type">Card Type:</label>
            <select id="card-type" bind:value={editableCard.type}>
              {#each cardTypes as typeOption}
                <option value={typeOption.value}>{typeOption.label}</option>
              {/each}
            </select>
          </div>

          <div class="form-row">
            <label for="card-description">Description:</label>
            <textarea 
              id="card-description"
              bind:value={editableCard.description}
              placeholder="Optional description"
              rows="2"
            ></textarea>
          </div>
        </div>

        <!-- Time Range -->
        <div class="form-section">
          <h3>Time Range</h3>
          <div class="form-row time-range">
            <label for="start-year">From Year:</label>
            <input 
              id="start-year"
              type="number" 
              bind:value={editableCard.timeRange[0]}
              min="2020"
              max="2100"
            />
            <span>to</span>
            <label for="end-year">To Year:</label>
            <input 
              id="end-year"
              type="number" 
              bind:value={editableCard.timeRange[1]}
              min="2020"
              max="2100"
            />
          </div>
        </div>

        <!-- Financial Parameters -->
        <div class="form-section">
          <h3>Financial Parameters</h3>
          
          {#if shouldShowField('principal', editableCard.type)}
            <div class="form-row">
              <label for="principal">Initial Amount/Principal ($):</label>
              <input 
                id="principal"
                type="number" 
                bind:value={editableCard.parameters.principal}
                step="1000"
                placeholder="0"
              />
            </div>
          {/if}

          {#if shouldShowField('monthlyAmount', editableCard.type)}
            <div class="form-row">
              <label for="monthly-amount">Monthly Amount ($):</label>
              <input 
                id="monthly-amount"
                type="number" 
                bind:value={editableCard.parameters.monthlyAmount}
                step="100"
                placeholder="0"
              />
            </div>
          {/if}

          {#if shouldShowField('rate', editableCard.type)}
            <div class="form-row">
              <label for="rate">
                {editableCard.type === 'loan' ? 'Interest Rate' : 'Growth Rate'} (%):
              </label>
              <input 
                id="rate"
                type="number" 
                bind:value={editableCard.parameters.rate}
                step="0.1"
                placeholder="0"
              />
            </div>
          {/if}

          {#if shouldShowField('loanTerm', editableCard.type)}
            <div class="form-row">
              <label for="loan-term">Loan Term (years):</label>
              <input 
                id="loan-term"
                type="number" 
                bind:value={editableCard.parameters.loanTerm}
                step="1"
                min="1"
                placeholder="30"
              />
            </div>
          {/if}
        </div>

        <!-- Visual Settings -->
        <div class="form-section">
          <h3>Visual Settings</h3>
          
          <div class="form-row">
            <label for="card-color">Card Color:</label>
            <input 
              id="card-color"
              type="color" 
              bind:value={editableCard.color}
            />
          </div>
        </div>
      </div>

      <div class="modal-footer">
        <Button
          variant="secondary"
          onClick={handleCancel}
        >Cancel</Button>
        <Button
          variant="primary"
          onClick={handleSave}
        >Save Changes</Button>
      </div>
    </div>
  </div>
{/if}

<style>
  .modal-overlay {
    position: fixed;
    top: 0;
    left: 0;
    right: 0;
    bottom: 0;
    background: rgba(0, 0, 0, 0.7);
    backdrop-filter: blur(4px);
    display: flex;
    align-items: center;
    justify-content: center;
    z-index: 1000;
    padding: 2rem;
  }

  .modal {
    background: linear-gradient(135deg, #2a2a3e, #1a1a2e);
    border: 2px solid rgba(255, 255, 255, 0.2);
    border-radius: 12px;
    box-shadow: 0 20px 40px rgba(0, 0, 0, 0.8);
    max-width: 500px;
    width: 100%;
    max-height: 90vh;
    overflow: hidden;
    display: flex;
    flex-direction: column;
  }

  .modal-header {
    display: flex;
    justify-content: space-between;
    align-items: center;
    padding: 1.5rem 2rem 1rem;
    border-bottom: 1px solid rgba(255, 255, 255, 0.1);
    position: relative;
  }

  .modal-header h2 {
    color: white;
    margin: 0;
    font-size: 1.25rem;
    font-weight: 700;
  }

  :global(.modal-header .close-btn) {
    position: absolute !important;
    top: 1rem !important;
    right: 1.5rem !important;
    width: 32px !important;
    height: 32px !important;
    border-radius: 50% !important;
    font-size: 1.2rem !important;
  }

  .modal-content {
    flex: 1;
    overflow-y: auto;
    padding: 0 2rem;
  }

  .form-section {
    margin: 1.5rem 0;
  }

  .form-section h3 {
    color: white;
    margin: 0 0 1rem 0;
    font-size: 1rem;
    font-weight: 600;
    border-bottom: 1px solid rgba(255, 255, 255, 0.1);
    padding-bottom: 0.5rem;
  }

  .form-row {
    display: flex;
    align-items: center;
    gap: 0.75rem;
    margin-bottom: 1rem;
    flex-wrap: wrap;
  }

  .form-row.time-range {
    align-items: center;
  }

  .form-row label {
    color: rgba(255, 255, 255, 0.9);
    font-size: 0.9rem;
    font-weight: 500;
    min-width: 120px;
    flex-shrink: 0;
  }

  .form-row input,
  .form-row select,
  .form-row textarea {
    background: rgba(255, 255, 255, 0.1);
    border: 1px solid rgba(255, 255, 255, 0.3);
    border-radius: 6px;
    padding: 0.5rem 0.75rem;
    color: white;
    font-size: 0.9rem;
    flex: 1;
    min-width: 120px;
  }

  .form-row input:focus,
  .form-row select:focus,
  .form-row textarea:focus {
    outline: none;
    border-color: rgba(120, 119, 198, 0.6);
    background: rgba(255, 255, 255, 0.15);
    box-shadow: 0 0 0 2px rgba(120, 119, 198, 0.2);
  }

  .form-row input[type="color"] {
    width: 60px;
    height: 40px;
    padding: 0;
    border-radius: 6px;
    cursor: pointer;
  }

  .form-row textarea {
    resize: vertical;
    min-height: 60px;
  }

  .form-row span {
    color: rgba(255, 255, 255, 0.7);
    font-size: 0.85rem;
  }

  .modal-footer {
    display: flex;
    justify-content: flex-end;
    gap: 1rem;
    padding: 1rem 2rem 1.5rem;
    border-top: 1px solid rgba(255, 255, 255, 0.1);
  }

  /* Mobile responsive */
  @media (max-width: 640px) {
    .modal-overlay {
      padding: 1rem;
    }

    .modal {
      max-width: none;
    }

    .modal-header,
    .modal-footer {
      padding-left: 1rem;
      padding-right: 1rem;
    }

    .modal-content {
      padding: 0 1rem;
    }

    .form-row {
      flex-direction: column;
      align-items: flex-start;
    }

    .form-row label {
      min-width: unset;
    }

    .form-row input,
    .form-row select,
    .form-row textarea {
      width: 100%;
    }

    .form-row.time-range {
      flex-direction: row;
      flex-wrap: wrap;
    }

    .form-row.time-range input {
      flex: 1;
      min-width: 80px;
    }
  }
</style>