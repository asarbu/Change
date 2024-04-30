/**
 * @jest-environment jsdom
 */

import {
	beforeAll, describe, expect, it,
	jest,
} from '@jest/globals';
import PlanningController from '../static/js/planning/controller/planningController';
import PlanningCache from '../static/js/planning/persistence/planningCache';
import Planning, { Statement } from '../static/js/planning/model/planningModel';

describe('Planning controller', () => {
	/** @type {PlanningCache} */
	let planningCache;

	/** @type {Date} */
	let now;

	/** @type {Date} */
	let availableDate;

	/** @type {PlanningController} */
	let planningController;

	function nextAvailableDate() {
		if (!availableDate) {
			availableDate = new Date(1970, 0);
		}

		availableDate = new Date(availableDate.getFullYear() + 1, availableDate.getMonth());
		return availableDate;
	}

	beforeAll(async () => {
		// Fix structured clone bug.
		// https://stackoverflow.com/questions/73607410/referenceerror-structuredclone-is-not-defined-using-jest-with-nodejs-typesc
		global.structuredClone = (val) => JSON.parse(JSON.stringify(val));

		// Initialize default planning cache and values
		now = new Date();
		planningCache = await PlanningCache.get(now.getFullYear());
		const emptyPlanning = new Planning(
			'Empty planning',
			now.getFullYear(),
			now.getMonth(),
		);
		await planningCache.storePlanning(emptyPlanning);

		// Initialize main element because we do not have an index.html
		const main = document.createElement('main');
		main.id = 'main';
		document.body.appendChild(main);

		planningController = new PlanningController(now.getFullYear(), now.getMonth(), '');
		planningController.init();

		const assignMock = jest.fn();

		delete window.location;
		window.location = { assign: assignMock };
	});

	it('persists statement to cache', async () => {
		const newStatemenet = new Statement(now.getTime(), 'Statement Name', Statement.EXPENSE);
		await planningController.onClickAddStatement(newStatemenet);
		const cachedPlanning = (await planningCache.readForMonth(now.getMonth()))[0];
		const cachedStatement =	cachedPlanning
			.statements.find((statement) => statement.id === now.getTime());
		expect(cachedStatement.name).toBe(newStatemenet.name);
		expect(cachedStatement.type).toBe(newStatemenet.type);
	});

	it('updates planning in cache', async () => {
		const date = new Date(now.getFullYear(), now.getMonth() + 1);
		// Create new planning to avoid conflicts with the older ones
		const oldPlanning = new Planning(
			date.getTime(),
			date.getFullYear(),
			date.getMonth(),
		);
		await planningCache.storePlanning(oldPlanning);
		const newStatemenet = new Statement('Statement One', 'Statement Name', Statement.INCOME);
		const newPlanning = new Planning(
			date.getTime(),
			date.getFullYear(),
			date.getMonth() + 1,
			[newStatemenet],
		);
		await planningController.onClickUpdate(newPlanning);
		const cachedPlanning = (await planningCache.read(oldPlanning.id));
		expect(cachedPlanning.year).toBe(newPlanning.year);
		expect(cachedPlanning.month).toBe(newPlanning.month);
		expect(cachedPlanning.type).toBe(newPlanning.type);
		expect(cachedPlanning.statements.length).toBeGreaterThan(0);
	});

	it('deletes planning in cache', async () => {
		// Create new planning to avoid conflicts with the older ones
		const newPlanningTime = new Date();
		const oldPlanning = new Planning(
			newPlanningTime.getTime(),
			newPlanningTime.getFullYear(),
			newPlanningTime.getMonth(),
		);
		await planningCache.storePlanning(oldPlanning);
		// Check if planning was properly stored
		const storedPlanning = await planningCache.read(oldPlanning.id);
		expect(storedPlanning.id).toBe(oldPlanning.id);
		await planningController.onClickedDeletePlanning(oldPlanning);
		expect(planningCache.read(oldPlanning.id)).rejects.toThrowError();
	});
});
