<script lang="ts">
	import rawCsv from '../../tc-housing.csv?raw';

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

	function parseHousingData(): BuildingEntry[] {
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
				notes
			});
		}

		return entries;
	}

	const credit = parseCredit(rawCsv);
	const allEntries = parseHousingData();
	const categories = [...new Set(allEntries.map((e) => e.category))];

	let selectedCategory = '';

	$: displayedGroups = categories
		.filter((cat) => !selectedCategory || cat === selectedCategory)
		.map((cat) => ({
			category: cat,
			entries: allEntries.filter((e) => e.category === cat)
		}));
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
		<label>Filter by Building:</label>
		<div class="category-filter">
			<button
				class="filter-btn"
				class:active={selectedCategory === ''}
				on:click={() => (selectedCategory = '')}
			>All</button>
			{#each categories as cat}
				<button
					class="filter-btn"
					class:active={selectedCategory === cat}
					on:click={() => (selectedCategory = selectedCategory === cat ? '' : cat)}
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
								<td class="notes-cell">{entry.notes}</td>
							</tr>
						{/each}
					</tbody>
				</table>
			</div>
		</div>
	{/each}

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
</style>
