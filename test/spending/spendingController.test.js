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
import Settings from '../../static/js/settings/model/settings';
import GDriveSettings from '../../static/js/settings/model/gDriveSettings';

describe('Spending controller', () => {
	/**
	 * @param {Date} forDate
	 * @returns {Planning}
	 */
	function defaultPlanning(forDate) {
		return new Planning(forDate.getTime(), forDate.getFullYear, forDate.getMonth, []);
	}

	async function init(dateTimeProvider, settings) {
		const currentSettings = settings ?? new Settings(new GDriveSettings(false, false));

		const controller = new SpendingController(dateTimeProvider, currentSettings);
		controller.init();
		const cache = SpendingCache.for(dateTimeProvider.getFullYear());

		return { controller, cache };
	}

	beforeAll(async () => {
		// Fix structured clone bug.
		// https://stackoverflow.com/questions/73607410/referenceerror-structuredclone-is-not-defined-using-jest-with-nodejs-typesc
		global.structuredClone = (val) => val;

		// Initialize main element because we do not have an index.html
		const main = document.createElement('main');
		main.id = 'main';
		document.body.appendChild(main);
	});

	it('is defined for current year', () => {
		const now = new Date(1800, 0);
		const { controller } = init(now);
		expect(controller).toBeDefined();
	});

	it('persists spending to cache', async () => {
		const now = new Date('1800-01-12');
		const newSpending = new Spending(1, Statement.EXPENSE, now, 'Category', 'Descritpion', 9.99);
		const { controller } = init(now);
		await controller.onCreatedSpending(newSpending);
		const spendingCache = new SpendingCache(now.getFullYear());
		const cachedSpendings = await spendingCache.readAllForMonth(now.getMonth());
		expect(cachedSpendings.length).toBe(1);
		expect(cachedSpendings[0]).toEqual(newSpending);
	});

	it('updates spending in cache', async () => {
		const now = new Date('1800-01-12');
		const { controller, cache } = init(now);
		const spending = new Spending(1, Statement.EXPENSE, now, 'Category', 'Descritpion', 9.99);
		await controller.onCreatedSpending(spending);
		spending.description = 'Updated category';
		const spendingReport = new SpendingReport(
			now.getFullYear(),
			now.getMonth(),
			defaultPlanning(now),
		);
		spendingReport.appendSpending(spending);
		const cachedSpendings = await cache.readAllForMonth(now.getMonth());
		expect(cachedSpendings.length).toBe(1);
		expect(cachedSpendings[0]).toEqual(spending);
	});

	it('deletes spending from cache', async () => {
		const now = new Date('1800-01-12');
		const spending1 = new Spending(1, Statement.EXPENSE, now, 'Category', 'Descritpion', 9.99);
		const spending2 = new Spending(2, Statement.EXPENSE, now, 'Category 2', 'Descritpion 2', 9.99);
		const { controller, cache } = await init(now);

		await controller.onCreatedSpending(spending1);
		await controller.onCreatedSpending(spending2);
		let cachedSpendings = await cache.readAllForMonth(now.getMonth());
		expect(cachedSpendings.length).toBe(2);

		const spendingReport = new SpendingReport(
			now.getFullYear(),
			now.getMonth(),
			defaultPlanning(now),
		);
		spendingReport.appendSpending(spending1);
		await controller.onSavedReport(spendingReport);
		cachedSpendings = await cache.readAllForMonth(now.getMonth());
		expect(cachedSpendings.length).toBe(1);
		expect(cachedSpendings[0]).toEqual(spending1);
	});

	it('deletes report from cache', async () => {
		const now = new Date('1800-01-12');
		const spending1 = new Spending(1, Statement.EXPENSE, now, 'Category', 'Descritpion', 9.99);
		const spending2 = new Spending(2, Statement.EXPENSE, now, 'Category 2', 'Descritpion 2', 9.99);
		const spendingCache = SpendingCache.for(now.getFullYear());

		const { controller } = await init(now);
		controller.init();
		await controller.onCreatedSpending(spending1);
		await controller.onCreatedSpending(spending2);
		let cachedSpendings = await spendingCache.readAllForMonth(now.getMonth());
		expect(cachedSpendings.length).toBe(2);

		const spendingReport = new SpendingReport(
			now.getFullYear(),
			now.getMonth(),
			defaultPlanning(now),
		);
		spendingReport.appendSpending(spending1);
		spendingReport.appendSpending(spending2);
		await controller.onDeletedReport(spendingReport);
		cachedSpendings = await spendingCache.readAllForMonth(now.getMonth());
		expect(cachedSpendings.length).toBe(0);
	});
});
