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

  const resourceOptions = [
  ...new Set([
    ...norscaData.map((item: NorscaData) => item.Input.replace(/\s*\(\d+k?\)$/, '')),
    ...refiningData.map((item) => item.Input),
    'Grain Steel',
    'Pig Iron',
    'Cuprum'
  ])
].sort();
const resourceImageMap = new Map<string, string>([
  ...norscaData.map((item: NorscaData): [string, string] => [item.Input.replace(/\s*\(\d+k?\)$/, ''), item['Image Path']]),
  ...refiningData.map((item): [string, string] => [item.Output, item['Image Path']]),
  ...refiningData.map((item): [string, string] => [item.Input, item['Image Path']]),
  ['Pig Iron', 'pig_iron.jpg'],
  ['Cuprum', 'cuprum.jpg'],
  ['Messing', 'messing.jpg'],
  ['Grain Steel', 'grain_steel.jpg'],
  ['Tungsteel', 'tungsteel.jpg'],
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
  <h1>Refiner Calculator</h1>

  <div class="main-page-link">
    <div class="grid-item">
      <a href="/">
        <span class="item-text">Go to Home Page</span>
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
    background-color: #1e1e1e;
    color: #ffffff;
    font-family: Arial, sans-serif;
    margin: 0;
    padding: 0;
  }

  main {
    max-width: 1000px;
    margin: 0 auto;
    padding: 2rem;
  }

  h1 {
    color: #ffc72c;
    text-align: center;
    margin-bottom: 2rem;
  }

  .main-page-link {
    display: flex;
    justify-content: center;
    margin: 2rem 0;
  }

  .main-page-link .grid-item {
    background-color: #2e2e2e;
    border: 2px solid #444;
    border-radius: 4px;
    padding: 15px 30px;
    text-align: center;
    cursor: pointer;
    transition: all 0.3s ease;
  }

  .main-page-link .grid-item:hover {
    background-color: #3e3e3e;
    border-color: #ffc72c;
  }

  .main-page-link a {
    color: #ffc72c;
    text-decoration: none;
    font-size: 1.1rem;
  }

  .main-page-link .item-text {
    display: block;
    padding: 5px 0;
  }

  .input-group {
    margin-bottom: 1rem;
  }

  label {
    display: block;
    margin-bottom: 0.5rem;
    color: #ffc72c;
  }

  input[type='text'],
  input[type='number'],
  select {
    width: 100%;
    padding: 0.5rem;
    border: none;
    border-radius: 4px;
    background-color: #2e2e2e;
    color: #ffffff;
  }

  button {
    display: block;
    width: 100%;
    padding: 0.75rem;
    background-color: #da291c;
    color: #ffffff;
    border: none;
    border-radius: 4px;
    font-size: 1rem;
    cursor: pointer;
    transition: background-color 0.3s ease;
  }

  button:hover {
    background-color: #b71c1c;
  }

  .result {
    margin-top: 2rem;
    padding: 1rem;
    background-color: #2e2e2e;
    border-radius: 4px;
  }

  .result h2 {
    color: #ffc72c;
    margin-top: 0;
  }

  pre {
    white-space: pre-wrap;
    word-break: break-word;
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
    background: #2e2e2e;
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
    background: #ffc72c;
    cursor: pointer;
  }

  .slider::-moz-range-thumb {
    width: 25px;
    height: 25px;
    border-radius: 50%;
    background: #ffc72c;
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
    background-color: #2e2e2e;
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
    background-color: #3e3e3e;
  }

  .grid-item.selected {
    border-color: #ffc72c;
    background-color: #3e3e3e;
  }

  .item-text {
    text-align: center;
    word-break: break-word;
    padding-top: 5px;
    position: relative;
  }

  .resource-grid {
    display: grid;
    grid-template-columns: repeat(6, 1fr);
    gap: 12px;
    max-height: 600px;
    padding-right: 12px;
  }

  /* Add styles for the scrollbar */
  .resource-grid::-webkit-scrollbar {
    width: 10px;
  }

  .resource-grid::-webkit-scrollbar-track {
    background: #2e2e2e;
  }

  .resource-grid::-webkit-scrollbar-thumb {
    background: #888;
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
    width: 30px;
    height: 30px;
    object-fit: cover;
  }

  .resource-grid .item-text {
    font-size: 0.85rem;
    margin-top: 5px;
  }
</style>
