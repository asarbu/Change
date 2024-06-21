import {
	describe, expect, it, jest,
} from '@jest/globals';
import SpendingCache from '../../static/js/spending/persistence/spendingCache.js';
import Spending from '../../static/js/spending/model/spending.js';
import { Statement } from '../../static/js/planning/model/planningModel.js';

describe('Spending cache', () => {
	// TODO replace constructor with factory methods
	it('is defined for current year', async () => {
		jest.useFakeTimers().setSystemTime(new Date(2000, 0));
		const now = new Date();
		const cache = new SpendingCache(now.getFullYear());
		expect(cache.year).toBe(now.getFullYear());
	});

	it('is defined for a past year (2000)', async () => {
		jest.useFakeTimers().setSystemTime(new Date(2000, 0));
		const now = new Date();
		const spendingCache = new SpendingCache(now.getFullYear());
		expect(spendingCache.year).toBe(now.getFullYear());
	});

	it('is initialized without providing IDB', async () => {
		jest.useFakeTimers({ advanceTimers: true }).setSystemTime(new Date(2001, 0));
		const now = new Date();
		const spendingCache = new SpendingCache(now.getFullYear());
		const count = (await spendingCache.readAllForMonth(now.getMonth())).length;
		expect(count).toBeGreaterThan(-1);
	});

	it('stores one empty Spending object', async () => {
		jest.useFakeTimers({ advanceTimers: true }).setSystemTime(new Date(2002, 0, 2));
		const now = new Date();
		const spendingCache = new SpendingCache(now.getFullYear());
		const countBeforeInsert = (await spendingCache.readAll()).length;
		await spendingCache.store(new Spending(now.getTime(), Statement.INCOME, now, 'Debt', 'description', 100.00));
		const spendings = await spendingCache.readAll();
		const countAfterInsert = (spendings).length;
		expect(countAfterInsert - countBeforeInsert).toBe(1);
	});

	it('reads non existing spending object', async () => {
		const cache = new SpendingCache(2003);
		const spending = cache.read(0);
		expect(spending).rejects.toThrowError();
	});

	it('reads all (2) spending items from cache', async () => {
		jest.useFakeTimers({ advanceTimers: true }).setSystemTime(new Date(2004, 0, 0));
		const now = new Date();
		const cache = new SpendingCache(now.getFullYear());
		const countBeforeInsert = (await cache.readAll()).length;
		const spending1 = new Spending(1, Statement.EXPENSE, now, 'Category 1', 'Description 1', 9.99);
		await cache.store(spending1);
		const spending2 = new Spending(2, Statement.EXPENSE, now, 'Category 2', 'Description 2', 19.99);
		await cache.store(spending2);
		const spendings = await cache.readAll();
		expect(spendings.length).toBe(countBeforeInsert + 2);
		const foundFirst = spendings.find((spending) => spending.id === spending1.id);
		const foundSecond = spendings.find((spending) => spending.id === spending2.id);
		expect(foundFirst).toEqual(spending1);
		expect(foundSecond).toEqual(spending2);
	});

	it('read all spendings for a month', async () => {
		const cache = new SpendingCache(2005);
		const spendings = [];
		for (let month = 0; month < 12; month += 1) {
			const now = new Date(2005, month, 1);
			spendings.push(new Spending(month, Statement.EXPENSE, now));
		}
		await cache.storeAll(spendings);
		const spendingForJanuary = spendings[0];
		const storedSpendings = await cache.readAllForMonth(0);
		expect(storedSpendings.length).toBe(1);
		expect(spendingForJanuary).toEqual(storedSpendings[0]);
	});

	it('deletes one Spending object', async () => {
		const now = new Date(2006, 0, 1);
		const cache = new SpendingCache(now.getFullYear());
		const countBeforeInsert = ((await cache.readAll()).length);
		const spending = new Spending(0, Statement.EXPENSE, now, 'Category 1', 'Description 1', 9.99);
		await cache.store(spending);
		expect((await cache.readAll()).length).toBe(countBeforeInsert + 1);
		await cache.delete(spending);
		expect((await cache.readAll()).length).toBe(countBeforeInsert);
	});

	it('stores statement created in last day of the year', async () => {
		const now = new Date(Date.parse('12-31-2007'));
		const cache = new SpendingCache(now.getFullYear());
		const spending = new Spending(0, Statement.EXPENSE, now, 'Category 1', 'Description 1', 0.99);
		await cache.store(spending);
		const storedSpending = await cache.read(0);
		expect(storedSpending).toBeDefined();
		expect(storedSpending).toEqual(spending);
	});

	it('stores statement created in first day of the year', async () => {
		const now = new Date(Date.parse('1-1-2008'));
		const cache = new SpendingCache(now.getFullYear());
		const spending = new Spending(0, Statement.EXPENSE, now, 'Category 1', 'Description 1', 0.99);
		await cache.store(spending);
		const storedSpending = await cache.read(0);
		expect(storedSpending).toBeDefined();
		expect(storedSpending).toEqual(spending);
	});

	it('updates spending item from cache', async () => {
		const now = new Date(2009, 0, 1);
		const cache = new SpendingCache(now.getFullYear());
		const spending = new Spending(0, Statement.EXPENSE, now, 'Category 1', 'Description 1', 0.99);
		await cache.store(spending);
		const storedSpending = await cache.read(0);
		storedSpending.category = 'Category 2';
		await cache.store(storedSpending);
		const updatedSpending = await cache.read(0);
		expect(updatedSpending).toBeDefined();
		expect(updatedSpending).toEqual(storedSpending);
	});

	it('deletes all (2) Spending objects', async () => {
		const now = new Date(2010, 0, 1);
		const cache = new SpendingCache(now.getFullYear());
		const countBeforeInsert = ((await cache.readAll()).length);
		const spending1 = new Spending(0, Statement.EXPENSE, now, 'Category 1', 'Description 1', 9.99);
		const spending2 = new Spending(1, Statement.EXPENSE, now, 'Category 2', 'Description 2', 19.99);
		await cache.storeAll([spending1, spending2]);
		expect((await cache.readAll()).length).toBe(countBeforeInsert + 2);
		await cache.deleteAll([spending1, spending2]);
		expect((await cache.readAll()).length).toBe(countBeforeInsert);
	});

	it('reads all years from cache', async () => {
		let now = new Date(2011, 0, 1);
		const cache2011 = new SpendingCache(now.getFullYear());
		const spending2011 = new Spending(0, Statement.EXPENSE, now, 'Category 1', 'Description 1', 9.99);
		cache2011.store(spending2011);

		now = new Date(2012, 0, 1);
		const cache2012 = new SpendingCache(now.getFullYear());
		const spending2012 = new Spending(0, Statement.EXPENSE, now, 'Category 1', 'Description 1', 9.99);
		cache2012.store(spending2012);

		const years = await cache2011.readYears();
		expect(years.length).toBeGreaterThan(1);
	});
});
