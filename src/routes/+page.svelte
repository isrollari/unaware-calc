<script lang="ts">
	import { calculateResources } from '$lib/calculations';
	import refiningData from '$lib/refining.json';
	import norscaData from '$lib/norsca.json';

	let resourceName = '';
	let quantity = 1;
	let isOghmir = false;
	let removedTools: Set<string> = new Set();
	let removedResources: Set<string> = new Set();
	let result = '';

	// Extract unique output resources from refining.json
	const resourceOptions = [...new Set(refiningData.map((item) => item.Output))].sort();

	// Extract unique tools from norsca.json
	const toolOptions = [...new Set(norscaData.map((item) => item.Tool))].sort();

	// Specific resources for removal
	const removableResources = ['Kimurite', 'Cerulite', 'Tephra'];

	// Create a map of Output to Image Path
	const resourceImageMap = new Map(refiningData.map((item) => [item.Output, item['Image Path']]));

	function selectResource(resource: string) {
		resourceName = resource;
	}

	function toggleTool(tool: string) {
		if (removedTools.has(tool)) {
			removedTools.delete(tool);
		} else {
			removedTools.add(tool);
		}
		removedTools = new Set(removedTools); // Trigger reactivity
	}

	function toggleResource(resource: string) {
		if (removedResources.has(resource)) {
			removedResources.delete(resource);
		} else {
			removedResources.add(resource);
		}
		removedResources = new Set(removedResources); // Trigger reactivity
	}

	function handleCalculate() {
		result = calculateResources(
			resourceName,
			quantity,
			isOghmir,
			Array.from(removedTools),
			Array.from(removedResources)
		);
	}

	function handleSliderChange(event: Event) {
		const value = parseInt((event.target as HTMLInputElement).value);
		quantity = snapToClosest(value, [0, 2500, 5000, 7500, 10000]);
	}

	function snapToClosest(value: number, snapPoints: number[]): number {
		const closest = snapPoints.reduce((prev, curr) =>
			Math.abs(curr - value) < Math.abs(prev - value) ? curr : prev
		);
		return Math.abs(value - closest) < 100 ? closest : value;
	}
</script>

<main>
	<h1>Resource Calculator</h1>

	<div class="tree-traversal-link">
		<div class="grid-item">
			<a href="/tree-traversal">
				<span class="item-text">Go to Downstream Traversal</span>
			</a>
		</div>
	</div>

	<div class="input-group">
		<label>Resource Name:</label>
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
				on:input={handleSliderChange}
				class="slider"
			/>
		</div>
	</div>
	<div class="input-group">
		<label>Is Oghmir:</label>
		<div class="grid-select oghmir-grid">
			<div
					class="grid-item"
				class:selected={isOghmir}
				on:click={() => isOghmir = !isOghmir}
				>
				<span class="item-text">Oghmir</span>
				</div>
		</div>
	</div>

	<div class="input-group">
		<label>Removed Tools:</label>
		<div class="grid-select tool-grid">
			{#each toolOptions as tool}
				<div
					class="grid-item"
					class:selected={removedTools.has(tool)}
					on:click={() => toggleTool(tool)}
				>
					<span class="item-text">{tool}</span>
				</div>
			{/each}
		</div>
	</div>

	<div class="input-group">
		<label>Removed Resources:</label>
		<div class="grid-select resource-remove-grid">
			{#each removableResources as resource}
				<div
					class="grid-item"
					class:selected={removedResources.has(resource)}
					on:click={() => toggleResource(resource)}
				>
					<span class="item-text">{resource}</span>
		</div>
			{/each}
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
		margin-bottom: 2rem;
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

	.grid-select {
		display: grid;
		gap: 10px;
		margin-top: 10px;
	}

	.resource-grid {
		grid-template-columns: repeat(4, 1fr);
		grid-template-rows: repeat(2, 1fr);
	}

	.tool-grid {
		grid-template-columns: repeat(4, 1fr);
		grid-template-rows: repeat(3, 1fr);
	}

	.resource-remove-grid {
		grid-template-columns: repeat(3, 1fr);
		grid-template-rows: 1fr;
	}

	.oghmir-grid {
		grid-template-columns: 1fr;
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

  .resource-icon {
    width: 40px;
    height: 40px;
    object-fit: cover;
    margin-bottom: 5px;
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