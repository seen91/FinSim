<script lang="ts">
  import { createEventDispatcher } from 'svelte';
  import type { SimulationSettings } from '../stores/simulationStore';
  import { FragmentType, type Fragment, createFragment } from '../utils/fragmentCreator';
  import Button from './Button.svelte';
  import { formatPercentage } from '../utils/format';

  // Props
  export let initialSettings: SimulationSettings;
  export let existingFragment: Fragment | null = null;

  // Local state
  let name = existingFragment?.name || '';
  let description = existingFragment?.description || '';
  let type = existingFragment?.type || FragmentType.APPRECIATION;
  let settings: SimulationSettings = { ...initialSettings };
  
  // Values for range inputs
  let annualReturnPercent = (settings.annualReturn * 100).toFixed(2);
  let inflationRatePercent = (settings.inflationRate * 100).toFixed(2);
  let taxRatePercent = (settings.taxRate * 100).toFixed(2);

  // Initialize from existing fragment if provided
  $: if (existingFragment) {
    name = existingFragment.name;
    description = existingFragment.description;
    type = existingFragment.type;
    settings = { ...existingFragment.settings };
    annualReturnPercent = (settings.annualReturn * 100).toFixed(2);
    inflationRatePercent = (settings.inflationRate * 100).toFixed(2);
    taxRatePercent = (settings.taxRate * 100).toFixed(2);
  }

  // Keep settings in sync with percentage inputs
  $: settings.annualReturn = parseFloat(annualReturnPercent) / 100;
  $: settings.inflationRate = parseFloat(inflationRatePercent) / 100;
  $: settings.taxRate = parseFloat(taxRatePercent) / 100;

  const dispatch = createEventDispatcher<{
    save: { fragment: Fragment };
    cancel: void;
  }>();

  // Form submission handler
  function handleSubmit() {
    if (!name) return; // Require a name

    const fragment = existingFragment 
      ? { ...existingFragment, name, description, type, settings, modified: new Date() }
      : createFragment(name, description, type, settings);
    
    dispatch('save', { fragment });
  }

  // Cancel handler
  function handleCancel() {
    dispatch('cancel');
  }
</script>

<div class="bg-white p-6 rounded-lg shadow-md">
  <h2 class="text-2xl font-semibold mb-6">
    {existingFragment ? 'Edit Fragment' : 'Create New Fragment'}
  </h2>

  <form on:submit|preventDefault={handleSubmit} class="space-y-6">
    <!-- Fragment Basic Info -->
    <div class="space-y-4">
      <div>
        <label for="fragment-name" class="block text-sm font-medium text-gray-700 mb-1">
          Fragment Name
        </label>
        <input
          id="fragment-name"
          type="text"
          bind:value={name}
          required
          class="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
          placeholder="e.g., My S&P 500 Investment"
        />
      </div>

      <div>
        <label for="fragment-description" class="block text-sm font-medium text-gray-700 mb-1">
          Description (optional)
        </label>
        <textarea
          id="fragment-description"
          bind:value={description}
          class="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
          placeholder="Brief description of this financial scenario"
          rows="2"
        ></textarea>
      </div>

      <div>
        <label for="fragment-type" class="block text-sm font-medium text-gray-700 mb-1">
          Fragment Type
        </label>
        <select
          id="fragment-type"
          bind:value={type}
          class="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
        >
          <option value={FragmentType.APPRECIATION}>Appreciation (Growth)</option>
          <option value={FragmentType.DEPRECIATION}>Depreciation (Expenses)</option>
          <option value={FragmentType.EXPENSE}>Regular Expense</option>
          <option value={FragmentType.INCOME}>Income Source</option>
          <option value={FragmentType.CUSTOM}>Custom</option>
        </select>
      </div>
    </div>

    <hr class="my-6" />

    <!-- Financial Settings -->
    <div class="space-y-4">
      <h3 class="text-lg font-medium mb-4">Financial Parameters</h3>

      <div>
        <label for="initial-amount" class="block text-sm font-medium text-gray-700 mb-1">
          Initial Amount
        </label>
        <div class="relative">
          <div class="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
            <span class="text-gray-500">$</span>
          </div>
          <input
            id="initial-amount"
            type="number"
            bind:value={settings.initialAmount}
            min="0"
            step="100"
            class="w-full pl-7 pr-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
          />
        </div>
      </div>

      <div>
        <label for="monthly-contribution" class="block text-sm font-medium text-gray-700 mb-1">
          Monthly Contribution
        </label>
        <div class="relative">
          <div class="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
            <span class="text-gray-500">$</span>
          </div>
          <input
            id="monthly-contribution"
            type="number"
            bind:value={settings.monthlyContribution}
            class="w-full pl-7 pr-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
          />
        </div>
      </div>

      <div>
        <label for="annual-return" class="block text-sm font-medium text-gray-700 mb-1">
          Annual Return ({formatPercentage(settings.annualReturn)})
        </label>
        <input
          id="annual-return"
          type="range"
          min="-10"
          max="30"
          step="0.1"
          bind:value={annualReturnPercent}
          class="w-full h-2 bg-gray-200 rounded-lg appearance-none cursor-pointer"
        />
        <div class="flex justify-between text-xs text-gray-500 mt-1">
          <span>-10%</span>
          <span>0%</span>
          <span>10%</span>
          <span>20%</span>
          <span>30%</span>
        </div>
      </div>

      <div>
        <label for="inflation-rate" class="block text-sm font-medium text-gray-700 mb-1">
          Inflation Rate ({formatPercentage(settings.inflationRate)})
        </label>
        <input
          id="inflation-rate"
          type="range"
          min="0"
          max="10"
          step="0.1"
          bind:value={inflationRatePercent}
          class="w-full h-2 bg-gray-200 rounded-lg appearance-none cursor-pointer"
        />
        <div class="flex justify-between text-xs text-gray-500 mt-1">
          <span>0%</span>
          <span>2.5%</span>
          <span>5%</span>
          <span>7.5%</span>
          <span>10%</span>
        </div>
      </div>

      <div>
        <label for="tax-rate" class="block text-sm font-medium text-gray-700 mb-1">
          Tax Rate ({formatPercentage(settings.taxRate)})
        </label>
        <input
          id="tax-rate"
          type="range"
          min="0"
          max="50"
          step="1"
          bind:value={taxRatePercent}
          class="w-full h-2 bg-gray-200 rounded-lg appearance-none cursor-pointer"
        />
        <div class="flex justify-between text-xs text-gray-500 mt-1">
          <span>0%</span>
          <span>12.5%</span>
          <span>25%</span>
          <span>37.5%</span>
          <span>50%</span>
        </div>
      </div>

      <div>
        <label for="years" class="block text-sm font-medium text-gray-700 mb-1">
          Time Horizon (Years): {settings.years}
        </label>
        <input
          id="years"
          type="range"
          min="1"
          max="50"
          step="1"
          bind:value={settings.years}
          class="w-full h-2 bg-gray-200 rounded-lg appearance-none cursor-pointer"
        />
        <div class="flex justify-between text-xs text-gray-500 mt-1">
          <span>1</span>
          <span>10</span>
          <span>20</span>
          <span>30</span>
          <span>40</span>
          <span>50</span>
        </div>
      </div>
    </div>

    <div class="flex justify-end space-x-3 mt-8">
      <Button variant="outline" on:click={handleCancel}>Cancel</Button>
      <Button type="submit" variant="primary">
        {existingFragment ? 'Save Changes' : 'Create Fragment'}
      </Button>
    </div>
  </form>
</div>