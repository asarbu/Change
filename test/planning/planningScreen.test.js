/**
 * @jest-environment jsdom
 */

import {
	beforeAll, describe, expect, it,
	jest,
} from '@jest/globals';
import Planning, { Category, Goal, Statement } from '../../static/js/planning/model/planningModel';
import PlanningScreen from '../../static/js/planning/view/planningScreen';
import PlanningCache from '../../static/js/planning/persistence/planningCache';
import PlanningController from '../../static/js/planning/controller/planningController';

// TODO edit mode tests
describe('Planning screen', () => {
	/** @type {PlanningScreen} */
	let defaultPlanningScreen;

	beforeAll(async () => {
		jest.useFakeTimers().setSystemTime(new Date(2000, 0));
		// Fix structured clone bug.
		// https://stackoverflow.com/questions/73607410/referenceerror-structuredclone-is-not-defined-using-jest-with-nodejs-typesc
		global.structuredClone = (val) => JSON.parse(JSON.stringify(val));

		// Initialize main elements because we do not have an index.html
		const main = document.createElement('main');
		main.id = 'main';
		document.body.appendChild(main);

		const now = new Date();
		const planning = new Planning(now.getTime(), now.getFullYear(), now.getMonth());
		(await PlanningCache.get(now.getFullYear())).store(planning);
		defaultPlanningScreen = await (new PlanningController().init());
	});

	function buildFullPlanning() {
		const now = new Date();
		const planning = new Planning(now.getTime(), now.getFullYear(), now.getMonth());
		const newStatement = new Statement(now.getTime(), 'Statement One', Statement.EXPENSE);
		const newCategory = new Category(now.getTime(), 'Category One');
		const newGoal = new Goal('Goal One', 10, 30, 3650);
		newCategory.goals.push(newGoal);
		newStatement.categories.push(newCategory);
		planning.statements.push(newStatement);
		return planning;
	}

	it('builds no goal for no data', () => {
		const goal = defaultPlanningScreen.buildGoal();
		expect(goal).not.toBeDefined();
	});

	it('builds one goal with correct goal data', () => {
		const goal = new Goal('Goal One', 10, 30, 3650);
		/** @type {HTMLTableRowElement} */
		const row = defaultPlanningScreen.buildGoal(goal).toHtml();
		expect(row).toBeDefined();
		const children = row.childNodes;
		expect(children[0].textContent).toBe('Goal One');
		expect(children[1].textContent).toBe('10');
		expect(children[2].textContent).toBe('30');
		expect(children[3].textContent).toBe('3650');
	});

	it('builds no categories for empty array', () => {
		const categories = defaultPlanningScreen.buildCategories([]);
		expect(categories.length).toBe(0);
	});

	/**
	 * @param {Category} category
	 * @param {HTMLTableElement} html
	 */
	function expectCorrectCategoryHtml(category, html) {
		expect(html).toBeDefined();
		expect(html.id).toBe(category.id);
		expect(html.tHead.children[0].children[0].textContent).toBe(category.name);
	}

	it('builds one category with correct category data', () => {
		const category = new Category('Category One', 'Category Name', []);
		const builtCategories = defaultPlanningScreen.buildCategories([category]);
		/** @type {HTMLTableElement} */
		const buildCategory = builtCategories[0].toHtml();
		expectCorrectCategoryHtml(category, buildCategory);
	});

	it('builds two categories with correct category data', () => {
		const categoryOne = new Category('Category One', 'Category Name', []);
		const categoryTwo = new Category('Category Two', 'Category Name', []);
		const builtCategories = defaultPlanningScreen.buildCategories([categoryOne, categoryTwo]);
		/** @type {HTMLTableElement} */
		expectCorrectCategoryHtml(categoryOne, builtCategories[0].toHtml());
		expectCorrectCategoryHtml(categoryTwo, builtCategories[1].toHtml());
	});

	it('builds no statement for no data', () => {
		const statementHtml = defaultPlanningScreen.buildStatement();
		expect(statementHtml).not.toBeDefined();
	});

	it('builds one statements with correct statement data', () => {
		const statement = new Statement('Statement One', 'Statement name', Statement.EXPENSE, []);
		const html = defaultPlanningScreen.buildStatement(statement).toHtml();
		expect(html).toBeDefined();
		const title = html.children[0].textContent;
		const subtitle = html.children[1].textContent;
		expect(title).toBe('Statement name');
		expect(subtitle).toBe(`${Statement.EXPENSE} ▼`);
	});

	it('builds total row for a category', () => {
		const goalOne = new Goal('Goal One', 10, 30, 3650);
		const goalTwo = new Goal('Goal Two', 10, 30, 3650);
		const category = new Category('Category ID', 'Category name', [goalOne, goalTwo]);
		const html = defaultPlanningScreen.buildTotalRow(category).toHtml();
		expect(html.children[0].textContent).toBe('Total');
		expect(html.children[1].textContent).toBe('20');
		expect(html.children[2].textContent).toBe('60');
		expect(html.children[3].textContent).toBe('7300');
	});

	it('correctly computes total for a given category', () => {
		const goalOne = new Goal('Goal One', 10, 30, 3650);
		const goalTwo = new Goal('Goal Two', 10, 30, 3650);
		const category = new Category('Category ID', 'Category name', [goalOne, goalTwo]);
		const builtCategories = defaultPlanningScreen.buildCategories([category]);
		/** @type {HTMLTableElement} */
		const buildCategory = builtCategories[0].toHtml();
		const totalRow = buildCategory.tFoot.children[0];
		expect(totalRow.children[0].textContent).toBe('Total');
		expect(totalRow.children[1].textContent).toBe('20');
		expect(totalRow.children[2].textContent).toBe('60');
		expect(totalRow.children[3].textContent).toBe('7300');
	});

	it('correctly recomputes total for a changed category', () => {
		const goalOne = new Goal('Goal One', 10, 30, 3650);
		const goalTwo = new Goal('Goal Two', 10, 30, 3650);
		const category = new Category('Category ID', 'Category name', [goalOne, goalTwo]);
		const builtCategories = defaultPlanningScreen.buildCategories([category]);
		/** @type {HTMLTableElement} */
		const buildCategory = builtCategories[0].toHtml();

		// Update one goal
		goalTwo.daily = 20;
		goalTwo.monthly = 60;
		goalTwo.yearly = 7300;

		// Recompute new total and extract it
		/** @type {HTMLTableElement} */
		defaultPlanningScreen.recomputeCategoryTotal(category);
		const totalRow = buildCategory.tFoot.children[0];
		expect(totalRow.children[0].textContent).toBe('Total');
		expect(totalRow.children[1].textContent).toBe('30');
		expect(totalRow.children[2].textContent).toBe('90');
		expect(totalRow.children[3].textContent).toBe('10950');
	});

	it('throws error if no planning is provided', () => {
		expect(() => (new PlanningScreen())).toThrowError();
	});

	it('deletes planning from cache', async () => {
		jest.useFakeTimers().setSystemTime(new Date(2001, 0));
		const now = new Date();
		const planning = new Planning(now.getTime(), now.getFullYear(), now.getMonth());
		const cache = await PlanningCache.get(planning.year);
		cache.store(planning);
		expect(cache.read(planning.id)).resolves.toEqual(planning);

		const planningController = new PlanningController(planning.year, planning.month, '');
		const screen = await planningController.init();

		const modal = screen.onClickedDeletePlanning(planning);
		await modal.clickYes();
		expect(cache.read(planning.id)).rejects.toThrowError();
	});

	it('adds statement in cache', async () => {
		jest.useFakeTimers().setSystemTime(new Date(2002, 0));
		const now = new Date();
		const planning = new Planning(now.getTime(), now.getFullYear(), now.getMonth());
		const cache = await PlanningCache.get(planning.year);
		await cache.store(planning);
		const storedPlanning = await cache.read(planning.id);
		expect(storedPlanning.statements.length).toBe(0);

		const planningController = new PlanningController(planning.year, planning.month, '');
		const screen = await planningController.init();

		const newStatement = new Statement(now.getTime(), 'New Statement', Statement.EXPENSE);
		planning.statements.push(newStatement);
		// controller listener callback returns promise, so it can be awaited.
		await screen.onClickedSaveStatement(newStatement);

		const updatePlanning = await cache.read(planning.id);
		expect(updatePlanning.statements.length).toBeGreaterThan(0);
	});

	it('deletes statement from cache', async () => {
		jest.useFakeTimers().setSystemTime(new Date(2003, 0));
		const now = new Date();
		const planning = new Planning(now.getTime(), now.getFullYear(), now.getMonth());
		const cache = await PlanningCache.get(now.getFullYear());
		const newStatement = new Statement(now.getTime(), 'New Statement', Statement.EXPENSE);
		planning.statements.push(newStatement);
		await cache.store(planning);
		const storedPlanning = await cache.read(planning.id);
		expect(storedPlanning.statements.length).toBeGreaterThan(0);

		const planningController = new PlanningController(planning.year, planning.month, '');
		const screen = await planningController.init();

		screen.onClickedDeleteStatement(newStatement);
		await screen.onClickedSavePlanning();

		const updatePlanning = await cache.read(planning.id);
		expect(updatePlanning.statements.length).toBe(0);
	});

	it('updates statement type in cache', async () => {
		jest.useFakeTimers().setSystemTime(new Date(2004, 0));
		const now = new Date();
		const planning = new Planning(now.getTime(), now.getFullYear(), now.getMonth());
		const cache = await PlanningCache.get(now.getFullYear());
		const newStatement = new Statement(now.getTime(), 'New Statement', Statement.EXPENSE);
		planning.statements.push(newStatement);
		await cache.store(planning);
		const storedPlanning = await cache.read(planning.id);
		expect(storedPlanning.statements[0].type).toBe(Statement.EXPENSE);

		const planningController = new PlanningController(planning.year, planning.month, '');
		const screen = await planningController.init();

		screen.onClickedChangeStatementType({ currentTarget: { textContent: Statement.INCOME } });
		await screen.onClickedSavePlanning();

		const updatePlanning = await cache.read(planning.id);
		expect(updatePlanning.statements[0].type).toBe(Statement.INCOME);
	});

	it('creates category in cache', async () => {
		jest.useFakeTimers().setSystemTime(new Date(2005, 0));
		const now = new Date();
		const planning = buildFullPlanning();
		const cache = await PlanningCache.get(now.getFullYear());
		await cache.store(planning);
		const storedPlanning = await cache.read(planning.id);
		const storedCategoriesCount = storedPlanning.statements[0].categories.length;

		const planningController = new PlanningController(planning.year, planning.month, '');
		const screen = await planningController.init();

		screen.onClickedAddCategory({ currentTarget: { textContent: Statement.INCOME } });
		await screen.onClickedSavePlanning();

		const updatePlanning = await cache.read(planning.id);
		expect(updatePlanning.statements[0].categories.length).toBe(1 + storedCategoriesCount);
	});

	it('updates category in cache', async () => {
		jest.useFakeTimers().setSystemTime(new Date(2006, 0));
		const planning = await buildFullPlanning();
		const now = new Date();
		const cache = await PlanningCache.get(now.getFullYear());

		await cache.store(planning);
		const storedPlanning = await cache.read(planning.id);
		const category = storedPlanning.statements[0].categories[0];
		expect(category.name).toBe('Category One');

		const planningController = new PlanningController(planning.year, planning.month, '');
		const planningScreen = await planningController.init();

		/** @type {HTMLTableElement} */
		const categoryHtml = document.getElementById(category.id);
		const categoryTd = categoryHtml.tHead.childNodes[0].childNodes[0];
		categoryTd.textContent = 'New Category';
		planningScreen.onKeyUpCategoryName({ currentTarget: categoryTd });
		await planningScreen.onClickedSavePlanning();

		const updatePlanning = await cache.read(planning.id);
		expect(updatePlanning.statements[0].categories[0].name).toBe('New Category');
	});

	it('deletes category from cache', async () => {
		jest.useFakeTimers().setSystemTime(new Date(2007, 0));
		const planning = await buildFullPlanning();
		const now = new Date();
		const cache = await PlanningCache.get(now.getFullYear());

		await cache.store(planning);
		const storedPlanning = await cache.read(planning.id);
		const storedCategory = storedPlanning.statements[0].categories[0];
		expect(storedCategory.name).toBe('Category One');

		const planningController = new PlanningController(planning.year, planning.month, '');
		const planningScreen = await planningController.init();

		/** @type {HTMLTableElement} */
		const categoryHtml = document.getElementById(storedCategory.id);
		const categoryTr = categoryHtml.tHead.childNodes[0];
		const categoryTd = categoryTr.childNodes[categoryTr.childNodes.length - 1];
		planningScreen.onClickedDeleteCategory({ currentTarget: categoryTd });
		await planningScreen.onClickedSavePlanning();

		const deletedCategory = (await cache.read(planning.id))
			.statements[0]
			.categories
			.find((statementCategory) => statementCategory.id === storedCategory.id);
		expect(deletedCategory).not.toBeDefined();
	});

	it('deletes category from DOM', async () => {
		jest.useFakeTimers().setSystemTime(new Date(2008, 0));
		const planning = await buildFullPlanning();
		const now = new Date();
		const cache = await PlanningCache.get(now.getFullYear());

		await cache.store(planning);
		const storedPlanning = await cache.read(planning.id);
		const category = storedPlanning.statements[0].categories[0];
		expect(category.name).toBe('Category One');

		const planningController = new PlanningController(planning.year, planning.month, '');
		const planningScreen = await planningController.init();

		/** @type {HTMLTableElement} */
		const categoryHtml = document.getElementById(category.id);
		const categoryTd = categoryHtml.tHead.childNodes[0].childNodes[0];
		planningScreen.onClickedDeleteCategory({ currentTarget: categoryTd });

		expect(document.getElementById(category.id)).toBeNull();
	});

	it('creates goal in cache', async () => {
		jest.useFakeTimers().setSystemTime(new Date(2009, 0));
		const now = new Date();
		const planning = buildFullPlanning();
		const cache = await PlanningCache.get(now.getFullYear());
		await cache.store(planning);
		const storedPlanning = await cache.read(planning.id);
		const storedGoalsCount = storedPlanning.statements[0].categories[0].goals.length;

		const planningController = new PlanningController(planning.year, planning.month, '');
		const screen = await planningController.init();
		const category = planning.statements[0].categories[0];

		/** @type {HTMLTableElement} */
		const categoryHtmlTable = document.getElementById(category.id);
		const categoryRows = categoryHtmlTable.tBodies[0].childNodes;
		const categoryTotalRow = categoryRows[categoryRows.length - 1];
		const categoryAddCell = categoryTotalRow.childNodes[categoryTotalRow.childNodes.length - 1];
		screen.onClickedAddGoal({ currentTarget: categoryAddCell });
		await screen.onClickedSavePlanning();

		const updatePlanning = await cache.read(planning.id);
		expect(updatePlanning.statements[0].categories[0].goals.length).toBe(1 + storedGoalsCount);
	});

	it('deletes goal from cache', async () => {
		jest.useFakeTimers().setSystemTime(new Date(2010, 0));
		const now = new Date();
		const planning = buildFullPlanning();
		const cache = await PlanningCache.get(now.getFullYear());
		await cache.store(planning);
		const storedPlanning = await cache.read(planning.id);
		const storedGoalsCount = storedPlanning.statements[0].categories[0].goals.length;

		const planningController = new PlanningController(planning.year, planning.month, '');
		const screen = await planningController.init();
		const category = planning.statements[0].categories[0];

		/** @type {HTMLTableElement} */
		const categoryHtmlTable = document.getElementById(category.id);
		const categoryRows = categoryHtmlTable.tBodies[0].childNodes;
		const categoryGoalRow = categoryRows[0];
		const goalDeleteCell = categoryGoalRow.childNodes[categoryGoalRow.childNodes.length - 1];
		screen.onClickedDeleteGoal({ currentTarget: goalDeleteCell });
		await screen.onClickedSavePlanning();

		const updatePlanning = await cache.read(planning.id);
		expect(updatePlanning.statements[0].categories[0].goals.length).toBe(storedGoalsCount - 1);
	});

	it('updates goal name in cache', async () => {
		jest.useFakeTimers().setSystemTime(new Date(2011, 0));
		const now = new Date();
		const planning = buildFullPlanning();
		const cache = await PlanningCache.get(now.getFullYear());
		await cache.store(planning);

		const planningController = new PlanningController(planning.year, planning.month, '');
		const screen = await planningController.init();
		const category = planning.statements[0].categories[0];

		/** @type {HTMLTableElement} */
		const categoryHtmlTable = document.getElementById(category.id);
		const categoryRows = categoryHtmlTable.tBodies[0].childNodes;
		const categoryGoalRow = categoryRows[0];
		const goalNameCell = categoryGoalRow.childNodes[0];
		goalNameCell.textContent = 'Other Goal';

		screen.onKeyUpGoal({ currentTarget: goalNameCell, cellIndex: 0 });
		await screen.onClickedSavePlanning();

		const updatePlanning = await cache.read(planning.id);
		expect(updatePlanning.statements[0].categories[0].goals[0].name).toBe('Other Goal');
	});

	it('updates goal daily amount in cache', async () => {
		jest.useFakeTimers().setSystemTime(new Date(2012, 0));
		const now = new Date();
		const planning = buildFullPlanning();
		const cache = await PlanningCache.get(now.getFullYear());
		await cache.store(planning);

		const planningController = new PlanningController(planning.year, planning.month, '');
		const screen = await planningController.init();
		const category = planning.statements[0].categories[0];

		/** @type {HTMLTableElement} */
		const categoryHtmlTable = document.getElementById(category.id);
		const categoryRows = categoryHtmlTable.tBodies[0].childNodes;
		const categoryGoalRow = categoryRows[0];
		const goalNameCell = categoryGoalRow.childNodes[1];
		goalNameCell.textContent = '123';

		screen.onKeyUpGoal({ currentTarget: goalNameCell, cellIndex: 1 });
		await screen.onClickedSavePlanning();

		const updatePlanning = await cache.read(planning.id);
		expect(updatePlanning.statements[0].categories[0].goals[0].daily).toBe(123);
	});

	it('updates goal monthly amount in cache', async () => {
		jest.useFakeTimers().setSystemTime(new Date(2013, 0));
		const now = new Date();
		const planning = buildFullPlanning();
		const cache = await PlanningCache.get(now.getFullYear());
		await cache.store(planning);

		const planningController = new PlanningController(planning.year, planning.month, '');
		const screen = await planningController.init();
		const category = planning.statements[0].categories[0];

		/** @type {HTMLTableElement} */
		const categoryHtmlTable = document.getElementById(category.id);
		const categoryRows = categoryHtmlTable.tBodies[0].childNodes;
		const categoryGoalRow = categoryRows[0];
		const goalNameCell = categoryGoalRow.childNodes[2];
		goalNameCell.textContent = '123';

		screen.onKeyUpGoal({ currentTarget: goalNameCell, cellIndex: 2 });
		await screen.onClickedSavePlanning();

		const updatePlanning = await cache.read(planning.id);
		expect(updatePlanning.statements[0].categories[0].goals[0].monthly).toBe(123);
	});

	it('updates goal yearly amount in cache', async () => {
		jest.useFakeTimers().setSystemTime(new Date(2014, 0));
		const now = new Date();
		const planning = buildFullPlanning();
		const cache = await PlanningCache.get(now.getFullYear());
		await cache.store(planning);

		const planningController = new PlanningController(planning.year, planning.month, '');
		const screen = await planningController.init();
		const category = planning.statements[0].categories[0];

		/** @type {HTMLTableElement} */
		const categoryHtmlTable = document.getElementById(category.id);
		const categoryRows = categoryHtmlTable.tBodies[0].childNodes;
		const categoryGoalRow = categoryRows[0];
		const goalNameCell = categoryGoalRow.childNodes[3];
		goalNameCell.textContent = '123';

		screen.onKeyUpGoal({ currentTarget: goalNameCell, cellIndex: 3 });
		await screen.onClickedSavePlanning();

		const updatePlanning = await cache.read(planning.id);
		expect(updatePlanning.statements[0].categories[0].goals[0].yearly).toBe(123);
	});

	it('throw error for invalid goal cell update', async () => {
		jest.useFakeTimers().setSystemTime(new Date(2015, 0));
		const now = new Date();
		const planning = buildFullPlanning();
		const cache = await PlanningCache.get(now.getFullYear());
		await cache.store(planning);

		const planningController = new PlanningController(planning.year, planning.month, '');
		const screen = await planningController.init();
		const category = planning.statements[0].categories[0];

		/** @type {HTMLTableElement} */
		const categoryHtmlTable = document.getElementById(category.id);
		const categoryRows = categoryHtmlTable.tBodies[0].childNodes;
		const categoryGoalRow = categoryRows[0];
		const goalNameCell = categoryGoalRow.childNodes[4];

		// Here we have an off by one error in cellIndex field
		const event = { currentTarget: goalNameCell };
		expect(() => { screen.onKeyUpGoal(event); }).toThrowError();
	});
});
