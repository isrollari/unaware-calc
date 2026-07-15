// src/lib/calcLayout.ts
//
// Shared toggle for the Shopping List / What Can I Make? calculators:
// 'default' keeps inputs and results stacked as one column; 'split-right'
// and 'split-left' move results into a second column so they sit side by
// side with the inputs, on the right or left respectively.

import { writable } from 'svelte/store';

export type CalcLayout = 'default' | 'split-right' | 'split-left';

const STORAGE_KEY = 'calcLayout';

const ORDER: CalcLayout[] = ['default', 'split-right', 'split-left'];

function isCalcLayout(value: string | null): value is CalcLayout {
	return value === 'default' || value === 'split-right' || value === 'split-left';
}

function createCalcLayoutStore() {
	const { subscribe, set, update } = writable<CalcLayout>('default');

	return {
		subscribe,
		init() {
			if (typeof localStorage === 'undefined') return;
			const saved = localStorage.getItem(STORAGE_KEY);
			set(isCalcLayout(saved) ? saved : 'default');
		},
		toggle() {
			update((current) => {
				const next = ORDER[(ORDER.indexOf(current) + 1) % ORDER.length];
				if (typeof localStorage !== 'undefined') {
					localStorage.setItem(STORAGE_KEY, next);
				}
				return next;
			});
		}
	};
}

export const calcLayout = createCalcLayoutStore();
