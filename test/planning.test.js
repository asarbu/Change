import { describe, expect, test } from '@jest/globals';
import PlanningCache from '../static/js/planning/persistence/planningCache.js';

describe('Planning cache', () => {
	test('build default cache for current year', () => {
		const cache = PlanningCache.get(new Date().getFullYear());
		expect(cache).toBeDefined();
	});
});
