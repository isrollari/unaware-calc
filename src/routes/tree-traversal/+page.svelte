<script lang="ts">
  import { traverseDownstream, getResourceByName } from '$lib/tree_traversal';
  import type { NorscaData } from '$lib/types';
  import norscaData from '$lib/norsca.json';
  import refiningData from '$lib/refining.json';

  let resourceName = '';
  let quantity = 1;
  let maxDepth = 1;
  let asOghmir = false;
  let result = '';

  const resourceOptions = [...new Set(norscaData.map((item: NorscaData) => item.Input.replace(/\s*\(\d+k?\)$/, '')))].sort();
  const resourceImageMap = new Map([
  ...norscaData.map((item: NorscaData) => [item.Input.replace(/\s*\(\d+k?\)$/, ''), item['Image Path']]),
  ...refiningData.map((item) => [item.Output, item['Image Path']])
]);

  function handleCalculate() {
    const resource = getResourceByName(resourceName);
    result = traverseDownstream(
      { resource, amount: quantity },
      maxDepth,
      asOghmir
    );
  }

  function handleSliderChange(event: Event, variable: 'quantity' | 'maxDepth') {
    const value = parseInt((event.target as HTMLInputElement).value);
    if (variable === 'quantity') {
    quantity = snapToClosest(value, [0, 2500, 5000, 7500, 10000]);
    } else {
      maxDepth = snapToClosest(value, [1, 2, 3, 4, 5, 6, 7, 8, 9, 10]);
  }
  }

  function snapToClosest(value: number, snapPoints: number[]): number {
    const closest = snapPoints.reduce((prev, curr) =>
      Math.abs(curr - value) < Math.abs(prev - value) ? curr : prev
    );
    return Math.abs(value - closest) < (snapPoints[1] - snapPoints[0]) / 2 ? closest : value;
  }

  function selectResource(resource: string) {
    resourceName = resource;
  }
</script>

<main>
  <h1>Downstream Traversal</h1>

  <div class="main-page-link">
    <div class="grid-item">
      <a href="/">
        <span class="item-text">Go to Resource Calculator</span>
      </a>
    </div>
  </div>

  <div class="input-group">
  <label>Resource:</label>
  <div class="grid-select resource-grid">
    {#each resourceOptions as resource}
      <div
        class="grid-item"
        class:selected={resourceName === resource}
        on:click={() => selectResource(resource)}
      >
        {#if resourceImageMap.has(resource)}
          <img src={resourceImageMap.get(resource)} alt={resource} class="resource-icon" />
        {/if}
        <span class="item-text">{resource}</span>
      </div>
    {/each}
  </div>
</div>

  <div class="input-group">
    <label for="quantity">Quantity:</label>
    <div class="quantity-input">
      <input
        id="quantity"
        bind:value={quantity}
        type="number"
        min="0"
        max="10000"
      />
      <input
        type="range"
        min="0"
        max="10000"
        bind:value={quantity}
        on:input={(event) => handleSliderChange(event, 'quantity')}
        class="slider"
      />
    </div>
  </div>

  <div class="input-group">
    <label for="maxDepth">Max Depth:</label>
    <div class="quantity-input">
      <input
        id="maxDepth"
        bind:value={maxDepth}
        type="number"
        min="1"
        max="10"
      />
      <input
        type="range"
        min="1"
        max="10"
        bind:value={maxDepth}
        on:input={(event) => handleSliderChange(event, 'maxDepth')}
        class="slider"
      />
    </div>
  </div>

  <div class="input-group-oghmir">
    <label>Is Oghmir:</label>
    <div class="grid-select oghmir-grid">
      <div
        class="grid-item"
        class:selected={asOghmir}
        on:click={() => asOghmir = !asOghmir}
      >
        <span class="item-text">Oghmir</span>
      </div>
    </div>
  </div>

  <button on:click={handleCalculate}>Calculate</button>

  {#if result}
    <div class="result">
      <h2>Result:</h2>
      <pre>{result}</pre>
    </div>
  {/if}
</main>

<style>
  :global(body) {
    background-color: #0a0a0a;
    color: #d0d0d0;
    font-family: 'Cinzel', serif;
    margin: 0;
    padding: 0;
  }

  main {
    max-width: 1000px;
    margin: 0 auto;
    padding: 2rem;
  }

  h1 {
    color: #c9aa71;
    text-align: center;
    margin-bottom: 2rem;
    text-transform: uppercase;
    letter-spacing: 2px;
    text-shadow: 0 0 10px rgba(201, 170, 113, 0.5);
  }

  .input-group {
    margin-bottom: 1.5rem;
  }

  label {
    display: block;
    margin-bottom: 0.5rem;
    color: #c9aa71;
    font-weight: bold;
  }

  input[type='text'],
  input[type='number'],
  select {
    width: 100%;
    padding: 0.75rem;
    border: 1px solid #444;
    border-radius: 4px;
    background-color: #1a1a1a;
    color: #d0d0d0;
    font-family: 'Cinzel', serif;
  }

  button {
    display: block;
    width: 100%;
    padding: 1rem;
    background-color: #8b0000;
    color: #ffffff;
    border: none;
    border-radius: 4px;
    font-size: 1rem;
    cursor: pointer;
    transition: background-color 0.3s ease;
    font-family: 'Cinzel', serif;
    text-transform: uppercase;
    letter-spacing: 1px;
    font-weight: bold;
  }

  button:hover {
    background-color: #a52a2a;
  }

  .result {
    margin-top: 2rem;
    padding: 1.5rem;
    background-color: #1a1a1a;
    border-radius: 4px;
    border: 1px solid #444;
  }

  .result h2 {
    color: #c9aa71;
    margin-top: 0;
    text-transform: uppercase;
    letter-spacing: 1px;
  }

  pre {
    white-space: pre-wrap;
    word-break: break-word;
    color: #d0d0d0;
  }

  .quantity-input {
    display: flex;
    flex-direction: column;
    gap: 10px;
  }

  .quantity-input input[type="number"] {
    width: 100%;
  }

  .slider {
    -webkit-appearance: none;
    width: 100%;
    height: 15px;
    border-radius: 5px;
    background: #1a1a1a;
    outline: none;
    opacity: 0.7;
    transition: opacity .2s;
  }

  .slider:hover {
    opacity: 1;
  }

  .slider::-webkit-slider-thumb {
    -webkit-appearance: none;
    appearance: none;
    width: 25px;
    height: 25px;
    border-radius: 50%;
    background: #c9aa71;
    cursor: pointer;
  }

  .slider::-moz-range-thumb {
    width: 25px;
    height: 25px;
    border-radius: 50%;
    background: #c9aa71;
    cursor: pointer;
  }

  .input-group-oghmir {
    margin-bottom: 1rem;
  }

  .oghmir-grid {
    grid-template-columns: 1fr;
  }

  .grid-select {
    display: grid;
    gap: 10px;
    margin-top: 10px;
  }

  .grid-item {
    background-color: #1a1a1a;
    border: 2px solid #444;
    border-radius: 4px;
    padding: 10px;
    text-align: center;
    cursor: pointer;
    transition: all 0.3s ease;
    position: relative;
    display: flex;
    flex-direction: column;
    align-items: center;
    justify-content: center;
    min-height: 60px;
  }

  .grid-item:hover {
    background-color: #2a2a2a;
    border-color: #c9aa71;
  }

  .grid-item.selected {
    border-color: #c9aa71;
    background-color: #2a2a2a;
    box-shadow: 0 0 10px rgba(201, 170, 113, 0.5);
  }

  .item-text {
    text-align: center;
    word-break: break-word;
    padding-top: 5px;
    position: relative;
    color: #d0d0d0;
  }

  .resource-grid {
    display: grid;
    grid-template-columns: repeat(6, 1fr);
    gap: 12px;
    max-height: 450px;
    overflow-y: auto;
    padding-right: 12px;
  }

  .resource-grid::-webkit-scrollbar {
    width: 10px;
  }

  .resource-grid::-webkit-scrollbar-track {
    background: #1a1a1a;
  }

  .resource-grid::-webkit-scrollbar-thumb {
    background: #444;
    border-radius: 5px;
  }

  .resource-grid::-webkit-scrollbar-thumb:hover {
    background: #555;
  }

  .resource-grid .grid-item {
    padding: 8px;
    min-height: 80px;
  }

  .resource-icon {
    width: 40px;
    height: 40px;
    object-fit: cover;
    margin-bottom: 5px;
  }

  .resource-grid .item-text {
    font-size: 0.85rem;
    margin-top: 5px;
  }

  .tree-traversal-link,
  .main-page-link {
    display: flex;
    justify-content: center;
    margin: 2rem 0;
  }

  .tree-traversal-link .grid-item,
  .main-page-link .grid-item {
    background-color: #1a1a1a;
    border: 2px solid #444;
    border-radius: 4px;
    padding: 15px 30px;
    text-align: center;
    cursor: pointer;
    transition: all 0.3s ease;
  }

  .tree-traversal-link .grid-item:hover,
  .main-page-link .grid-item:hover {
    background-color: #2a2a2a;
    border-color: #c9aa71;
  }

  .tree-traversal-link a,
  .main-page-link a {
    color: #c9aa71;
    text-decoration: none;
    font-size: 1.1rem;
    text-transform: uppercase;
    letter-spacing: 1px;
  }
</style>
