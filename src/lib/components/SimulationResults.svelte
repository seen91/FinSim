<script lang="ts">
  import { onMount } from 'svelte';
  import type { SimulationDataPoint } from '../utils/financialCalculations';
  import { formatCurrency, formatPercentage, formatCompactNumber, formatYearMonth } from '../utils/format';
  import type { SimulationSettings } from '../stores/simulationStore';
  import Button from './Button.svelte';
  
  // Check if running in browser environment
  const isBrowser = typeof window !== 'undefined';
  
  // Only import Chart.js in browser environment
  let Chart: any;
  if (isBrowser) {
    import('chart.js/auto').then(module => {
      Chart = module.default;
      // If we already have results and the chart element is available, create the chart
      if (results.length && chartElement) {
        createChart();
      }
    });
  }
  
  // Props
  export let results: SimulationDataPoint[] = [];
  export let settings: SimulationSettings;
  export let fragmentName: string = 'Simulation Results';
  
  // Local state
  let finalBalance: number = 0;
  let totalContributions: number = 0;
  let totalEarnings: number = 0;
  let realFinalBalance: number = 0;
  let inflationImpact: number = 0;
  let summaryData: { year: number, balance: number, realBalance: number }[] = [];
  
  // Chart instance
  let chartElement: HTMLCanvasElement;
  let chart: any;
  
  // Process results to extract summary data
  $: if (results.length) {
    const lastResult = results[results.length - 1];
    finalBalance = lastResult.balance;
    totalContributions = lastResult.contributions;
    realFinalBalance = lastResult.realBalance;
    inflationImpact = finalBalance - realFinalBalance;
    totalEarnings = finalBalance - totalContributions;
    
    // Create yearly summary data for the chart
    summaryData = results
      .filter(result => result.month === 11 || (result.year === 0 && result.month === 0))
      .map(result => ({
        year: result.year,
        balance: result.balance,
        realBalance: result.realBalance
      }));
      
    // If chart is initialized, update it
    if (chart) {
      updateChart();
    }
  }
  
  onMount(() => {
    // Only create charts in browser environment
    if (isBrowser && Chart && results.length) {
      createChart();
    }
    
    return () => {
      // Clean up the chart when the component is destroyed
      if (chart) {
        chart.destroy();
      }
    };
  });
  
  function createChart() {
    if (!isBrowser || !Chart || !chartElement) return;
    
    const ctx = chartElement.getContext('2d');
    
    if (!ctx) {
      console.error('Could not get canvas context');
      return;
    }
    
    chart = new Chart(ctx, {
      type: 'line',
      data: {
        labels: summaryData.map(d => `Year ${d.year}`),
        datasets: [
          {
            label: 'Balance',
            data: summaryData.map(d => d.balance),
            borderColor: 'rgb(59, 130, 246)',
            backgroundColor: 'rgba(59, 130, 246, 0.1)',
            tension: 0.1,
            fill: true
          },
          {
            label: 'Real Balance (Inflation Adjusted)',
            data: summaryData.map(d => d.realBalance),
            borderColor: 'rgb(249, 115, 22)',
            backgroundColor: 'rgba(249, 115, 22, 0.1)',
            borderDash: [5, 5],
            tension: 0.1,
            fill: false
          }
        ]
      },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        plugins: {
          tooltip: {
            callbacks: {
              label: function(context) {
                let label = context.dataset.label || '';
                if (label) {
                  label += ': ';
                }
                if (context.parsed.y !== null) {
                  label += formatCurrency(context.parsed.y);
                }
                return label;
              }
            }
          },
          title: {
            display: true,
            text: fragmentName,
            font: {
              size: 16
            }
          },
          legend: {
            position: 'top'
          }
        },
        scales: {
          x: {
            title: {
              display: true,
              text: 'Time'
            }
          },
          y: {
            title: {
              display: true,
              text: 'Value'
            },
            ticks: {
              callback: function(value) {
                return formatCompactNumber(value as number);
              }
            }
          }
        }
      }
    });
  }
  
  function updateChart() {
    if (!chart) return;
    
    chart.data.labels = summaryData.map(d => `Year ${d.year}`);
    chart.data.datasets[0].data = summaryData.map(d => d.balance);
    chart.data.datasets[1].data = summaryData.map(d => d.realBalance);
    chart.options.plugins.title.text = fragmentName;
    chart.update();
  }
  
  function downloadCsv() {
    if (!isBrowser) return;
    
    const headers = ['Year', 'Month', 'Balance', 'Contributions', 'Earnings', 'Inflation', 'Real Balance'];
    const csvRows = [
      headers.join(','),
      ...results.map(row => [
        row.year,
        row.month + 1,
        row.balance.toFixed(2),
        row.contributions.toFixed(2),
        row.earnings.toFixed(2),
        row.inflation.toFixed(4),
        row.realBalance.toFixed(2)
      ].join(','))
    ];
    
    const csvContent = csvRows.join('\n');
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    
    const link = document.createElement('a');
    link.setAttribute('href', url);
    link.setAttribute('download', `${fragmentName.replace(/\s+/g, '_')}_results.csv`);
    link.click();
  }
</script>

<div class="bg-white p-6 rounded-lg shadow-md">
  <div class="flex flex-col md:flex-row justify-between mb-6">
    <h2 class="text-2xl font-semibold">{fragmentName}</h2>
    
    <div class="mt-2 md:mt-0">
      <Button variant="outline" size="sm" on:click={downloadCsv}>
        Download CSV
      </Button>
    </div>
  </div>

  <!-- Summary Cards -->
  {#if results.length}
    <div class="grid grid-cols-1 md:grid-cols-3 gap-4 mb-8">
      <div class="bg-blue-50 p-4 rounded-lg">
        <h3 class="text-lg font-medium text-blue-900 mb-1">Final Balance</h3>
        <p class="text-2xl font-bold text-blue-700">{formatCurrency(finalBalance)}</p>
        <p class="text-sm text-blue-600 mt-1">
          After {settings.years} years
        </p>
      </div>
      
      <div class="bg-green-50 p-4 rounded-lg">
        <h3 class="text-lg font-medium text-green-900 mb-1">Total Contributions</h3>
        <p class="text-2xl font-bold text-green-700">{formatCurrency(totalContributions)}</p>
        <p class="text-sm text-green-600 mt-1">
          Initial: {formatCurrency(settings.initialAmount)} + 
          Monthly: {formatCurrency(settings.monthlyContribution)}
        </p>
      </div>
      
      <div class="bg-purple-50 p-4 rounded-lg">
        <h3 class="text-lg font-medium text-purple-900 mb-1">Total Earnings</h3>
        <p class="text-2xl font-bold text-purple-700">{formatCurrency(totalEarnings)}</p>
        <p class="text-sm text-purple-600 mt-1">
          Growth: {formatPercentage(totalEarnings / totalContributions)}
        </p>
      </div>
    </div>
    
    <!-- Additional Stats -->
    <div class="grid grid-cols-1 md:grid-cols-2 gap-4 mb-8">
      <div class="bg-gray-50 p-4 rounded-lg">
        <h3 class="text-lg font-medium text-gray-900 mb-1">Inflation-Adjusted Value</h3>
        <p class="text-2xl font-bold text-gray-700">{formatCurrency(realFinalBalance)}</p>
        <p class="text-sm text-gray-600 mt-1">
          Inflation Rate: {formatPercentage(settings.inflationRate)}
        </p>
      </div>
      
      <div class="bg-orange-50 p-4 rounded-lg">
        <h3 class="text-lg font-medium text-orange-900 mb-1">Inflation Impact</h3>
        <p class="text-2xl font-bold text-orange-700">{formatCurrency(inflationImpact)}</p>
        <p class="text-sm text-orange-600 mt-1">
          {formatPercentage(inflationImpact / finalBalance)} of final value
        </p>
      </div>
    </div>
  {/if}
  
  <!-- Chart visualization -->
  <div class="h-80 mt-6">
    <canvas bind:this={chartElement}></canvas>
    {#if !isBrowser}
      <p class="text-center text-gray-500 mt-4">
        Chart will be displayed in browser
      </p>
    {/if}
  </div>
  
  <!-- Table of yearly results -->
  {#if summaryData.length > 0}
    <div class="mt-8">
      <h3 class="text-lg font-medium mb-4">Yearly Summary</h3>
      <div class="overflow-x-auto">
        <table class="min-w-full divide-y divide-gray-200">
          <thead class="bg-gray-50">
            <tr>
              <th class="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Year
              </th>
              <th class="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Balance
              </th>
              <th class="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Real Balance
              </th>
            </tr>
          </thead>
          <tbody class="bg-white divide-y divide-gray-200">
            {#each summaryData as data}
              <tr>
                <td class="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                  Year {data.year}
                </td>
                <td class="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                  {formatCurrency(data.balance)}
                </td>
                <td class="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                  {formatCurrency(data.realBalance)}
                </td>
              </tr>
            {/each}
          </tbody>
        </table>
      </div>
    </div>
  {/if}
</div>