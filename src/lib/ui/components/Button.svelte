<script lang="ts">
  export let onClick: ((event: MouseEvent) => void) | undefined = undefined;
  export let disabled = false;
  export let variant: 'primary' | 'secondary' | 'danger' = 'primary';
  export let size: 'small' | 'medium' | 'large' = 'medium';
  export let title = '';
  export let ariaLabel = '';
  
  let className = '';
  export { className as class };
</script>

<button 
  class="btn {variant} {size} {className}" 
  class:disabled
  {disabled}
  {title}
  aria-label={ariaLabel}
  on:click={onClick}
  on:click
>
  <slot />
</button>

<style>
  .btn {
    border: none;
    border-radius: 6px;
    cursor: pointer;
    transition: all 0.2s ease;
    font-weight: 500;
    display: inline-flex;
    align-items: center;
    justify-content: center;
    text-decoration: none;
  }
  
  .btn:disabled,
  .btn.disabled {
    opacity: 0.5;
    cursor: not-allowed;
    pointer-events: none;
  }
  
  /* Variants */
  .btn.primary {
    background: rgba(120, 119, 198, 0.2);
    border: 1px solid rgba(120, 119, 198, 0.4);
    color: #fff;
  }
  
  .btn.primary:hover:not(.disabled) {
    background: rgba(120, 119, 198, 0.3);
    border-color: rgba(120, 119, 198, 0.6);
    box-shadow: 0 0 20px rgba(120, 119, 198, 0.3);
  }
  
  .btn.secondary {
    background: rgba(255, 255, 255, 0.1);
    border: 1px solid rgba(255, 255, 255, 0.2);
    color: white;
  }
  
  .btn.secondary:hover:not(.disabled) {
    background: rgba(255, 255, 255, 0.2);
  }
  
  .btn.danger {
    background: rgba(239, 68, 68, 0.8);
    border: 1px solid rgba(239, 68, 68, 1);
    color: white;
  }
  
  .btn.danger:hover:not(.disabled) {
    background: rgba(239, 68, 68, 1);
    box-shadow: 0 0 10px rgba(239, 68, 68, 0.5);
  }
  
  /* Sizes */
  .btn.small {
    padding: 0.25rem 0.5rem;
    font-size: 0.75rem;
  }
  
  .btn.medium {
    padding: 0.5rem 1rem;
    font-size: 0.85rem;
  }
  
  .btn.large {
    padding: 0.75rem 1.5rem;
    font-size: 1rem;
  }
</style>
