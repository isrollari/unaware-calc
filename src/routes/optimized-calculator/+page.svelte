<script lang="ts">
    import { onMount } from 'svelte';
    import { calculateOptimizedResources, getAllProductionPaths } from '$lib/calculations';
    import refiningData from '$lib/refining.json';
    import norscaData from '$lib/norsca.json';

    let selectedResource = '';
    let availableResources: Set<string> = new Set();
    let result = '';
    let showModal = false;
    let showResultModal = false;
    let requiredResources: Set<string> = new Set();

    let quantity = 1;
    let isOghmir = false;
    let hasMasteries = false;
    let useVendor = false;
    const RARE_MATERIALS = ['Calspar', 'Waterstone'];
    const removableResources = ['Kimurite', 'Cerulite', 'Tephra', 'Bor'];
    let removedTools: Set<string> = new Set(['Blast Furnace', 'Greater Natorus']);
    let removedResources: Set<string> = new Set([...RARE_MATERIALS, ...removableResources]);
    let limitRareMaterials = true;

    const resourceOptions = [...new Set(refiningData.map((item) => item.Output))].sort();
    const resourceImageMap = new Map(refiningData.map((item) => [item.Output, item['Image Path']]));

    const toolOptions = [...new Set(norscaData.map((item) => item.Tool))].sort();

    onMount(() => {
        window.addEventListener('keydown', handleKeydown);
        return () => {
            window.removeEventListener('keydown', handleKeydown);
        };
    });

    function handleKeydown(event: KeyboardEvent) {
        if (event.key === 'Escape') {
            showModal = false;
            showResultModal = false;
        }
    }

    function selectResource(resource: string) {
        selectedResource = resource;
        showResourcePopup();
    }

    function showResourcePopup() {
        requiredResources = getAllProductionPaths(selectedResource);
        showModal = true;
    }

    function toggleAvailableResource(resource: string) {
        if (availableResources.has(resource)) {
            availableResources.delete(resource);
        } else {
            availableResources.add(resource);
        }
        availableResources = new Set(availableResources); // Trigger reactivity
    }

    function handleCalculate() {
        result = calculateOptimizedResources(
            selectedResource,
            quantity,
            availableResources,
            { isOghmir, hasMasteries },
            Array.from(removedTools),
            Array.from(removedResources),
            useVendor
        );
        showModal = false;
        showResultModal = true;
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
</script>

<main>
    <h1>Smart Planner</h1>
    <p class="page-subtitle">Tell it what you want and what you already have — it plans around your stockpile, your tools and vendor purchases.</p>

	<div class="main-page-link">
		<a href="/" class="grid-item">
			<span class="item-text">Go to Home Page</span>
		</a>
	</div>

    <div class="input-group">
        <label>Select Desired Resource:</label>
        <div class="grid-select resource-grid">
            {#each resourceOptions as resource}
                <div
                    class="grid-item"
                    class:selected={selectedResource === resource}
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

        <div class="option-item">
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

        <div class="option-item">
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

    {#if showModal}
    <div class="modal-backdrop">
        <div class="modal">
            <h2>Available Resources for {selectedResource}</h2>
            <div class="resource-list">
                {#each [...requiredResources] as resource}
                    <div class="resource-item">
                        <label>
                            <input
                                type="checkbox"
                                checked={availableResources.has(resource)}
                                on:change={() => toggleAvailableResource(resource)}
                            />
                            {resource}
                        </label>
                    </div>
                {/each}
            </div>
            <div class="modal-actions">
                <button on:click={handleCalculate}>Calculate</button>
                <button on:click={() => showModal = false}>Cancel</button>
            </div>
        </div>
    </div>
{/if}

{#if showResultModal}
    <div class="modal-backdrop">
        <div class="modal">
            <h2>Optimal Path:</h2>
            <pre>{result}</pre>
            <div class="modal-actions">
                <button on:click={() => showResultModal = false}>Close</button>
            </div>
        </div>
    </div>
{/if}
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

    .modal-backdrop {
        position: fixed;
        top: 0;
        left: 0;
        width: 100%;
        height: 100%;
        background-color: rgba(0, 0, 0, 0.5);
        display: flex;
        justify-content: center;
        align-items: center;
    }

    .modal {
        background-color: var(--surface);
        border-radius: 4px;
        padding: 2rem;
        max-width: 80%;
        max-height: 80%;
        overflow-y: auto;
    }

    .resource-list {
        display: grid;
        grid-template-columns: repeat(3, 1fr);
        gap: 10px;
        margin-top: 1rem;
        max-height: 60vh;
        overflow-y: auto;
    }

    .resource-item {
        background-color: var(--surface-hover);
        padding: 0.5rem;
        border-radius: 4px;
        word-break: break-word;
    }

    .modal-actions {
        margin-top: 1rem;
        display: flex;
        justify-content: flex-end;
        gap: 1rem;
    }
</style>