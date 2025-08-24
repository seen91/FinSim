<script lang="ts">
  import { onMount } from 'svelte';
  // Import only the D3 modules we actually use to reduce bundle size
  import { select } from 'd3-selection';
  import { scaleLinear } from 'd3-scale';
  import { extent, max, sum, rollup } from 'd3-array';
  import { line, curveMonotoneX } from 'd3-shape';
  import { axisBottom, axisLeft } from 'd3-axis';
  import { format } from 'd3-format';
  import { projections } from '$lib/core/stores';
  
  let chartElement: HTMLElement;
  let tooltip: HTMLElement;
  
  $: if (chartElement && $projections) {
    drawChart($projections);
  }
  
  function drawChart(data: any[]) {
    // Clear previous chart
    select(chartElement).selectAll("*").remove();
    
    if (data.length === 0) {
      showPlaceholder();
      return;
    }
    
    renderProjectionChart(data);
  }
  
  function showPlaceholder() {
    const svg = select(chartElement)
      .append("svg")
      .attr("width", "100%")
      .attr("height", "100%")
      .attr("viewBox", "0 0 800 400");
      
    svg.append("text")
      .attr("x", 400)
      .attr("y", 200)
      .attr("text-anchor", "middle")
      .attr("fill", "#666")
      .style("font-size", "18px")
      .text("Add cards to see projections");
  }
  
  function renderProjectionChart(data: any[]) {
    const margin = { top: 40, right: 80, bottom: 60, left: 80 };
    const width = 800 - margin.left - margin.right;
    const height = 400 - margin.top - margin.bottom;
    
    const svg = select(chartElement)
      .append("svg")
      .attr("width", "100%")
      .attr("height", "100%")
      .attr("viewBox", `0 0 800 400`);
    
    const g = svg.append("g")
      .attr("transform", `translate(${margin.left},${margin.top})`);
    
    // Aggregate data by year
    const aggregatedData = rollup(
      data,
      v => sum(v, d => d.value),
      d => d.year
    );
    
    const lineData = Array.from(aggregatedData, ([year, value]) => ({ year, value }))
      .sort((a, b) => a.year - b.year);
    
    // Create scales
    const xScale = scaleLinear()
      .domain(extent(lineData, d => d.year) as [number, number])
      .range([0, width]);
    
    const yScale = scaleLinear()
      .domain([0, max(lineData, d => d.value) as number])
      .range([height, 0]);
    
    // Add grid lines
    addGridLines(g, xScale, yScale, width, height);
    
    // Add projection line
    addProjectionLine(g, lineData, xScale, yScale);
    
    // Add interactive dots
    addInteractiveDots(g, lineData, xScale, yScale);
    
    // Add axes
    addAxes(g, xScale, yScale, height);
    
    // Add labels and title
    addLabelsAndTitle(svg, lineData);
  }
  
  function addGridLines(g: any, xScale: any, yScale: any, width: number, height: number) {
    g.append("g")
      .attr("class", "grid")
      .attr("transform", `translate(0,${height})`)
      .call(axisBottom(xScale)
        .tickSize(-height)
        .tickFormat(() => ""))
      .style("stroke-dasharray", "3,3")
      .style("opacity", 0.3);
    
    g.append("g")
      .attr("class", "grid")
      .call(axisLeft(yScale)
        .tickSize(-width)
        .tickFormat(() => ""))
      .style("stroke-dasharray", "3,3")
      .style("opacity", 0.3);
  }
  
  function addProjectionLine(g: any, lineData: any[], xScale: any, yScale: any) {
    const lineGenerator = line<any>()
      .x(d => xScale(d.year))
      .y(d => yScale(d.value))
      .curve(curveMonotoneX);
    
    g.append("path")
      .datum(lineData)
      .attr("fill", "none")
      .attr("stroke", "#4ade80")
      .attr("stroke-width", 3)
      .attr("d", lineGenerator);
  }
  
  function addInteractiveDots(g: any, lineData: any[], xScale: any, yScale: any) {
    g.selectAll(".dot")
      .data(lineData)
      .enter().append("circle")
      .attr("class", "dot")
      .attr("cx", (d: any) => xScale(d.year))
      .attr("cy", (d: any) => yScale(d.value))
      .attr("r", 4)
      .attr("fill", "#4ade80")
      .attr("stroke", "#fff")
      .attr("stroke-width", 2)
      .style("cursor", "pointer")
      .on("mouseover", (event: any, d: any) => {
        showTooltip(event, d);
        select(event.target as SVGCircleElement).attr("r", 6);
      })
      .on("mouseout", (event: any, d: any) => {
        hideTooltip();
        select(event.target as SVGCircleElement).attr("r", 4);
      });
  }
  
  function showTooltip(event: any, data: any) {
    if (!tooltip) return;
    
    const formattedValue = format("$,.0f")(data.value);
    tooltip.innerHTML = `Year: ${data.year}<br/>Value: ${formattedValue}`;
    
    tooltip.style.display = 'block';
    
    // Get chart container position
    const rect = chartElement.getBoundingClientRect();
    
    // Use clientX/clientY for consistent cross-browser positioning
    const mouseX = event.clientX;
    const mouseY = event.clientY;
    
    // Calculate tooltip position relative to viewport
    let left = mouseX + 10;
    let top = mouseY - 35;
    
    // Get tooltip dimensions for better boundary checking
    const tooltipRect = tooltip.getBoundingClientRect();
    const tooltipWidth = tooltipRect.width || 120; // fallback width
    const tooltipHeight = tooltipRect.height || 40; // fallback height
    
    // Boundary checking - keep tooltip within viewport
    if (left + tooltipWidth > window.innerWidth) {
      left = mouseX - tooltipWidth - 10;
    }
    
    if (top < 0) {
      top = mouseY + 10;
    }
    
    if (top + tooltipHeight > window.innerHeight) {
      top = mouseY - tooltipHeight - 10;
    }
    
    tooltip.style.left = left + 'px';
    tooltip.style.top = top + 'px';
  }
  
  function hideTooltip() {
    if (!tooltip) return;
    tooltip.style.display = 'none';
  }
  
  function addAxes(g: any, xScale: any, yScale: any, height: number) {
    g.append("g")
      .attr("transform", `translate(0,${height})`)
      .call(axisBottom(xScale).tickFormat((d: any) => format("d")(d)))
      .style("color", "#888");
    
    g.append("g")
      .call(axisLeft(yScale).tickFormat((d: any) => `$${((d as number) / 1000)}k`))
      .style("color", "#888");
  }
  
  function addLabelsAndTitle(svg: any, lineData: any[]) {
    svg.append("text")
      .attr("x", 400)
      .attr("y", 380)
      .attr("text-anchor", "middle")
      .attr("fill", "#888")
      .style("font-size", "14px")
      .text("Year");
    
    // Y-axis label removed to save space and reduce clutter
    // Final value display removed to save space
  }
</script>

<div bind:this={chartElement} class="chart-container"></div>
<div bind:this={tooltip} class="tooltip"></div>

<style>
  .chart-container {
    width: 100%;
    height: 100%;
  }
  
  .tooltip {
    position: fixed;
    display: none;
    background: rgba(0, 0, 0, 0.9);
    color: white;
    padding: 8px 12px;
    border-radius: 4px;
    font-size: 12px;
    pointer-events: none;
    z-index: 1000;
    box-shadow: 0 2px 8px rgba(0, 0, 0, 0.3);
    white-space: nowrap;
  }
  
  :global(.chart-container svg) {
    display: block;
  }
  
  :global(.grid line) {
    stroke: #444;
  }
  
  :global(.grid path) {
    stroke-width: 0;
  }
  
  :global(.dot) {
    transition: r 0.2s ease;
  }
</style>
