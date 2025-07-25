<script lang="ts">
  import { onMount } from 'svelte';
  import { 
    simulationSettings, 
    simulationResults,
    fragments,
    activeFragmentId,
    saveFragment as storeFragmentSave,
    deleteFragment as storeFragmentDelete,
    runSimulation
  } from '$lib/stores/simulationStore';
  import type { SimulationDataPoint } from '$lib/utils/financialCalculations';
  import type { Fragment } from '$lib/utils/fragmentCreator';
  import Button from '$lib/components/Button.svelte';
  import FragmentForm from '$lib/components/FragmentForm.svelte';
  import SimulationResults from '$lib/components/SimulationResults.svelte';
  import { calculateCompoundInterest } from '$lib/utils/financialCalculations';
  import { formatDate, formatPercentage, formatCurrency } from '$lib/utils/format';
  import { exportFragments } from '$lib/utils/storage';

  // Component state
  let showFragmentForm = false;
  let editingFragment: Fragment | null = null;
  let results: SimulationDataPoint[] = [];
  let activeFragment: Fragment | null = null;
  let userFragments: Fragment[] = [];
  let isEditing = false;
  let isMounted = false; // Track if component is mounted
  
  // Subscribe to store updates
  $: settings = $simulationSettings;
  $: results = $simulationResults;
  $: userFragments = $fragments;

  // Watch for active fragment changes
  $: {
    if ($activeFragmentId && isMounted) {
      activeFragment = userFragments.find(f => f.id === $activeFragmentId) || null;
    } else {
      activeFragment = null;
    }
  }

  // Run initial simulation when component mounts in browser
  onMount(() => {
    isMounted = true;
    runSimulation($simulationSettings);
    return () => {
      isMounted = false;
    };
  });

  // Create/Edit fragment handlers
  function showCreateForm() {
    editingFragment = null;
    isEditing = false;
    showFragmentForm = true;
  }

  function showEditForm(fragment: Fragment) {
    editingFragment = fragment;
    isEditing = true;
    showFragmentForm = true;
  }

  function cancelFragmentForm() {
    showFragmentForm = false;
    editingFragment = null;
  }

  function saveFragment(event: CustomEvent<{fragment: Fragment}>) {
    const { fragment } = event.detail;
    storeFragmentSave(fragment);
    showFragmentForm = false;
    
    // Set as active fragment and run simulation
    activeFragmentId.set(fragment.id);
    runSimulation(fragment.settings);
  }

  function selectFragment(fragment: Fragment) {
    activeFragmentId.set(fragment.id);
    runSimulation(fragment.settings);
  }

  function deleteSelectedFragment() {
    if (!activeFragment) return;
    
    if (confirm(`Are you sure you want to delete "${activeFragment.name}"?`)) {
      const id = activeFragment.id;
      storeFragmentDelete(id);
      activeFragmentId.set(null);
      runSimulation($simulationSettings);
    }
  }

  function exportAllFragments() {
    exportFragments();
  }

  // File import handling
  let fileInput: HTMLInputElement;
  
  function importFile() {
    if (fileInput) {
      fileInput.click();
    }
  }
  
  function handleFileImport(event: Event) {
    const target = event.target as HTMLInputElement;
    if (!target.files || target.files.length === 0) return;
    
    const file = target.files[0];
    const reader = new FileReader();
    
    reader.onload = (e) => {
      const result = e.target?.result as string;
      if (result) {
        try {
          const importedData = JSON.parse(result);
          // TODO: Implement import logic
          console.log('Imported data:', importedData);
          // Clear the input to allow the same file to be imported again
          target.value = '';
        } catch (error) {
          console.error('Error parsing imported file:', error);
          alert('Error importing file. Please make sure it is a valid JSON file.');
          target.value = '';
        }
      }
    };
    
    reader.readAsText(file);
  }
</script>

<svelte:head>
  <title>FinSim - Financial Simulator</title>
</svelte:head>

<div class="container mx-auto px-4 py-8">
  <header class="mb-8">
    <div class="flex flex-col md:flex-row justify-between items-start md:items-center mb-6">
      <div>
        <h1 class="text-3xl font-bold text-gray-800">FinSim</h1>
        <p class="text-gray-600">Financial Planning & Simulation Tool</p>
      </div>
      <div class="mt-4 md:mt-0 flex space-x-3">
        <Button variant="primary" on:click={showCreateForm}>Create Fragment</Button>
        <Button variant="outline" on:click={exportAllFragments}>Export All</Button>
        <Button variant="outline" on:click={importFile}>Import</Button>
        <input 
          type="file" 
          accept=".json" 
          style="display: none;" 
          bind:this={fileInput} 
          on:change={handleFileImport}
        />
      </div>
    </div>
  </header>

  {#if showFragmentForm}
    <div class="mb-8">
      <FragmentForm 
        initialSettings={editingFragment?.settings || $simulationSettings}
        existingFragment={editingFragment}
        on:save={saveFragment}
        on:cancel={cancelFragmentForm}
      />
    </div>
  {:else}
    <div class="grid grid-cols-1 lg:grid-cols-4 gap-6">
      <!-- Fragment List (Sidebar) -->
      <div class="lg:col-span-1">
        <div class="bg-white p-4 rounded-lg shadow-md">
          <h2 class="text-xl font-semibold mb-4">Your Fragments</h2>
          
          {#if userFragments.length === 0}
            <p class="text-gray-500 text-center py-4">
              No fragments yet. Create your first one!
            </p>
          {:else}
            <ul class="space-y-3">
              {#each userFragments as fragment}
                <li>
                  <button 
                    class="w-full text-left p-3 rounded-md hover:bg-gray-50 transition-colors
                      {activeFragment?.id === fragment.id ? 'bg-blue-50 border-l-4 border-blue-500' : ''}"
                    on:click={() => selectFragment(fragment)}
                  >
                    <div class="font-medium">{fragment.name}</div>
                    <div class="text-sm text-gray-500">
                      {formatCurrency(fragment.settings.initialAmount)} + 
                      {formatCurrency(fragment.settings.monthlyContribution)}/mo
                    </div>
                    <div class="text-xs text-gray-400 mt-1">
                      Created: {formatDate(fragment.created)}
                    </div>
                  </button>
                </li>
              {/each}
            </ul>
            
            {#if activeFragment}
              <div class="mt-6 flex space-x-2">
                <Button 
                  size="sm" 
                  fullWidth={true}
                  variant="outline" 
                  on:click={() => showEditForm(activeFragment)}
                >
                  Edit
                </Button>
                <Button 
                  size="sm" 
                  fullWidth={true}
                  variant="danger" 
                  on:click={deleteSelectedFragment}
                >
                  Delete
                </Button>
              </div>
            {/if}
          {/if}
        </div>
      </div>
      
      <!-- Main Content Area -->
      <div class="lg:col-span-3">
        {#if activeFragment}
          <SimulationResults 
            results={results} 
            settings={activeFragment.settings}
            fragmentName={activeFragment.name}
          />
        {:else if results.length}
          <SimulationResults results={results} settings={settings} />
        {:else}
          <div class="bg-white p-6 rounded-lg shadow-md text-center">
            <p class="text-gray-500">
              Run a simulation or select a fragment to view results
            </p>
          </div>
        {/if}
      </div>
    </div>
  {/if}
</div>
