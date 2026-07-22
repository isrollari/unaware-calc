<script lang="ts">
	import rawCsv from '../../tc-housing.csv?raw';
	import upkeepCsv from '../../tc-housing-upkeep.csv?raw';

	interface UpkeepEntry {
		key: string;
		base: string;
		tier: string;
		silver: number;
		cuprum: number;
		prom: number;
	}

	interface BuildingEntry {
		category: string;
		name: string;
		wood: string;
		stone: string;
		metal: string;
		gold: string;
		prom: string;
		health: string;
		type: string;
		limit: string;
		notes: string;
		upkeep: UpkeepEntry | null;
	}

	function parseCSVLine(line: string): string[] {
		const result: string[] = [];
		let current = '';
		let inQuotes = false;
		for (let i = 0; i < line.length; i++) {
			const ch = line[i];
			if (ch === '"') {
				inQuotes = !inQuotes;
			} else if (ch === ',' && !inQuotes) {
				result.push(current);
				current = '';
			} else {
				current += ch;
			}
		}
		result.push(current);
		return result;
	}

	const SIEGE_WEAPONS = new Set(['Ballista', 'Manganon', 'Wheeled Ballista', 'Wheeled Mangaon']);

	// Housing category names that don't match the upkeep CSV's structure names verbatim.
	const UPKEEP_ALIAS: Record<string, string> = {
		'Alchemist Apotheca': 'Alchemist Apothecary',
		'Green Burster Lamp Post': 'Burster Lamp',
		'Yellow Burster Lamp Post': 'Burster Lamp',
		Priest: 'Blue Priest'
	};

	function parseCredit(rawCsv: string) {
		const [creditText, , , , , , , , , , tagline, , , , discordLink] = parseCSVLine(
			rawCsv.split('\n')[0].trim()
		);
		return {
			text: creditText?.trim() ?? '',
			tagline: tagline?.trim() ?? '',
			discordLink: discordLink?.trim() ?? ''
		};
	}

	function cleanNotes(notes: string): string {
		return notes
			.replace(/\s*\(click to see inventory\)/gi, '')
			.replace(/\s*click to see accepted currencies\.?/gi, '')
			.replace(/\s+,/g, ',')
			.replace(/\s{2,}/g, ' ')
			.trim();
	}

	function parseUpkeepData(): UpkeepEntry[] {
		const lines = upkeepCsv.split('\n').slice(1);
		const entries: UpkeepEntry[] = [];

		for (const line of lines) {
			const trimmed = line.trim();
			if (!trimmed) continue;

			const fields = parseCSVLine(trimmed);
			const name = fields[0]?.trim() ?? '';
			if (!name) continue;

			const silver = Number(fields[1]) || 0;
			const cuprum = Number(fields[2]) || 0;
			const prom = Number(fields[3]) || 0;

			const tierMatch = name.match(/^(.*)\sT([123])$/);
			const base = tierMatch ? tierMatch[1] : name;
			const tier = tierMatch ? `T${tierMatch[2]}` : '';

			entries.push({ key: name, base, tier, silver, cuprum, prom });
		}

		return entries;
	}

	function getUpkeep(
		upkeepMap: Map<string, UpkeepEntry>,
		category: string,
		name: string
	): UpkeepEntry | null {
		const base = UPKEEP_ALIAS[category] ?? category;
		const tierMatch = name.match(/Tier (\d)/);
		const tier = tierMatch ? `T${tierMatch[1]}` : '';
		return upkeepMap.get(`${base}|${tier}`) ?? upkeepMap.get(`${base}|`) ?? null;
	}

	function parseHousingData(upkeepMap: Map<string, UpkeepEntry>): BuildingEntry[] {
		const lines = rawCsv.split('\n').slice(1);
		const entries: BuildingEntry[] = [];
		let currentCategory = '';

		for (const line of lines) {
			const trimmed = line.trim();
			if (!trimmed) continue;

			const fields = parseCSVLine(trimmed);
			const name = fields[0]?.trim() ?? '';
			const wood = fields[1]?.trim() ?? '';
			const stone = fields[2]?.trim() ?? '';
			const metal = fields[3]?.trim() ?? '';
			const gold = fields[4]?.trim() ?? '';
			const prom = fields[5]?.trim() ?? '';
			const health = fields[6]?.trim() ?? '';
			const type = fields[7]?.trim() ?? '';
			const limit = fields[8]?.trim() ?? '';
			const notes = fields[9]?.trim() ?? '';

			if (!name || name === 'Name:' || name === 'Note:') continue;

			const dataFields = [wood, stone, metal, gold, prom, health, type, limit];
			const hasAnyData = dataFields.some((f) => f !== '');

			if (!hasAnyData) {
				currentCategory = name;
				continue;
			}

			const category = SIEGE_WEAPONS.has(name) ? 'Siege Weapons' : currentCategory;

			entries.push({
				category,
				name,
				wood: wood || 'N/A',
				stone: stone || 'N/A',
				metal: metal || 'N/A',
				gold: gold || 'N/A',
				prom: prom || 'N/A',
				health: health || 'N/A',
				type: type || 'N/A',
				limit: limit || 'N/A',
				notes: cleanNotes(notes),
				upkeep: getUpkeep(upkeepMap, category, name)
			});
		}

		return entries;
	}

	function formatCurrency(silver: number, cuprum: number, prom: number): string {
		const parts: string[] = [];
		if (silver) parts.push(`${Math.round(silver).toLocaleString()} Silver`);
		if (cuprum) parts.push(`${Math.round(cuprum).toLocaleString()} Cuprum`);
		if (prom) parts.push(`${Math.round(prom).toLocaleString()} Prom`);
		return parts.length ? parts.join(' · ') : 'None';
	}

	const credit = parseCredit(rawCsv);
	const upkeepEntries = parseUpkeepData();
	const upkeepMap = new Map(upkeepEntries.map((e) => [`${e.base}|${e.tier}`, e]));
	const allEntries = parseHousingData(upkeepMap);
	const categories = [...new Set(allEntries.map((e) => e.category))];

	const upkeepGroups = Array.from(
		upkeepEntries.reduce((map, e) => {
			if (!map.has(e.base)) map.set(e.base, []);
			map.get(e.base)!.push(e);
			return map;
		}, new Map<string, UpkeepEntry[]>())
	).map(([base, entries]) => ({ base, entries }));

	const UNIT_DAYS: Record<string, number> = { days: 1, weeks: 7, months: 30, years: 365 };
	const SILVER_PER_GOLD = 100;

	let selectedCategories = new Set<string>();

	let quantities: Record<string, number> = Object.fromEntries(
		upkeepEntries.map((e) => [e.key, 0])
	);
	let selectedTiers: Record<string, string> = Object.fromEntries(
		upkeepGroups.map((g) => [g.base, g.entries[0].tier])
	);
	let periodAmount = 1;
	let periodUnit: keyof typeof UNIT_DAYS = 'months';

	function setPeriod(amount: number, unit: keyof typeof UNIT_DAYS) {
		periodAmount = amount;
		periodUnit = unit;
	}

	function clearQuantities() {
		quantities = Object.fromEntries(upkeepEntries.map((e) => [e.key, 0]));
	}

	function currentEntry(group: { base: string; entries: UpkeepEntry[] }): UpkeepEntry {
		const tier = selectedTiers[group.base];
		return group.entries.find((e) => e.tier === tier) ?? group.entries[0];
	}

	function incrementQuantity(key: string) {
		quantities[key] = (quantities[key] ?? 0) + 1;
	}

	function decrementQuantity(key: string) {
		quantities[key] = Math.max(0, (quantities[key] ?? 0) - 1);
	}

	function toggleCategory(cat: string) {
		const next = new Set(selectedCategories);
		if (next.has(cat)) {
			next.delete(cat);
		} else {
			next.add(cat);
		}
		selectedCategories = next;
	}

	function toggleAllCategories() {
		selectedCategories =
			selectedCategories.size === categories.length ? new Set() : new Set(categories);
	}

	$: displayedGroups = categories
		.filter((cat) => selectedCategories.has(cat))
		.map((cat) => ({
			category: cat,
			entries: allEntries.filter((e) => e.category === cat)
		}));

	$: totalDays = periodAmount * UNIT_DAYS[periodUnit];
	$: selectedEntries = upkeepEntries.filter((e) => (quantities[e.key] ?? 0) > 0);
	$: totals = selectedEntries.reduce(
		(acc, e) => {
			const qty = quantities[e.key] ?? 0;
			acc.silver += qty * e.silver * totalDays;
			acc.cuprum += qty * e.cuprum * totalDays;
			acc.prom += qty * e.prom * totalDays;
			return acc;
		},
		{ silver: 0, cuprum: 0, prom: 0 }
	);
	$: totalGold = totals.silver / SILVER_PER_GOLD;
</script>

<main>
	<h1>TC Housing Material Prices</h1>
	<p class="page-subtitle">Build costs for Territory Control structures — wood, stone, metal, gold, and Prominence per tier.</p>

	<div class="main-page-link">
		<a href="/" class="back-btn">
			<span class="item-text">Go to Home Page</span>
		</a>
	</div>

	<div class="filter-section">
		<label>Select Buildings to View (select multiple):</label>
		<div class="category-filter">
			<button
				class="filter-btn"
				class:active={selectedCategories.size === categories.length}
				on:click={toggleAllCategories}
			>All</button>
			{#each categories as cat}
				<button
					class="filter-btn"
					class:active={selectedCategories.has(cat)}
					on:click={() => toggleCategory(cat)}
				>{cat}</button>
			{/each}
		</div>
	</div>

	{#each displayedGroups as group}
		<div class="building-section">
			<h2 class="category-name">{group.category}</h2>
			<div class="table-wrapper">
				<table>
					<thead>
						<tr>
							<th>Name</th>
							<th>Wood</th>
							<th>Stone</th>
							<th>Metal</th>
							<th>Gold</th>
							<th>Prom</th>
							<th>Health</th>
							<th>Type</th>
							<th>Limit</th>
							<th>Upkeep /day</th>
							<th>Notes</th>
						</tr>
					</thead>
					<tbody>
						{#each group.entries as entry}
							<tr>
								<td class="name-cell">{entry.name}</td>
								<td class:na={entry.wood === 'N/A'}>{entry.wood}</td>
								<td class:na={entry.stone === 'N/A'}>{entry.stone}</td>
								<td class:na={entry.metal === 'N/A'}>{entry.metal}</td>
								<td class:na={entry.gold === 'N/A'}>{entry.gold}</td>
								<td class:na={entry.prom === 'N/A'}>{entry.prom}</td>
								<td>{entry.health}</td>
								<td>{entry.type}</td>
								<td class:na={entry.limit === 'N/A'}>{entry.limit}</td>
								<td class:na={!entry.upkeep}>
									{entry.upkeep
										? formatCurrency(entry.upkeep.silver, entry.upkeep.cuprum, entry.upkeep.prom)
										: 'N/A'}
								</td>
								<td class="notes-cell">{entry.notes}</td>
							</tr>
						{/each}
					</tbody>
				</table>
			</div>
		</div>
	{/each}

	<div class="calculator-section">
		<h2>Upkeep Calculator</h2>
		<p class="calculator-subtitle">
			Select how many of each structure (and tier) your guild maintains, choose a time period, and
			see the total upkeep cost. Upkeep values are per real-world day.
		</p>

		<div class="period-controls">
			<label>Time period:</label>
			<div class="period-inputs">
				<input type="number" min="0" step="1" bind:value={periodAmount} />
				<select bind:value={periodUnit}>
					<option value="days">Day(s)</option>
					<option value="weeks">Week(s)</option>
					<option value="months">Month(s)</option>
					<option value="years">Year(s)</option>
				</select>
			</div>
			<div class="period-presets">
				<button class="preset-btn" on:click={() => setPeriod(1, 'weeks')}>1 Week</button>
				<button class="preset-btn" on:click={() => setPeriod(1, 'months')}>1 Month</button>
				<button class="preset-btn" on:click={() => setPeriod(3, 'months')}>3 Months</button>
				<button class="preset-btn" on:click={() => setPeriod(6, 'months')}>6 Months</button>
				<button class="preset-btn" on:click={() => setPeriod(1, 'years')}>1 Year</button>
			</div>
		</div>

		<div class="structure-picker">
			{#each upkeepGroups as group}
				{@const entry = currentEntry(group)}
				<div class="structure-group">
					<span class="structure-name">{group.base}</span>
					<div class="structure-controls">
						{#if group.entries.length > 1}
							<select class="tier-select" bind:value={selectedTiers[group.base]}>
								{#each group.entries as tierEntry}
									<option value={tierEntry.tier}>{tierEntry.tier}</option>
								{/each}
							</select>
						{/if}
						<div class="qty-stepper">
							<button
								type="button"
								class="qty-btn"
								on:click={() => decrementQuantity(entry.key)}
							>−</button>
							<span class="qty-value">{quantities[entry.key] ?? 0}</span>
							<button
								type="button"
								class="qty-btn"
								on:click={() => incrementQuantity(entry.key)}
							>+</button>
						</div>
					</div>
				</div>
			{/each}
		</div>

		<div class="calculator-actions">
			<button class="clear-btn" on:click={clearQuantities}>Clear Selections</button>
		</div>

		{#if selectedEntries.length}
			<div class="table-wrapper">
				<table class="breakdown-table">
					<thead>
						<tr>
							<th>Structure</th>
							<th>Qty</th>
							<th>Silver/day</th>
							<th>Cuprum/day</th>
							<th>Prom/day</th>
							<th>Total ({periodAmount} {periodUnit})</th>
						</tr>
					</thead>
					<tbody>
						{#each selectedEntries as entry}
							{@const qty = quantities[entry.key] ?? 0}
							<tr>
								<td class="name-cell">{entry.key}</td>
								<td>{qty}</td>
								<td>{entry.silver.toLocaleString()}</td>
								<td>{entry.cuprum.toLocaleString()}</td>
								<td>{entry.prom.toLocaleString()}</td>
								<td
									>{formatCurrency(
										entry.silver * qty * totalDays,
										entry.cuprum * qty * totalDays,
										entry.prom * qty * totalDays
									)}</td
								>
							</tr>
						{/each}
					</tbody>
				</table>
			</div>
		{/if}

		<div class="totals-display">
			<div class="total-card">
				<span class="total-label">Total Silver</span>
				<span class="total-value">{Math.round(totals.silver).toLocaleString()}</span>
			</div>
			<div class="total-card">
				<span class="total-label">Total Gold</span>
				<span class="total-value"
					>{totalGold.toLocaleString(undefined, { maximumFractionDigits: 2 })}</span
				>
			</div>
			<div class="total-card">
				<span class="total-label">Total Cuprum</span>
				<span class="total-value">{Math.round(totals.cuprum).toLocaleString()}</span>
			</div>
			<div class="total-card">
				<span class="total-label">Total Prom</span>
				<span class="total-value">{Math.round(totals.prom).toLocaleString()}</span>
			</div>
		</div>
		<p class="calculator-note">
			Over {totalDays} day{totalDays === 1 ? '' : 's'} ({periodAmount}
			{periodUnit}) — 100 Silver = 1 Gold
		</p>
	</div>

	<p class="credit">
		{credit.text}
		{#if credit.discordLink}
			<br /><a href={credit.discordLink} target="_blank" rel="noopener noreferrer">{credit.tagline || credit.discordLink}</a>
		{/if}
	</p>
</main>

<style>
	main {
		max-width: 1200px;
		margin: 0 auto;
		padding: 2rem;
	}

	h1 {
		color: var(--accent);
		text-align: center;
		margin-bottom: 2rem;
	}

	.page-subtitle {
		text-align: center;
		color: var(--text-muted);
		font-size: 0.95rem;
		margin: -1rem 0 1.5rem;
	}

	.main-page-link {
		display: flex;
		justify-content: center;
		margin: 1.5rem 0;
	}

	.back-btn {
		background-color: var(--surface);
		border: 2px solid var(--border);
		border-radius: 4px;
		padding: 15px 30px;
		text-align: center;
		cursor: pointer;
		transition: all 0.3s ease;
		text-decoration: none;
		display: block;
	}

	.back-btn:hover {
		background-color: var(--surface-hover);
		border-color: var(--accent);
	}

	.back-btn .item-text {
		color: var(--accent);
		font-size: 1.1rem;
		display: block;
		padding: 5px 0;
	}

	.filter-section {
		margin-bottom: 1.5rem;
	}

	.filter-section label {
		display: block;
		color: var(--accent);
		margin-bottom: 0.5rem;
	}

	.category-filter {
		display: flex;
		flex-wrap: wrap;
		gap: 8px;
	}

	.filter-btn {
		background-color: var(--surface);
		border: 2px solid var(--border);
		border-radius: 4px;
		padding: 6px 12px;
		color: var(--text);
		cursor: pointer;
		font-size: 0.85rem;
		transition: all 0.2s ease;
	}

	.filter-btn:hover {
		background-color: var(--surface-hover);
		border-color: var(--accent);
	}

	.filter-btn.active {
		border-color: var(--accent);
		background-color: var(--surface-hover);
		color: var(--accent);
	}

	.building-section {
		margin-bottom: 2rem;
	}

	.category-name {
		color: var(--accent);
		font-size: 1.1rem;
		margin-bottom: 0.5rem;
		border-bottom: 1px solid var(--border);
		padding-bottom: 0.25rem;
	}

	.table-wrapper {
		overflow-x: auto;
	}

	table {
		width: 100%;
		border-collapse: collapse;
		font-size: 0.875rem;
	}

	th {
		background-color: var(--surface);
		color: var(--accent);
		padding: 8px 10px;
		text-align: left;
		white-space: nowrap;
		border-bottom: 2px solid var(--border);
	}

	td {
		padding: 7px 10px;
		border-bottom: 1px solid var(--border);
		color: var(--text);
		white-space: nowrap;
	}

	td.na {
		color: var(--text-muted);
		opacity: 0.6;
	}

	td.name-cell {
		font-weight: 500;
		color: var(--text);
	}

	td.notes-cell {
		white-space: normal;
		min-width: 200px;
		max-width: 320px;
		font-size: 0.8rem;
		color: var(--text-muted);
	}

	tr:hover td {
		background-color: var(--surface-hover);
	}

	.credit {
		text-align: center;
		color: var(--text-muted);
		font-size: 0.85rem;
		margin-top: 2rem;
		line-height: 1.6;
	}

	.credit a {
		color: var(--accent);
	}

	.calculator-section {
		background-color: var(--surface);
		border: 1px solid var(--border);
		border-radius: 8px;
		padding: 1.5rem;
		margin-bottom: 2rem;
	}

	.calculator-section h2 {
		color: var(--accent);
		margin: 0 0 0.5rem;
		font-size: 1.2rem;
	}

	.calculator-subtitle {
		color: var(--text-muted);
		font-size: 0.85rem;
		margin: 0 0 1.25rem;
	}

	.period-controls {
		margin-bottom: 1.25rem;
	}

	.period-controls label {
		display: block;
		color: var(--accent);
		margin-bottom: 0.5rem;
	}

	.period-inputs {
		display: flex;
		gap: 8px;
		margin-bottom: 0.5rem;
	}

	.period-inputs input[type='number'] {
		width: 80px;
		background-color: var(--surface-hover);
		border: 2px solid var(--border);
		border-radius: 4px;
		padding: 6px 8px;
		color: var(--text);
	}

	.period-inputs select {
		background-color: var(--surface-hover);
		border: 2px solid var(--border);
		border-radius: 4px;
		padding: 6px 8px;
		color: var(--text);
	}

	.period-presets {
		display: flex;
		flex-wrap: wrap;
		gap: 8px;
	}

	.preset-btn {
		background-color: var(--surface-hover);
		border: 2px solid var(--border);
		border-radius: 4px;
		padding: 5px 10px;
		color: var(--text);
		cursor: pointer;
		font-size: 0.8rem;
		transition: all 0.2s ease;
	}

	.preset-btn:hover {
		border-color: var(--accent);
		color: var(--accent);
	}

	.structure-picker {
		display: grid;
		grid-template-columns: repeat(auto-fill, minmax(220px, 1fr));
		gap: 10px;
		margin-bottom: 1rem;
	}

	.structure-group {
		background-color: var(--surface-hover);
		border: 1px solid var(--border);
		border-radius: 6px;
		padding: 8px 10px;
	}

	.structure-name {
		display: block;
		font-size: 0.85rem;
		font-weight: 500;
		color: var(--text);
		margin-bottom: 6px;
	}

	.structure-controls {
		display: flex;
		align-items: center;
		gap: 8px;
	}

	.tier-select {
		background-color: var(--surface);
		border: 1px solid var(--border);
		border-radius: 4px;
		padding: 4px 6px;
		color: var(--text);
		font-size: 0.8rem;
	}

	.qty-stepper {
		display: flex;
		align-items: center;
		gap: 8px;
		margin-left: auto;
	}

	.qty-btn {
		background-color: var(--surface);
		border: 1px solid var(--border);
		border-radius: 4px;
		width: 24px;
		height: 24px;
		line-height: 1;
		color: var(--text);
		cursor: pointer;
		font-size: 0.9rem;
		display: flex;
		align-items: center;
		justify-content: center;
	}

	.qty-btn:hover {
		border-color: var(--accent);
		color: var(--accent);
	}

	.qty-value {
		min-width: 20px;
		text-align: center;
		font-size: 0.85rem;
		color: var(--text);
	}

	.calculator-actions {
		display: flex;
		justify-content: flex-end;
		margin-bottom: 1rem;
	}

	.clear-btn {
		background-color: var(--surface-hover);
		border: 2px solid var(--border);
		border-radius: 4px;
		padding: 6px 12px;
		color: var(--text);
		cursor: pointer;
		font-size: 0.8rem;
	}

	.clear-btn:hover {
		border-color: var(--accent);
		color: var(--accent);
	}

	.breakdown-table {
		margin-bottom: 1.25rem;
	}

	.totals-display {
		display: flex;
		flex-wrap: wrap;
		gap: 12px;
		margin-bottom: 0.5rem;
	}

	.total-card {
		flex: 1;
		min-width: 140px;
		background-color: var(--surface-hover);
		border: 1px solid var(--border);
		border-radius: 6px;
		padding: 10px 14px;
		text-align: center;
	}

	.total-label {
		display: block;
		font-size: 0.75rem;
		color: var(--text-muted);
		margin-bottom: 4px;
	}

	.total-value {
		display: block;
		font-size: 1.3rem;
		font-weight: 600;
		color: var(--accent);
	}

	.calculator-note {
		text-align: center;
		color: var(--text-muted);
		font-size: 0.8rem;
		margin: 0;
	}
</style>
