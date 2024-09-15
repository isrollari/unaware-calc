<script lang="ts">
  import { calculateResources } from '$lib/calculations';
  import refiningData from '$lib/refining.json';
  import norscaData from '$lib/norsca.json';

  let resourceName = '';
  let quantity = 1;
  let isOghmir = false;
  let removedTools: Set<string> = new Set();
  let removedResources = '';
  let result = '';

  // Extract unique output resources from refining.json
  const resourceOptions = [...new Set(refiningData.map(item => item.Output))].sort();

  // Extract unique tools from norsca.json
  const toolOptions = [...new Set(norscaData.map(item => item.Tool))].sort();

  function toggleTool(tool: string) {
    if (removedTools.has(tool)) {
      removedTools.delete(tool);
    } else {
      removedTools.add(tool);
    }
    removedTools = new Set(removedTools); // Trigger reactivity
  }

  function handleCalculate() {
    const resourcesList = removedResources.split(',').map(r => r.trim()).filter(Boolean);
    result = calculateResources(resourceName, quantity, isOghmir, Array.from(removedTools), resourcesList);
  }
</script>

<main>
  <h1>Resource Calculator</h1>
  
  <div class="input-group">
    <label for="resourceName">Resource Name:</label>
    <select id="resourceName" bind:value={resourceName}>
      <option value="">Select a resource</option>
      {#each resourceOptions as option}
        <option value={option}>{option}</option>
      {/each}
    </select>
  </div>
  
  <div class="input-group">
    <label for="quantity">Quantity:</label>
    <input id="quantity" bind:value={quantity} type="number" min="1" />
  </div>
  
  <div class="input-group checkbox">
    <label>
      <input type="checkbox" bind:checked={isOghmir} />
      Is Oghmir
    </label>
  </div>
  
  <div class="input-group">
    <label>Removed Tools:</label>
    <div class="tool-grid">
      {#each toolOptions as tool}
        <div 
          class="tool-item" 
          class:selected={removedTools.has(tool)} 
          on:click={() => toggleTool(tool)}
        >
          <span class="tool-text">{tool}</span>
    </div>
      {/each}
  </div>
  </div>
  
  <div class="input-group">
    <label for="removedResources">Removed Resources (comma-separated):</label>
    <input id="removedResources" bind:value={removedResources} type="text" />
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
    max-width: 800px;
    margin: 0 auto;
    padding: 2rem;
  }

  h1 {
    color: #ffc72c;
    text-align: center;
    margin-bottom: 2rem;
  }

  .input-group {
    margin-bottom: 1rem;
  }

  label {
    display: block;
    margin-bottom: 0.5rem;
    color: #ffc72c;
  }

  input[type="text"],
  input[type="number"],
  select {
    width: 100%;
    padding: 0.5rem;
    border: none;
    border-radius: 4px;
    background-color: #2e2e2e;
    color: #ffffff;
  }

  .checkbox label {
    display: flex;
    align-items: center;
    cursor: pointer;
  }

  .checkbox input[type="checkbox"] {
    margin-right: 0.5rem;
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

  select[multiple] {
    height: 100px;
    overflow-y: auto;
  }

  small {
    display: block;
    margin-top: 0.25rem;
    color: #ffc72c;
    font-size: 0.8rem;
  }

  .tool-grid {
    display: grid;
    grid-template-columns: repeat(auto-fill, minmax(120px, 1fr));
    gap: 10px;
    margin-top: 10px;
  }

  .tool-item {
    background-color: #2e2e2e;
    border: 2px solid #444;
    border-radius: 4px;
    padding: 10px;
    text-align: center;
    cursor: pointer;
    transition: all 0.3s ease;
  }

  .tool-item:hover {
    background-color: #3e3e3e;
  }

  .tool-item.selected {
    border-color: #ffc72c;
    background-color: #3e3e3e;
  }

  .tool-text {
    position: relative;
  }

  .selected .tool-text::after {
    content: '';
    position: absolute;
    left: 0;
    right: 0;
    top: 50%;
    border-top: 2px solid #ffc72c;
  }
</style>