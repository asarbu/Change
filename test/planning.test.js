import { beforeAll, describe, expect, test } from '@jest/globals';
import PlanningCache from '../static/js/planning/persistence/planningCache.js';
import Planning, { Category, Goal, Statement } from '../static/js/planning/model/planningModel.js';
import Idb from '../static/js/persistence/idb.js';

/** @type {PlanningCache} */
let defaultPlanningCache;

async function storeEmptyPlanningCache() {
	const now = new Date();
	const planning = new Planning(now.getTime(), now.getFullYear(), now.getMonth());
	return await defaultPlanningCache.storePlanning(planning);
}

async function storeEmptyPlanningCachesForAYear() {
	const now = new Date();
	for(let monthIndex = 0; monthIndex < 12; monthIndex += 1) {
		now.setMonth(monthIndex)
		const planning = new Planning(now.getTime(), now.getFullYear(), now.getMonth());
		await defaultPlanningCache.storePlanning(planning);
	}
	return true;
}

function storeFullPlanningCache() {
	// TODO 
	const now = new Date();
	const planning = new Planning(now.getTime(), now.getFullYear(), now.getMonth());
	defaultPlanningCache.storePlanning(planning);
	return planning;
}

/**
 * @param {Array<Goal>} these
 * @param {Array<Goal>} those
 */
function expectEqualGoals(these, those) {
	these.forEach((thisGoal) => {
		const thatGoal = those.find((that) => that.id === thisGoal.id);
		expect(thatGoal).toBeDefined();
		expect(thatGoal.name).toBe(thisGoal.name);
		expect(thatGoal.daily).toBe(thisGoal.daily);
		expect(thatGoal.monthly).toBe(thisGoal.monthly);
		expect(thatGoal.yearly).toBe(thisGoal.yearly);
	});
}

/**
 * @param {Array<Category>} these
 * @param {Array<Category>} those
 */
function expectEqualCategories(these, those) {
	these.forEach((thisCategory) => {
		const thatCategory = those.find((that) => that.id === thisCategory.id);
		expect(thatCategory).toBeDefined();
		expect(thatCategory.id).toBe(thisCategory.id);
		expect(thatCategory.name).toBe(thisCategory.name);
		expectEqualGoals(thatCategory.goals, thisCategory.goals);
	});
}

/**
 * @param {Array<Statement>} these
 * @param {Array<Statement>} those
 */
function expectEqualStatements(these, those) {
	these.forEach((thisStatement) => {
		const thatStatement = those.find((that) => that.id === thisStatement.id);
		expect(thatStatement).toBeDefined();
		expect(thatStatement.id).toBe(thisStatement.id);
		expect(thatStatement.type).toBe(thisStatement.type);
		expectEqualCategories(thatStatement.categories, thisStatement.categories);
	});
}

/**
 * @param {Planning} thisPlanning
 * @param {Planning} thatPlanning
 */
function expectEqualPlannings(thisPlanning, thatPlanning) {
	expect(thisPlanning.id).toBe(thatPlanning.id);
	expect(thisPlanning.month).toBe(thatPlanning.month);
	expect(thisPlanning.year).toBe(thatPlanning.year);
	expectEqualStatements(thisPlanning.statements, thatPlanning.statements);
}

describe('Planning cache', () => {
	beforeAll(async () => {
		defaultPlanningCache = await PlanningCache.get(new Date().getFullYear());
	});

	test('is defined for current year', async() => {
		const now = new Date();
		expect(defaultPlanningCache.year).toBe(now.getFullYear());
	});

	test('is defined for year 1970', async () => {
		const planningCache = await PlanningCache.get(1970);
		expect(planningCache.year).toBe(1970);
	});

	test('is initialized without existing IDB', async() => {
		const planningCache = new PlanningCache(new Date().getFullYear())
		const initializedPlanning = await planningCache.init();
		const count = await initializedPlanning.count();
		expect(count).toBeGreaterThan(-1);
	});

	test('is initialized with existing IDB', async() => {
		const idb = await Idb.of('2024', PlanningCache.upgradePlanningDatabase);
		const planningCache = new PlanningCache(new Date().getFullYear(), idb);
		const initializedPlanning = await planningCache.init();
		const count = await initializedPlanning.count();
		expect(count).toBeGreaterThan(-1);
	});

	test('count returns 0 for 1970', async() => {
		const planningCache = await PlanningCache.get(1970);
		expect(await planningCache.count()).toBe(0);
	});

	test('stores one empty Planning object', async () => {
		const countBeforeInsert = (await defaultPlanningCache.count());
		await storeEmptyPlanningCache();
		const countAfterInsert = (await defaultPlanningCache.count());
		expect(countAfterInsert - countBeforeInsert).toBe(1);
	});

	test('reads one added planning object', async () => {
		const storedPlanning = await storeEmptyPlanningCache();
		const all = await defaultPlanningCache.readAll();
		const readPlanning = await defaultPlanningCache.read(storedPlanning.id);
		expectEqualPlannings(storedPlanning, readPlanning);
	});

	test('reads non existing planning object', async () => {
		expect(defaultPlanningCache.read(1)).rejects.toThrowError();
	});

	test('reads all (2) planning items from cache', async() =>{
		const countBeforeInsert = (await defaultPlanningCache.count());
		const firstPlanning = await storeEmptyPlanningCache();
		//Wait for 10ms to pass so we do not have an ID conflict (ID is date.now)
		await new Promise(r => setTimeout(r, 10));
		const secondPlanning = await storeEmptyPlanningCache();
		const plannings = await defaultPlanningCache.readAll();
		expect(plannings.length).toBe(countBeforeInsert + 2);
		const foundFirstPlanning = plannings.find((planning) => planning.id === firstPlanning.id);
		const foundSecondPlanning = plannings.find((planning) => planning.id === secondPlanning.id);
		expect(foundFirstPlanning).toBeDefined();
		expect(foundSecondPlanning).toBeDefined();
	});

	test('read all plannings for a month', async() => {
		await storeEmptyPlanningCachesForAYear();
		const currentMonth = new Date().getMonth();
		const planningsForCurrentMonth = await defaultPlanningCache.readForMonth(currentMonth);
		planningsForCurrentMonth.forEach((planning) => {
			expect(planning.month).toBe(currentMonth);
		});
	})

	test('deletes one empty Planning object', async () => {
		const countBeforeInsert = (await defaultPlanningCache.count());
		const addedPlanning = await storeEmptyPlanningCache();
		defaultPlanningCache.delete(addedPlanning.id);
		const countAfterInsert = (await defaultPlanningCache.count());
		expect(countAfterInsert).toBe(countBeforeInsert);
	});

	test('stores one empty Statement in a Planning', async () => {
		const addedPlanning = await storeEmptyPlanningCache();
		const now = new Date();
		const newStatement = new Statement(now.getTime(), 'Dummy', Statement.EXPENSE);
		addedPlanning.statements = [newStatement];
		await defaultPlanningCache.storePlanning(addedPlanning);
		const updatedPlanning = await defaultPlanningCache.read(addedPlanning.id);
		const dbStatement = updatedPlanning.statements.find((stmt) => stmt.id === newStatement.id);
		expect(dbStatement).toBeDefined();
	});

	test('stores statement created in last day of the year', async () => {
		const addedPlanning = await storeEmptyPlanningCache();
		const lastDayofYear = Date.parse('12-31-2024');
		const newStatement = new Statement(lastDayofYear, 'Dummy', Statement.EXPENSE);
		addedPlanning.statements = [newStatement];
		await defaultPlanningCache.storePlanning(addedPlanning);
		const updatedPlanning = await defaultPlanningCache.read(addedPlanning.id);
		const dbStatement = updatedPlanning.statements.find((stmt) => stmt.id === newStatement.id);
		expect(dbStatement.id).toBe(lastDayofYear);
		expect(dbStatement).toBeDefined();
	});

	test('stores statement created in first day of the year', async () => {
		const addedPlanning = await storeEmptyPlanningCache();
		const firstDayOfYear = Date.parse('01-01-2024');
		const newStatement = new Statement(firstDayOfYear, 'Dummy', Statement.EXPENSE);
		addedPlanning.statements = [newStatement];
		await defaultPlanningCache.storePlanning(addedPlanning);
		const updatedPlanning = await defaultPlanningCache.read(addedPlanning.id);
		const dbStatement = updatedPlanning.statements.find((stmt) => stmt.id === newStatement.id);
		expect(dbStatement.id).toBe(firstDayOfYear);
		expect(dbStatement).toBeDefined();
	});

	test('update all (2) planning items from cache', async() =>{
		const firstPlanning = await storeEmptyPlanningCache();
		//Wait for 10ms to pass so we do not have an ID conflict (ID is date.now)
		await new Promise(r => setTimeout(r, 10));
		const secondPlanning = await storeEmptyPlanningCache();

		firstPlanning.month = (firstPlanning.month + 1) % 12;
		secondPlanning.month = (secondPlanning.month + 1) % 12;
		await defaultPlanningCache.updateAll([firstPlanning, secondPlanning]);

		const plannings = await defaultPlanningCache.readAll();
		const foundFirstPlanning = plannings.find((planning) => planning.id === firstPlanning.id);
		const foundSecondPlanning = plannings.find((planning) => planning.id === secondPlanning.id);
		expect(foundFirstPlanning.month).toBe(firstPlanning.month);
		expect(foundSecondPlanning.month).toBe(secondPlanning.month);
	});
});
