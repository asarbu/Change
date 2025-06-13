/**
 * @jest-environment jsdom
 */

import {
	beforeAll, describe, expect, it,
} from '@jest/globals';
import PlanningController from '../../static/js/planning/controller/planningController';
import PlanningCache from '../../static/js/planning/persistence/planningCache';
import Planning, { Statement } from '../../static/js/planning/model/planningModel';

describe('Planning controller', () => {
	beforeAll(async () => {
		// Fix structured clone bug.
		// https://stackoverflow.com/questions/73607410/referenceerror-structuredclone-is-not-defined-using-jest-with-nodejs-typesc
		global.structuredClone = (val) => JSON.parse(JSON.stringify(val));

		// Initialize main element because we do not have an index.html
		const main = document.createElement('main');
		main.id = 'main';
		document.body.appendChild(main);
	});

	async function initializeForDate(now) {
		const planningCache = await PlanningCache.get(now.getFullYear());
		const planningController = new PlanningController(now.getFullYear(), now.getMonth(), '');
		await planningController.init();
		return { planningCache, planningController };
	}

	it('persists planning to cache', async () => {
		const now = new Date(1991, 0);
		const { planningCache, planningController } = await initializeForDate(now);
		const countBefore = (await planningCache.readAll()).length;
		const newPlanning = new Planning(now.getTime(), now.getFullYear(), now.getMonth(), []);
		planningController.onClickSavePlanning(newPlanning);
		const countAfter = (await planningCache.readAll()).length;
		expect(countAfter).toBe(countBefore + 1);
	});

	it('persists statement to cache', async () => {
		const now = new Date(1992, 0);
		const { planningCache, planningController } = await initializeForDate(now);
		let cachedPlanning = (await planningCache.readForMonth(now.getMonth()));
		const planning = new Planning(now.getTime(), now.getFullYear(), now.getMonth(), []);
		planningController.onClickSavePlanning(planning);
		const newStatemenet = new Statement(now.getTime(), 'Statement Name', Statement.EXPENSE);
		planningController.onInsertedStatement(newStatemenet);
		cachedPlanning = (await planningCache.readForMonth(now.getMonth()));
		const cachedStatement =	cachedPlanning
			.statements.find((statement) => statement.id === now.getTime());
		expect(cachedStatement.name).toBe(newStatemenet.name);
		expect(cachedStatement.type).toBe(newStatemenet.type);
	});

	it('deletes planning in cache', async () => {
		// Create new planning to avoid conflicts with the older ones
		const newPlanningTime = new Date();
		const { planningCache, planningController } = await initializeForDate(newPlanningTime);
		const oldPlanning = new Planning(
			newPlanningTime.getTime(),
			newPlanningTime.getFullYear(),
			newPlanningTime.getMonth(),
		);
		await planningCache.store(oldPlanning);
		// Check if planning was properly stored
		const storedPlanning = await planningCache.read(oldPlanning.id);
		expect(storedPlanning.id).toBe(oldPlanning.id);
		await planningController.onDeletedPlanning(oldPlanning);
		expect(planningCache.read(oldPlanning.id)).rejects.toThrowError();
	});
});
