<script lang="ts">
  import { traverseDownstream, getResourceByName } from '$lib/tree_traversal';
  import type { NorscaData } from '$lib/types';
  import norscaData from '$lib/norsca.json';
  import refiningData from '$lib/refining.json';
  import { calcLayout } from '$lib/calcLayout';

  let resourceName = '';
  let quantity = 10000;
  let maxDepth = 1;
  let asOghmir = false;
  let hasMasteries = false;
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
      { isOghmir: asOghmir, hasMasteries }
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

<main class:split-layout={$calcLayout === 'split'}>
  <h1>What Can I Make?</h1>
  <p class="page-subtitle">Pick a material you already have — see everything it can be processed into, step by step.</p>

  <div class="main-page-link">
    <a href="/" class="grid-item">
        <span class="item-text">Go to Home Page</span>
    </a>
  </div>

  <div class="calc-columns">
  <div class="calc-inputs">

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

  <div class="input-group" title="Limits how many processing steps downstream the tool follows from your starting material. A depth of 1 shows only the immediate next products; higher values reveal further products made from those products, and so on.">
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

  <div class="input-group-oghmir" title="Oghmir characters get a passive +3% bonus to ore yield when extracting resources. Enable this if your character is Oghmir so the calculator accounts for the extra ore produced per extraction.">
    <label>Oghmir clade (+3% ore yield):</label>
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

  <div class="input-group-oghmir" title="Adds a +6% ore yield bonus from trained extraction mastery passives. Enable this if you have the relevant masteries leveled — it stacks multiplicatively with the Oghmir bonus (about +9.2% combined).">
    <label>Masteries (+6% ore yield):</label>
    <div class="grid-select oghmir-grid">
      <div
        class="grid-item"
        class:selected={hasMasteries}
        on:click={() => hasMasteries = !hasMasteries}
      >
        <span class="item-text">Masteries</span>
      </div>
    </div>
  </div>

  <button on:click={handleCalculate}>Calculate</button>

  </div>

  <div class="calc-outputs">
  <div class="output-panel">
  {#if result}
    <div class="result">
      <h2>Result:</h2>
      <pre>{result}</pre>
    </div>
  {:else if $calcLayout === 'split'}
    <p class="output-placeholder">Your results will appear here.<br />Set your options and click Calculate.</p>
  {/if}
  </div>
  </div>

  </div>
</main>

<style>
  .page-subtitle {
    text-align: center;
    color: var(--text-muted);
    font-size: 0.95rem;
    margin: -1rem 0 1.5rem;
  }

  main {
    max-width: 1000px;
    margin: 0 auto;
    padding: 2rem;
  }

  main.split-layout {
    max-width: 1600px;
  }

  .calc-columns {
    display: block;
  }

  main.split-layout .calc-columns {
    display: grid;
    grid-template-columns: minmax(0, 1fr) minmax(0, 1fr);
    gap: 2rem;
    align-items: start;
  }

  .calc-outputs {
    min-width: 0;
  }

  main.split-layout .calc-outputs {
    position: sticky;
    top: 2rem;
    align-self: start;
  }

  main.split-layout .output-panel {
    background-color: var(--surface);
    border: 2px solid var(--border);
    border-radius: 8px;
    padding: 1.5rem 1.75rem;
    min-height: 240px;
    display: flex;
    flex-direction: column;
  }

  main.split-layout .output-panel .result {
    background: none;
    padding: 0;
    margin-top: 0;
    border-radius: 0;
  }

  .output-placeholder {
    margin: auto;
    color: var(--text-muted);
    text-align: center;
    line-height: 1.6;
  }

  h1 {
    color: var(--accent);
    text-align: center;
    margin-bottom: 2rem;
  }

  .main-page-link {
    display: flex;
    justify-content: center;
    margin: 2rem 0;
  }

  .main-page-link .grid-item {
    background-color: var(--surface);
    border: 2px solid var(--border);
    border-radius: 4px;
    padding: 15px 30px;
    text-align: center;
    cursor: pointer;
    transition: all 0.3s ease;
  }

  .main-page-link .grid-item:hover {
    background-color: var(--surface-hover);
    border-color: var(--accent);
  }

  .main-page-link a {
    color: var(--accent);
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
    color: var(--accent);
  }

  input[type='text'],
  input[type='number'],
  select {
    width: 100%;
    padding: 0.5rem;
    border: none;
    border-radius: 4px;
    background-color: var(--surface);
    color: var(--text);
  }

  button {
    display: block;
    width: 100%;
    padding: 0.75rem;
    background-color: var(--btn);
    color: #ffffff;
    border: none;
    border-radius: 4px;
    font-size: 1rem;
    cursor: pointer;
    transition: background-color 0.3s ease;
  }

  button:hover {
    background-color: var(--btn-hover);
  }

  .result {
    margin-top: 2rem;
    padding: 1rem;
    background-color: var(--surface);
    border-radius: 4px;
  }

  .result h2 {
    color: var(--accent);
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
    background: var(--surface);
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
    background: var(--accent);
    cursor: pointer;
  }

  .slider::-moz-range-thumb {
    width: 25px;
    height: 25px;
    border-radius: 50%;
    background: var(--accent);
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
    background-color: var(--surface);
    border: 2px solid var(--border);
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
    background-color: var(--surface-hover);
  }

  .grid-item.selected {
    border-color: var(--accent);
    background-color: var(--surface-hover);
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

  .resource-grid::-webkit-scrollbar {
    width: 10px;
  }

  .resource-grid::-webkit-scrollbar-track {
    background: var(--surface);
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
