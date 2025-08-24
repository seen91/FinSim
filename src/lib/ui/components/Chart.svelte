<script lang="ts">
  import { onMount } from 'svelte';
  import * as d3 from 'd3';
  import { projections } from '$lib/core/stores';
  
  let chartElement: HTMLElement;
  
  $: if (chartElement && $projections) {
    drawChart($projections);
  }
  
  function drawChart(data: any[]) {
    // Clear previous chart
    d3.select(chartElement).selectAll("*").remove();
    
    if (data.length === 0) {
      showPlaceholder();
      return;
    }
    
    renderProjectionChart(data);
  }
  
  function showPlaceholder() {
    const svg = d3.select(chartElement)
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
    
    const svg = d3.select(chartElement)
      .append("svg")
      .attr("width", "100%")
      .attr("height", "100%")
      .attr("viewBox", `0 0 800 400`);
    
    const g = svg.append("g")
      .attr("transform", `translate(${margin.left},${margin.top})`);
    
    // Aggregate data by year
    const aggregatedData = d3.rollup(
      data,
      v => d3.sum(v, d => d.value),
      d => d.year
    );
    
    const lineData = Array.from(aggregatedData, ([year, value]) => ({ year, value }))
      .sort((a, b) => a.year - b.year);
    
    // Create scales
    const xScale = d3.scaleLinear()
      .domain(d3.extent(lineData, d => d.year) as [number, number])
      .range([0, width]);
    
    const yScale = d3.scaleLinear()
      .domain([0, d3.max(lineData, d => d.value) as number])
      .range([height, 0]);
    
    // Add grid lines
    addGridLines(g, xScale, yScale, width, height);
    
    // Add projection line
    addProjectionLine(g, lineData, xScale, yScale);
    
    // Add axes
    addAxes(g, xScale, yScale, height);
    
    // Add labels and title
    addLabelsAndTitle(svg, lineData);
  }
  
  function addGridLines(g: any, xScale: any, yScale: any, width: number, height: number) {
    g.append("g")
      .attr("class", "grid")
      .attr("transform", `translate(0,${height})`)
      .call(d3.axisBottom(xScale)
        .tickSize(-height)
        .tickFormat(() => ""))
      .style("stroke-dasharray", "3,3")
      .style("opacity", 0.3);
    
    g.append("g")
      .attr("class", "grid")
      .call(d3.axisLeft(yScale)
        .tickSize(-width)
        .tickFormat(() => ""))
      .style("stroke-dasharray", "3,3")
      .style("opacity", 0.3);
  }
  
  function addProjectionLine(g: any, lineData: any[], xScale: any, yScale: any) {
    const line = d3.line<any>()
      .x(d => xScale(d.year))
      .y(d => yScale(d.value))
      .curve(d3.curveMonotoneX);
    
    g.append("path")
      .datum(lineData)
      .attr("fill", "none")
      .attr("stroke", "#4ade80")
      .attr("stroke-width", 3)
      .attr("d", line);
  }
  
  function addAxes(g: any, xScale: any, yScale: any, height: number) {
    g.append("g")
      .attr("transform", `translate(0,${height})`)
      .call(d3.axisBottom(xScale).tickFormat((d: any) => d3.format("d")(d)))
      .style("color", "#888");
    
    g.append("g")
      .call(d3.axisLeft(yScale).tickFormat((d: any) => `$${((d as number) / 1000)}k`))
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
    
    svg.append("text")
      .attr("x", 30)
      .attr("y", 200)
      .attr("text-anchor", "middle")
      .attr("fill", "#888")
      .style("font-size", "14px")
      .attr("transform", "rotate(-90 30 200)")
      .text("Value ($)");
    
    const finalValue = lineData[lineData.length - 1]?.value || 0;
    svg.append("text")
      .attr("x", 400)
      .attr("y", 30)
      .attr("text-anchor", "middle")
      .attr("fill", "#4ade80")
      .style("font-size", "28px")
      .style("font-weight", "bold")
      .text(`$${(finalValue / 1000).toFixed(0)}k`);
  }
</script>

<div bind:this={chartElement} class="chart-container"></div>

<style>
  .chart-container {
    width: 100%;
    height: 100%;
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
</style>
