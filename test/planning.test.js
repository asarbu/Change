import { beforeAll, describe, expect, test } from '@jest/globals';
import PlanningCache from '../static/js/planning/persistence/planningCache.js';
import Planning, { Category, Goal, Statement } from '../static/js/planning/model/planningModel.js';

/** @type {PlanningCache} */
let defaultPlanningCache;

function storeEmptyPlanningCache() {
	const now = new Date();
	const planning = new Planning(now.getTime(), now.getFullYear(), now.getMonth());
	defaultPlanningCache.update(planning.id, planning);
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

	test('is defined for current year', () => {
		expect(defaultPlanningCache).toBeDefined();
	});

	test('stores one empty Planning object', async () => {
		const countBeforeInsert = (await defaultPlanningCache.readAll()).length;
		storeEmptyPlanningCache();
		const countAfterInsert = (await defaultPlanningCache.readAll()).length;
		expect(countAfterInsert - countBeforeInsert).toBe(1);
	});

	test('properly reads one added planning object', async () => {
		const storedPlanning = storeEmptyPlanningCache();
		const readPlanning = await defaultPlanningCache.read(storedPlanning.id);
		expectEqualPlannings(storedPlanning, readPlanning);
	});

	test('deletes one empty Planning object', async () => {
		const countBeforeInsert = (await defaultPlanningCache.readAll()).length;
		const addedPlanning = storeEmptyPlanningCache();
		defaultPlanningCache.delete(addedPlanning.id);
		const countAfterInsert = (await defaultPlanningCache.readAll()).length;
		expect(countAfterInsert).toBe(countBeforeInsert);
	});

	test('stores one empty Statement in a Planning', async () => {
		const addedPlanning = storeEmptyPlanningCache();
		const now = new Date();
		const newStatement = new Statement(now.getTime(), 'Dummy', Statement.EXPENSE);
		addedPlanning.statements = [newStatement];
		await defaultPlanningCache.update(addedPlanning.id, addedPlanning);
		const updatedPlanning = await defaultPlanningCache.read(addedPlanning.id);
		const dbStatement = updatedPlanning.statements.find((stmt) => stmt.id === newStatement.id);
		expect(dbStatement).toBeDefined();
	});
});
