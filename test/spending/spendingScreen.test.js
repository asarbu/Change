/**
 * @jest-environment jsdom
 */

import {
	describe, expect, it, beforeAll,
} from '@jest/globals';
import SpendingScreen from '../../static/js/spending/view/spendingScreen';
import Spending from '../../static/js/spending/model/spending';
import Planning, { Statement } from '../../static/js/planning/model/planningModel';
import SpendingController from '../../static/js/spending/controller/spendingController';
import SpendingCache from '../../static/js/spending/persistence/spendingCache';
import PlanningCache from '../../static/js/planning/persistence/planningCache';

describe('Spending screen', () => {
	/** @type {SpendingScreen} */
	let defaultSpendingScreen;

	beforeAll(async () => {
		// Fix structured clone bug.
		// https://stackoverflow.com/questions/73607410/referenceerror-structuredclone-is-not-defined-using-jest-with-nodejs-typesc
		global.structuredClone = (val) => val;

		// Initialize main elements because we do not have an index.html
		const main = document.createElement('main');
		main.id = 'main';
		document.body.appendChild(main);

		const now = new Date(1900, 0, 1);
		const planning = new Planning(now.getTime(), now.getFullYear(), now.getMonth(), []);
		(await new PlanningCache(now.getFullYear()).store(planning));
		const spending = new Spending(now.getTime(), Statement.EXPENSE, now, 'Category 1900', 'Description 1900', 9.99);
		(await new SpendingCache(now.getFullYear()).store(spending));
		defaultSpendingScreen = await (new SpendingController().init());
	});

	function dummyPlanning(forDate) {
		return new Planning(0, forDate.getFullYear(), forDate.getMonth(), []);
	}

	function expectRowToEqualSpending(row, spending) {
		expect(row.userData).toEqual(spending);
		expect(row.children[0].textContent).toEqual(`${spending.spentOn.getDate()}`);
		expect(row.children[1].textContent).toEqual(`${spending.description}`);
		expect(row.children[2].textContent).toEqual(`${spending.category}`);
		expect(row.children[3].textContent).toEqual(`${spending.price}`);
	}

	it('is defined for current year', () => {
		expect(defaultSpendingScreen).toBeDefined();
	});
});
