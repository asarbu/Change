/**
 * @jest-environment jsdom
 */
import {
	beforeAll,
	beforeEach, describe, expect, it,
	jest,
} from '@jest/globals';
import PlanningPersistence from '../../static/js/planning/persistence/planningPersistence.js';
import Planning, { Statement } from '../../static/js/planning/model/planningModel.js';

describe('Planning persistence', () => {
	beforeAll(() => {
		// Fix structured clone bug.
		// https://stackoverflow.com/questions/73607410/referenceerror-structuredclone-is-not-defined-using-jest-with-nodejs-typesc
		global.structuredClone = (val) => val;
	});

	beforeEach(() => {
		localStorage.clear();
		jest.restoreAllMocks();
	});

	it('reads undefined value from empty cache (no GDrive)', async () => {
		const now = new Date(2200, 1, 1);
		const planningPersistence = new PlanningPersistence(now.getFullYear());
		const planning = await planningPersistence.readFromCache(0);
		expect(planning).not.toBeDefined();
	});

	it('reads undefined values from empty cache (no GDrive)', async () => {
		const now = new Date(2201, 1, 1);
		const planningPersistence = new PlanningPersistence(now.getFullYear());
		const plannings = await planningPersistence.readAllFromCache();
		expect(plannings).toBeDefined();
		expect(plannings.length).toBe(0);
	});

	it('reads stored value from cache (no GDrive)', async () => {
		const now = new Date(2202, 1, 1);
		const planningPersistence = new PlanningPersistence(now.getFullYear());
		const planning = new Planning(1, now.getFullYear(), now.getMonth(), []);
		await planningPersistence.store(planning);
		const storedPlanning = await planningPersistence.readFromCache(now.getMonth());
		expect(planning).toEqual(storedPlanning);
	});

	it('reads past stored value from cache if current month not present (no GDrive)', async () => {
		const now = new Date(2203, 1, 1);
		const pastMonthDate = new Date(now);
		pastMonthDate.setMonth(now.getMonth() - 1);
		const planningPersistence = new PlanningPersistence(now.getFullYear());
		const planning = new Planning(1, now.getFullYear(), pastMonthDate.getMonth(), [
			new Statement(2, 'Statement Name', Statement.INCOME, []),
		]);
		await planningPersistence.store(planning);
		const storedPlanning = await planningPersistence.readFromCache(now.getMonth());
		expect(planning.month + 1).toEqual(storedPlanning.month);
		expect(planning.year).toEqual(storedPlanning.year);
		expect(planning.id).not.toEqual(storedPlanning.id);
		expect(planning.statements).toEqual(storedPlanning.statements);
	});

	it('reads past stored values from cache if present (no GDrive)', async () => {
		const now = new Date(2204, 1, 1);
		const pastMonthDate = new Date(now);
		pastMonthDate.setMonth(now.getMonth() - 1);
		const planningPersistence = new PlanningPersistence(now.getFullYear());
		const planning = new Planning(1, now.getFullYear(), pastMonthDate.getMonth(), [
			new Statement(2, 'Statement Name', Statement.INCOME, []),
		]);
		await planningPersistence.store(planning);
		const storedPlannings = await planningPersistence.readAllFromCache();
		expect(storedPlannings).toBeDefined();
		expect(storedPlannings.length).toBe(1);
		const storedPlanning = storedPlannings[0];
		expect(planning).toEqual(storedPlanning);
	});
});
