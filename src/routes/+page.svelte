<script lang="ts">
  import { onMount } from 'svelte';
  import { formatCurrency, formatPercentage } from '$lib/utils/format';
  import Button from '$lib/components/Button.svelte';
  import { createFragment, type Fragment } from '$lib/utils/fragmentCreator';
  import { loadFragments, saveFragment, exportFragmentsToFile } from '$lib/utils/storage';

  let showNewFragmentForm = false;
  let fragments: Fragment[] = [];

  // Form values
  let fragmentName = '';
  let initialAmount = 1000;
  let periodicContribution = 100;
  let contributionFrequency: 'daily' | 'weekly' | 'monthly' | 'quarterly' | 'yearly' = 'monthly';
  let expectedReturn = 0.07;
  let years = 10;

  onMount(() => {
    // Load saved fragments from localStorage
    fragments = loadFragments();
  });

  function toggleNewFragmentForm() {
    showNewFragmentForm = !showNewFragmentForm;
  }

  function createNewFragment() {
    const newFragment = createFragment({
      name: fragmentName || 'Unnamed Fragment',
      initialAmount,
      periodicContribution,
      contributionFrequency,
      expectedReturn,
      years
    });
    
    fragments = [...fragments, newFragment];
    
    // Save to localStorage
    saveFragment(newFragment);
    
    showNewFragmentForm = false;
    
    // Reset form
    fragmentName = '';
    initialAmount = 1000;
    periodicContribution = 100;
    contributionFrequency = 'monthly';
    expectedReturn = 0.07;
    years = 10;
  }
  
  function exportFragments() {
    exportFragmentsToFile();
  }
  
  function viewFragmentDetails(fragment: Fragment) {
    // This will be implemented in the future to show detailed
    // projections and graphs for a specific fragment
    alert(`Viewing details for ${fragment.name} will be implemented in a future update.`);
  }
</script>

<div class="container mx-auto px-4 py-8 max-w-6xl">
  <header class="mb-8">
    <h1 class="text-3xl font-bold text-blue-700">FinSim</h1>
    <p class="text-gray-600 mt-2">Financial planning and simulation for compound interest scenarios</p>
  </header>

  <div class="mb-6 flex justify-between items-center">
    <h2 class="text-xl font-semibold">Financial Fragments</h2>
    <div class="flex space-x-2">
      {#if fragments.length > 0}
        <Button variant="secondary" on:click={exportFragments}>
          Export Fragments
        </Button>
      {/if}
      <Button on:click={toggleNewFragmentForm}>
        {showNewFragmentForm ? 'Cancel' : 'Create New Fragment'}
      </Button>
    </div>
  </div>

  {#if showNewFragmentForm}
    <div class="bg-gray-50 p-6 rounded-lg shadow mb-6">
      <h3 class="text-lg font-medium mb-4">Create New Fragment</h3>
      
      <div class="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div class="mb-4">
          <label for="fragmentName" class="block text-sm font-medium text-gray-700 mb-1">Fragment Name</label>
          <input 
            type="text" 
            id="fragmentName" 
            bind:value={fragmentName}
            placeholder="My Investment Strategy" 
            class="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500"
          />
        </div>
        
        <div class="mb-4">
          <label for="initialAmount" class="block text-sm font-medium text-gray-700 mb-1">Initial Amount</label>
          <input 
            type="number" 
            id="initialAmount" 
            bind:value={initialAmount}
            min="0"
            class="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500"
          />
        </div>
        
        <div class="mb-4">
          <label for="periodicContribution" class="block text-sm font-medium text-gray-700 mb-1">Periodic Contribution</label>
          <input 
            type="number" 
            id="periodicContribution" 
            bind:value={periodicContribution}
            min="0"
            class="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500"
          />
        </div>
        
        <div class="mb-4">
          <label for="contributionFrequency" class="block text-sm font-medium text-gray-700 mb-1">Contribution Frequency</label>
          <select 
            id="contributionFrequency" 
            bind:value={contributionFrequency}
            class="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500"
          >
            <option value="daily">Daily</option>
            <option value="weekly">Weekly</option>
            <option value="monthly">Monthly</option>
            <option value="quarterly">Quarterly</option>
            <option value="yearly">Yearly</option>
          </select>
        </div>
        
        <div class="mb-4">
          <label for="expectedReturn" class="block text-sm font-medium text-gray-700 mb-1">Expected Annual Return (%)</label>
          <input 
            type="number" 
            id="expectedReturn" 
            bind:value={expectedReturn}
            step="0.01"
            min="-1"
            max="1"
            class="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500"
          />
          <span class="text-gray-500 text-xs">Enter as decimal (e.g., 0.07 for 7%)</span>
        </div>
        
        <div class="mb-4">
          <label for="years" class="block text-sm font-medium text-gray-700 mb-1">Time Period (Years)</label>
          <input 
            type="number" 
            id="years" 
            bind:value={years}
            min="1"
            max="100"
            class="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500"
          />
        </div>
      </div>
      
      <div class="flex justify-end mt-4">
        <Button on:click={createNewFragment} variant="primary">Create Fragment</Button>
      </div>
    </div>
  {/if}

  {#if fragments.length === 0}
    <div class="bg-gray-50 p-8 rounded-lg border border-dashed border-gray-300 flex flex-col items-center justify-center">
      <p class="text-gray-600 mb-4">You haven't created any financial fragments yet.</p>
      {#if !showNewFragmentForm}
        <Button variant="secondary" on:click={toggleNewFragmentForm}>Create Your First Fragment</Button>
      {/if}
    </div>
  {:else}
    <div class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
      {#each fragments as fragment (fragment.id)}
        <div class="bg-white rounded-lg shadow p-6">
          <h3 class="text-lg font-medium mb-2">{fragment.name}</h3>
          <div class="text-sm text-gray-500 mb-4">
            <div>Initial: {formatCurrency(fragment.initialAmount)}</div>
            <div>{formatCurrency(fragment.periodicContribution)} {fragment.contributionFrequency}</div>
            <div>Return: {formatPercentage(fragment.expectedReturn)}</div>
            <div>Duration: {fragment.years} years</div>
          </div>
          
          <div class="h-40 bg-gray-100 flex items-center justify-center rounded mb-4">
            <span class="text-gray-400">Graph visualization will appear here</span>
          </div>
          
          <div class="flex justify-between">
            <Button variant="outline" size="sm">Edit</Button>
            <Button variant="primary" size="sm" on:click={() => viewFragmentDetails(fragment)}>View Details</Button>
          </div>
        </div>
      {/each}
    </div>
  {/if}
</div>
