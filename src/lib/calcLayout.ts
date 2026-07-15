// src/lib/calcLayout.ts
//
// Shared toggle for the Shopping List / What Can I Make? calculators:
// 'default' keeps inputs and results stacked as one column; 'split' moves
// results into a second column so they sit side by side with the inputs.

import { writable } from 'svelte/store';

export type CalcLayout = 'default' | 'split';

const STORAGE_KEY = 'calcLayout';

function createCalcLayoutStore() {
	const { subscribe, set, update } = writable<CalcLayout>('default');

	return {
		subscribe,
		init() {
			if (typeof localStorage === 'undefined') return;
			const saved = localStorage.getItem(STORAGE_KEY);
			set(saved === 'split' ? 'split' : 'default');
		},
		toggle() {
			update((current) => {
				const next: CalcLayout = current === 'default' ? 'split' : 'default';
				if (typeof localStorage !== 'undefined') {
					localStorage.setItem(STORAGE_KEY, next);
				}
				return next;
			});
		}
	};
}

export const calcLayout = createCalcLayoutStore();
