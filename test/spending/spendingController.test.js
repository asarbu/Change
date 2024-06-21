/**
 * @jest-environment jsdom
 */

import {
	beforeAll, describe, expect, it,
} from '@jest/globals';
import SpendingController from '../../static/js/spending/controller/spendingController';
import SpendingCache from '../../static/js/spending/persistence/spendingCache';
import Spending from '../../static/js/spending/model/spending';
import Planning, { Statement } from '../../static/js/planning/model/planningModel';
import SpendingReport from '../../static/js/spending/model/spendingReport';

describe('Spending controller', () => {
	/** @type {SpendingController} */
	let spendingController;

	/**
	 * @param {Date} forDate
	 * @returns {Planning}
	 */
	function defaultPlanning(forDate) {
		return new Planning(forDate.getTime(), forDate.getFullYear, forDate.getMonth, []);
	}

	beforeAll(async () => {
		// Fix structured clone bug.
		// https://stackoverflow.com/questions/73607410/referenceerror-structuredclone-is-not-defined-using-jest-with-nodejs-typesc
		global.structuredClone = (val) => val;

		// Initialize main element because we do not have an index.html
		const main = document.createElement('main');
		main.id = 'main';
		document.body.appendChild(main);

		const now = new Date('1800-01-13');
		spendingController = new SpendingController(now.getFullYear(), now.getMonth(), '');
		await spendingController.init();
	});

	it('is defined for current year', () => {
		expect(spendingController).toBeDefined();
	});

	it('persists spending to cache', async () => {
		const now = new Date('1800-01-12');
		const newSpending = new Spending(1, Statement.EXPENSE, now, 'Category', 'Descritpion', 9.99);
		await spendingController.onCreatedSpending(newSpending);
		const spendingCache = new SpendingCache(now.getFullYear());
		const cachedSpendings = await spendingCache.readAllForMonth(now.getMonth());
		expect(cachedSpendings.length).toBe(1);
		expect(cachedSpendings[0]).toEqual(newSpending);
	});

	it('updates spending in cache', async () => {
		const now = new Date('1800-01-12');
		const spending = new Spending(1, Statement.EXPENSE, now, 'Category', 'Descritpion', 9.99);
		await spendingController.onCreatedSpending(spending);
		spending.description = 'Updated category';
		const spendingReport = new SpendingReport(
			now.getFullYear(),
			now.getMonth(),
			defaultPlanning(now),
		);
		spendingReport.appendSpending(spending);
		await spendingController.onSavedReport(spendingReport);
		const spendingCache = new SpendingCache(now.getFullYear());
		const cachedSpendings = await spendingCache.readAllForMonth(now.getMonth());
		expect(cachedSpendings.length).toBe(1);
		expect(cachedSpendings[0]).toEqual(spending);
	});

	it('deletes spending from cache', async () => {
		const now = new Date('1800-01-12');
		const spending1 = new Spending(1, Statement.EXPENSE, now, 'Category', 'Descritpion', 9.99);
		const spending2 = new Spending(2, Statement.EXPENSE, now, 'Category 2', 'Descritpion 2', 9.99);
		const spendingCache = SpendingCache.for(now.getFullYear());

		await spendingController.onCreatedSpending(spending1);
		await spendingController.onCreatedSpending(spending2);
		let cachedSpendings = await spendingCache.readAllForMonth(now.getMonth());
		expect(cachedSpendings.length).toBe(2);

		const spendingReport = new SpendingReport(
			now.getFullYear(),
			now.getMonth(),
			defaultPlanning(now),
		);
		spendingReport.appendSpending(spending1);
		await spendingController.onSavedReport(spendingReport);
		cachedSpendings = await spendingCache.readAllForMonth(now.getMonth());
		expect(cachedSpendings.length).toBe(1);
		expect(cachedSpendings[0]).toEqual(spending1);
	});

	it('deletes report from cache', async () => {
		const now = new Date('1800-01-12');
		const spending1 = new Spending(1, Statement.EXPENSE, now, 'Category', 'Descritpion', 9.99);
		const spending2 = new Spending(2, Statement.EXPENSE, now, 'Category 2', 'Descritpion 2', 9.99);
		const spendingCache = SpendingCache.for(now.getFullYear());

		await spendingController.onCreatedSpending(spending1);
		await spendingController.onCreatedSpending(spending2);
		let cachedSpendings = await spendingCache.readAllForMonth(now.getMonth());
		expect(cachedSpendings.length).toBe(2);

		const spendingReport = new SpendingReport(
			now.getFullYear(),
			now.getMonth(),
			defaultPlanning(now),
		);
		spendingReport.appendSpending(spending1);
		spendingReport.appendSpending(spending2);
		await spendingController.onDeletedReport(spendingReport);
		cachedSpendings = await spendingCache.readAllForMonth(now.getMonth());
		expect(cachedSpendings.length).toBe(0);
	});
});
