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
import SpendingReport from '../../static/js/spending/model/spendingReport';

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

	it('builds empty table with no rows for no spendings', () => {
		const now = new Date(1901, 0, 13);
		const report = new SpendingReport(now.getFullYear(), now.getMonth(), dummyPlanning(now));
		const table = defaultSpendingScreen.buildTable(report).toHtml();
		expect(table).toBeDefined();
		expect(table.tBodies[0].children.length).toBe(0);
	});

	it('builds table with one row for one spending', () => {
		const now = new Date(1901, 0, 13);
		const report = new SpendingReport(now.getFullYear(), now.getMonth(), dummyPlanning(now));
		const spending = new Spending(999, Statement.EXPENSE, now, 'Category 1', 'Description 1', 9.99);
		report.appendSpending(spending);
		const table = defaultSpendingScreen.buildTable(report).toHtml();
		expect(table).toBeDefined();
		const row = table.tBodies[0].children[0];
		expectRowToEqualSpending(row, spending);
	});

	it('builds table with two rows for two spendings', () => {
		const now = new Date(1901, 0, 13);
		const report = new SpendingReport(now.getFullYear(), now.getMonth(), dummyPlanning(now));
		const spending1 = new Spending(999, Statement.EXPENSE, now, 'Category 1', 'Description 1', 9.99);
		const spending2 = new Spending(1000, Statement.EXPENSE, now, 'Category 2', 'Description 2', 19.99);
		report.appendSpending(spending1);
		report.appendSpending(spending2);
		const table = defaultSpendingScreen.buildTable(report).toHtml();
		expect(table).toBeDefined();
		const row1 = table.tBodies[0].children[0];
		const row2 = table.tBodies[0].children[1];
		expectRowToEqualSpending(row1, spending1);
		expectRowToEqualSpending(row2, spending2);
	});

	it('creates spending in cache', async () => {
		const now = new Date('1902-02-13');
		const spending = new Spending(1, Statement.EXPENSE, now, 'Category 1902', 'Description 1902', 0.99);
		await defaultSpendingScreen.onCreateSpendingCallback(spending);
		const cache = new SpendingCache(now.getFullYear());
		const cachedSpendings = await cache.readAllForMonth(now.getMonth());
		expect(cachedSpendings.length).toBe(1);
		const cachedSpending = cachedSpendings[0];
		expect(cachedSpending).toEqual(spending);
	});

	it('creates spending in cache', async () => {
		const now = new Date('1902-02-13');
		const spending = new Spending(1, Statement.EXPENSE, now, 'Category 1902', 'Description 1902', 0.99);
		await defaultSpendingScreen.onSpendingChanged(spending);
		const cache = new SpendingCache(now.getFullYear());
		const cachedSpendings = await cache.readAllForMonth(now.getMonth());
		expect(cachedSpendings.length).toBe(1);
		const cachedSpending = cachedSpendings[0];
		expect(cachedSpending).toEqual(spending);
	});
});
