<script lang="ts">
	import { calculateResources } from '$lib/calculations';
	import refiningData from '$lib/refining.json';
	import norscaData from '$lib/norsca.json';

	let resourceName = '';
	let quantity = 1;
	let isOghmir = false;
	let useVendor = false;
	let removedTools: Set<string> = new Set();
	let removedResources: Set<string> = new Set();
	let result = '';

	// Extract unique output resources from refining.json
	const resourceOptions = [...new Set(refiningData.map((item) => item.Output))].sort();

	// Extract unique tools from norsca.json
	const toolOptions = [...new Set(norscaData.map((item) => item.Tool))].sort();

	// Specific resources for removal
	const removableResources = ['Kimurite', 'Cerulite', 'Tephra', 'Bor'];

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
			Array.from(removedResources),
			useVendor
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
	<h1>Gatherer Calculator</h1>

	<div class="main-page-link">
		<a href="/" class="grid-item">
			<span class="item-text">Go to Home Page</span>
		</a>
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
	<div class="input-group-options">
		<div class="option-item">
		<label>Click if you are an Oghmir:</label>
			<div class="grid-select option-grid">
			<div
					class="grid-item"
				class:selected={isOghmir}
				on:click={() => isOghmir = !isOghmir}
				>
				<span class="item-text">Oghmir</span>
				</div>
		</div>
	</div>

		<div class="option-item">
			<label>Use Vendor Materials:</label>
			<div class="grid-select option-grid">
				<div
					class="grid-item"
					class:selected={useVendor}
					on:click={() => useVendor = !useVendor}
				>
					<span class="item-text">Vendor</span>
				</div>
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
		grid-template-rows: repeat(2, 1fr);
	}

	.resource-remove-grid {
		grid-template-columns: repeat(4, 1fr);
		grid-template-rows: 1fr;
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

	.resource-icon {
		width: 45px;
		height: 45px;
		margin-bottom: 10px;
		object-fit: cover;
	}

	.item-text {
		text-align: center;
		word-break: break-word;
		padding-top: 5px;
		position: relative;
	}

	.tool-grid .grid-item.selected .item-text::after,
	.resource-remove-grid .grid-item.selected .item-text::after {
		content: '';
		position: absolute;
		left: 0;
		right: 0;
		top: 50%;
		border-top: 2px solid #ffc72c;
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

	.input-group-options {
		display: flex;
		justify-content: space-between;
		margin-bottom: 1rem;
	}

	.option-item {
		flex: 1;
		margin-right: 1rem;
	}

	.option-item:last-child {
		margin-right: 0;
	}

	.option-grid {
		grid-template-columns: 1fr;
	}
</style>