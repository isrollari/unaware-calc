<script lang="ts">
	import { calculateResources, getAllProductionPaths } from '$lib/calculations';
	import { BASE_ORES } from '$lib/model';
	import refiningData from '$lib/refining.json';
	import norscaData from '$lib/norsca.json';
	import { calcLayout } from '$lib/calcLayout';

	let resourceName = '';
	let quantity = 10000;
	let isOghmir = false;
	let hasMasteries = false;
	let useVendor = true;
	const RARE_MATERIALS = ['Calspar', 'Waterstone'];
	const removableResources = ['Kimurite', 'Cerulite', 'Tephra', 'Bor'];
	let removedTools: Set<string> = new Set(['Blast Furnace', 'Greater Natorus']);
	let removedResources: Set<string> = new Set([...RARE_MATERIALS, ...removableResources]);
	let limitRareMaterials = true;
	let useValueMode = false;
	const materialValues: Map<string, number> = new Map([
		// Base ores
		['Calx', 150000],
		['Saburra', 150000],
		['Granum', 200000],
		['Gabore', 450000],
		['Tephra', 600000],
		['Risen Sacrifice', 2500000],
		['Cerulite', 3000000],
		['Kimurite', 5000000],
		// Extraction outputs
		['Saburra Powder', 100000],
		['Granum Powder', 100000],
		['Gabore Powder', 150000],
		['Flakestone', 150000],
		['Calspar', 200000],
		['Chalk Glance', 300000],
		['Pyrite', 350000],
		['Pitch', 600000],
		['Bleck', 600000],
		['Bleckblende', 900000],
		['Waterstone', 900000],
		['Pig Iron', 1000000],
		['Cuprite', 1200000],
		['Malachite', 1200000],
		['Volcanic Ash', 1500000],
		['Cinnabar', 1800000],
		['Maalite', 1800000],
		['Pyroxene', 1800000],
		['Azurite', 2400000],
		['Magmum', 2500000],
		['Kyanite', 3000000],
		['Pyropite', 3000000],
		['Red Bleckblende', 3000000],
		['Blood Ore', 3500000],
		['Jadeite', 3600000],
		['Galbinum', 3800000],
		['Aabam', 4800000],
		['Sanguinite', 5500000],
		['Electrum', 7000000],
		['Nyx', 8000000],
		['Lupium', 9000000],
		['Silver', 10000000],
		['Unholy Ash', 11000000],
		['Amarantum', 12000000],
		['Skadite', 80000000],
		// Refined / processed metals
		['Calx Powder', 250000],
		['Coal', 800000],
		['Coke', 2000000],
		['Cuprum', 3500000],
		['Bron', 5000000],
		['Grain Steel', 6000000],
		['Messing', 7000000],
		['Steel', 12000000],
		['Tindremic Messing', 15000000],
		['Gold', 25000000],
		['Gem Metal', 30000000],
		['Almine', 30000000],
		['Acronite', 30000000],
		['Tungsteel', 33000000],
		['Cronite', 70000000],
		['Oghmium', 200000000],
		// Vendor catalysts
		['Water', 10],
		['Calamine', 50],
		['Bor', 10000],
		['Nitre', 120],
		['Sulfur', 120],
		['Fuming Salt', 150],
		['Dragon Salt', 150],
		['Ichor', 160],
		['Rock Oil', 200],
	]);

	interface PathResult { label: string; content: string; }
	let results: PathResult[] = [];

	// Extract unique output resources from refining.json
	const resourceOptions = [...new Set(refiningData.map((item) => item.Output))].sort();

	// Extract unique tools from norsca.json
	const toolOptions = [...new Set(norscaData.map((item) => item.Tool))].sort();

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

	function toggleRareMaterials() {
		limitRareMaterials = !limitRareMaterials;
		if (limitRareMaterials) {
			RARE_MATERIALS.forEach((m) => removedResources.add(m));
		} else {
			RARE_MATERIALS.forEach((m) => removedResources.delete(m));
		}
		removedResources = new Set(removedResources);
	}

	function handleCalculate() {
		if (!resourceName) return;

		const allInChain = getAllProductionPaths(resourceName);
		// Only enumerate ores that are in the chain AND not already excluded by the user
		const eligibleOres = (BASE_ORES as readonly string[]).filter(
			(ore) => allInChain.has(ore) && !removedResources.has(ore)
		);
		const n = eligibleOres.length;

		if (n === 0) {
			const content = calculateResources(
				resourceName, quantity,
				{ isOghmir, hasMasteries },
				Array.from(removedTools),
				Array.from(removedResources),
				useVendor,
				useValueMode ? materialValues : undefined
			);
			results = [{ label: 'Result', content }];
			return;
		}

		const seen = new Set<string>();
		const paths: PathResult[] = [];

		for (let mask = (1 << n) - 1; mask >= 1; mask--) {
			const included = eligibleOres.filter((_, i) => (mask >> i) & 1);
			const excluded = eligibleOres.filter((_, i) => !((mask >> i) & 1));
			const extraRemoved = new Set([...removedResources, ...excluded]);

			const content = calculateResources(
				resourceName, quantity,
				{ isOghmir, hasMasteries },
				Array.from(removedTools),
				Array.from(extraRemoved),
				useVendor,
				useValueMode ? materialValues : undefined
			);

			if (!seen.has(content)) {
				seen.add(content);
				// Label based on ores that actually appear in the base materials list
				const actuallyUsed = included.filter((ore) => content.includes(` ${ore} -->`));
				if (actuallyUsed.length === 0) continue;
				const label = actuallyUsed.length === 1 ? `${actuallyUsed[0]} only` : actuallyUsed.join(' + ');
				paths.push({ label, content });
			}
		}

		results = paths;
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

<main class:split-layout={$calcLayout === 'split'}>
	<h1>Shopping List</h1>
	<p class="page-subtitle">Pick what you want to make — get the full list of ore, catalysts and steps to make it from scratch.</p>

	<div class="main-page-link">
		<a href="/" class="grid-item">
			<span class="item-text">Go to Home Page</span>
		</a>
	</div>

	<div class="calc-columns">
	<div class="calc-inputs">

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
		<div class="option-item" title="Oghmir characters get a passive +3% bonus to ore yield when extracting resources. Enable this if your character is Oghmir so the calculator accounts for the extra ore produced per extraction.">
		<label>Oghmir clade (+3% ore yield):</label>
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

		<div class="option-item" title="Adds a +6% ore yield bonus from trained extraction mastery passives. Enable this if you have the relevant masteries leveled — it stacks multiplicatively with the Oghmir bonus (about +9.2% combined).">
			<label>Masteries (+6% ore yield):</label>
			<div class="grid-select option-grid">
				<div
					class="grid-item"
					class:selected={hasMasteries}
					on:click={() => hasMasteries = !hasMasteries}
				>
					<span class="item-text">Masteries</span>
				</div>
			</div>
		</div>

		<div class="option-item" title="Lets the calculator substitute catalysts and simple materials (like Water, Nitre, Sulfur, Bor) with vendor purchases instead of requiring you to gather or craft them yourself. Turn off to force fully self-sufficient production.">
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

	<div class="input-group-options">
		<div class="option-item" title="Excludes hard-to-find rare materials (Calspar, Waterstone) from the production path, even if using them would be more efficient. Turn off to allow the calculator to route through these rarer materials.">
			<label>Limit Rare Materials:</label>
			<div class="grid-select option-grid">
				<div
					class="grid-item"
					class:selected={limitRareMaterials}
					on:click={toggleRareMaterials}
				>
					<span class="item-text">Rare Limit</span>
				</div>
			</div>
		</div>

		<div class="option-item" title="Picks the production path that yields the highest estimated market value per craft instead of the highest raw output quantity. Useful for minimizing cost, but this feature is still in beta and may not always find the true cheapest route.">
			<label>Optimize by value:</label>
			<div class="grid-select option-grid">
				<div
					class="grid-item"
					class:selected={useValueMode}
					on:click={() => useValueMode = !useValueMode}
				>
					<span class="item-text">Value Mode <span class="beta-badge">BETA</span></span>
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

	</div>

	<div class="calc-outputs">
	{#if results.length > 0}
		{#each results as path}
			<div class="result">
				<h2>{results.length > 1 ? path.label : 'Result:'}</h2>
				<pre>{path.content}</pre>
			</div>
		{/each}
	{/if}
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
		max-width: 800px;
		margin: 0 auto;
		padding: 2rem;
	}

	main.split-layout {
		max-width: 1400px;
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

	h1 {
		color: var(--accent);
		text-align: center;
		margin-bottom: 2rem;
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

	main.split-layout .calc-outputs .result:first-child {
		margin-top: 0;
	}

	.result h2 {
		color: var(--accent);
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

	.beta-badge {
		font-size: 0.6rem;
		font-weight: 700;
		letter-spacing: 0.05em;
		color: var(--accent);
		vertical-align: super;
		line-height: 1;
	}

	.grid-item:hover {
		background-color: var(--surface-hover);
	}

	.grid-item.selected {
		border-color: var(--accent);
		background-color: var(--surface-hover);
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
		border-top: 2px solid var(--accent);
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

	.input-group-options {
		display: flex;
		justify-content: space-between;
		margin-bottom: 1rem;
	}

	.option-item {
		flex: 1;
		margin-right: 1rem;
		display: flex;
		flex-direction: column;
	}

	.option-item label {
		margin-bottom: 0.5rem;
	}

	.option-item .grid-select {
		margin-top: auto;
	}

	.option-item:last-child {
		margin-right: 0;
	}

	.option-grid {
		grid-template-columns: 1fr;
	}
</style>