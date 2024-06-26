/**
 * @jest-environment jsdom
 */
// TODO remove jsdom environment and send redirect URI directly to gDrive constructor
import {
	beforeAll, describe, expect, it,
} from '@jest/globals';
import PlanningGDrive from '../../static/js/planning/persistence/planningGdrive.js';

describe('Planning gDrive', () => {
	/** @type {PlanningGDrive} */
	let planningGdrive;

	beforeAll(async () => {
		planningGdrive = new PlanningGDrive(2100, true);
	});

	it('throws error without login', async () => {
		expect(planningGdrive.readAll()).rejects.toThrowError();
	});

/* it('stores one empty Planning object', async () => {
		const countBeforeInsert = (await defaultPlanningCache.count());
		await storeEmptyPlanningCache();
		const countAfterInsert = (await defaultPlanningCache.count());
		expect(countAfterInsert - countBeforeInsert).toBe(1);
	});

	it('reads already existing cache', async () => {
		const availableDate = nextAvailablePlanningDate();
		const planningCache = await PlanningCache.get(availableDate.getFullYear());
		const secondPlanningCache = await PlanningCache.get(availableDate.getFullYear());
		expect(planningCache).toBe(secondPlanningCache);
	});

	it('reads one added planning object', async () => {
		const storedPlanning = await storeEmptyPlanningCache();
		const readPlanning = await defaultPlanningCache.read(storedPlanning.id);
		expect(storedPlanning).toEqual(readPlanning);
	});

	it('reads non existing planning object', async () => {
		expect(defaultPlanningCache.read(1)).rejects.toThrowError();
	});

	it('reads all (2) planning items from cache', async () => {
		const countBeforeInsert = (await defaultPlanningCache.count());
		const firstPlanning = await storeEmptyPlanningCache(nextAvailablePlanningDate(0));
		// Wait for 10ms to pass so we do not have an ID conflict (ID is date.now)
		const secondPlanning = await storeEmptyPlanningCache(nextAvailablePlanningDate(1));
		const plannings = await defaultPlanningCache.readAll();
		expect(plannings.length).toBe(countBeforeInsert + 2);
		const foundFirstPlanning = plannings.find((planning) => planning.id === firstPlanning.id);
		const foundSecondPlanning = plannings.find((planning) => planning.id === secondPlanning.id);
		expect(foundFirstPlanning).toBeDefined();
		expect(foundSecondPlanning).toBeDefined();
	});

	it('read all plannings for a month', async () => {
		await storeEmptyPlanningCachesForAYear();
		const currentMonth = now.getMonth();
		const planningForCurrentMonth = await defaultPlanningCache.readForMonth(currentMonth);
		expect(planningForCurrentMonth.month).toBe(currentMonth);
	});

	it('reads all expense categories for a planning object', async () => {
		const availableDate = nextAvailablePlanningDate();
		const expenseGoalOne = new Goal('expenseGoalOne', 10, 300, 3650);
		const expenseGoalTwo = new Goal('expenseGoalTwo', 10, 300, 3650);
		const expenseCategoryOne =
			new Category(1, 'expenseCategoryOne', [expenseGoalOne, expenseGoalTwo]);
		const expenseGoalThree = new Goal('expenseGoalThree', 10, 300, 3650);
		const expenseGoalFour = new Goal('expenseGoalFour', 10, 300, 3650);
		const expenseCategoryTwo =
			new Category(2, 'expenseCategoryTwo', [expenseGoalThree, expenseGoalFour]);
		const expenseStatement = new Statement(
			1,
			'Statement1',
			Statement.EXPENSE,
			[expenseCategoryOne, expenseCategoryTwo],
		);

		const incomeGoalOne = new Goal('incomeGoalOne', 10, 300, 3650);
		const incomeGoalTwo = new Goal('incomeGoalTwo', 10, 300, 3650);
		const incomeCategoryOne = new Category(
			1,
			'incomeCategoryOne',
			[incomeGoalOne, incomeGoalTwo],
		);
		const incomeCategoryTwo = new Category(2, 'incomeCategoryTwo');
		const incomeStatement = new Statement(
			1,
			'Statement1',
			Statement.INCOME,
			[incomeCategoryOne, incomeCategoryTwo],
		);

		const savingGoalOne = new Goal('savingGoalOne', 10, 300, 3650);
		const savingGoalTwo = new Goal('savingGoalTwo', 10, 300, 3650);
		const savingGoalThree = new Goal('savingGoalThree', 10, 300, 3650);
		const savingGoalFour = new Goal('savingGoalFour', 10, 300, 3650);
		const savingCategoryOne = new Category(
			1,
			'savingCategoryOne',
			[savingGoalOne, savingGoalTwo],
		);
		const savingCategoryTwo = new Category(
			2,
			'savingCategoryTwo',
			[savingGoalThree, savingGoalFour],
		);
		const savingStatement = new Statement(
			1,
			'Statement1',
			Statement.SAVING,
			[savingCategoryOne, savingCategoryTwo],
		);

		const planning = new Planning(
			1,
			availableDate.getFullYear(),
			availableDate.getMonth(),
			[expenseStatement, incomeStatement, savingStatement],
		);
		const planningCache = await PlanningCache.get(availableDate.getFullYear());
		planningCache.store(planning);
		const storedPlanning = await planningCache.read(planning.id);
		// Move the below method to Planning class
		const expenseCategories = await storedPlanning.readCategories(Statement.EXPENSE);
		expect(expenseCategories).toEqual([expenseCategoryOne, expenseCategoryTwo]);
	});

	it('deletes one empty Planning object', async () => {
		const countBeforeInsert = (await defaultPlanningCache.count());
		const addedPlanning = await storeEmptyPlanningCache(nextAvailablePlanningDate());
		defaultPlanningCache.delete(addedPlanning.id);
		const countAfterInsert = (await defaultPlanningCache.count());
		expect(countAfterInsert).toBe(countBeforeInsert);
	});

	it('stores one empty Statement in a Planning', async () => {
		const addedPlanning = await storeEmptyPlanningCache();
		const newStatement = new Statement(now.getTime(), 'Dummy', Statement.EXPENSE);
		addedPlanning.statements = [newStatement];
		await defaultPlanningCache.store(addedPlanning);
		const updatedPlanning = await defaultPlanningCache.read(addedPlanning.id);
		const dbStatement = updatedPlanning.statements.find((stmt) => stmt.id === newStatement.id);
		expect(dbStatement).toBeDefined();
	});

	it('stores statement created in last day of the year', async () => {
		const addedPlanning = await storeEmptyPlanningCache();
		const lastDayofYear = Date.parse('12-31-2024');
		const newStatement = new Statement(lastDayofYear, 'Dummy', Statement.EXPENSE);
		addedPlanning.statements = [newStatement];
		await defaultPlanningCache.store(addedPlanning);
		const updatedPlanning = await defaultPlanningCache.read(addedPlanning.id);
		const dbStatement = updatedPlanning.statements.find((stmt) => stmt.id === newStatement.id);
		expect(dbStatement.id).toBe(lastDayofYear);
		expect(dbStatement).toBeDefined();
	});

	it('stores statement created in first day of the year', async () => {
		const addedPlanning = await storeEmptyPlanningCache();
		const firstDayOfYear = Date.parse('01-01-2024');
		const newStatement = new Statement(firstDayOfYear, 'Dummy', Statement.EXPENSE);
		addedPlanning.statements = [newStatement];
		await defaultPlanningCache.store(addedPlanning);
		const updatedPlanning = await defaultPlanningCache.read(addedPlanning.id);
		const dbStatement = updatedPlanning.statements.find((stmt) => stmt.id === newStatement.id);
		expect(dbStatement.id).toBe(firstDayOfYear);
		expect(dbStatement).toBeDefined();
	});

	it('update all (2) planning items from cache', async () => {
		const firstPlanning = await storeEmptyPlanningCache();
		// Wait for 10ms to pass so we do not have an ID conflict (ID is date.now)
		await new Promise((r) => { setTimeout(r, 10); });
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

	it('returns a Planning class instance', async () => {
		const planings = await defaultPlanningCache.readAll();
		planings.forEach((planning) => {
			expect(planning instanceof Planning).toBeTruthy();
		});
	}); */
});
