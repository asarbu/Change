/**
 * @jest-environment jsdom
 */

import {
	beforeAll, describe, expect, it,
} from '@jest/globals';
import Planning, { Category, Goal, Statement } from '../static/js/planning/model/planningModel';
import PlanningScreen from '../static/js/planning/view/planningScreen';
import PlanningCache from '../static/js/planning/persistence/planningCache';
import PlanningController from '../static/js/planning/controller/planningController';
import Utils from '../static/js/utils/utils';

// TODO edit mode tests
describe('Planning screen', () => {
	/** @type {PlanningScreen} */
	let defaultPlanningScreen;

	/** @type {Date} */
	let availableDate;

	function nextAvailableDate() {
		if (!availableDate) {
			availableDate = new Date(1970, 0);
		}

		availableDate = new Date(availableDate.getFullYear(), availableDate.getMonth());
		return availableDate;
	}

	function createNewPlanning() {
		const date = nextAvailableDate();
		const planning = new Planning(date.getTime(), date.getFullYear(), date.getMonth(), []);
		return planning;
	}

	beforeAll(() => {
		// Fix structured clone bug.
		// https://stackoverflow.com/questions/73607410/referenceerror-structuredclone-is-not-defined-using-jest-with-nodejs-typesc
		global.structuredClone = (val) => JSON.parse(JSON.stringify(val));

		// Initialize main elements because we do not have an index.html
		const main = document.createElement('main');
		main.id = 'main';
		document.body.appendChild(main);

		const planning = createNewPlanning();
		defaultPlanningScreen = new PlanningScreen(planning);
	});

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
		const tBodyChildren = buildCategory.tBodies[0].children;
		const totalRow = tBodyChildren[tBodyChildren.length - 1];
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
		const tBodyChildren = buildCategory.tBodies[0].children;
		const totalRow = tBodyChildren[tBodyChildren.length - 1];
		expect(totalRow.children[0].textContent).toBe('Total');
		expect(totalRow.children[1].textContent).toBe('30');
		expect(totalRow.children[2].textContent).toBe('90');
		expect(totalRow.children[3].textContent).toBe('10950');
	});

	it('throws error if no planning is provided', () => {
		expect(() => (new PlanningScreen())).toThrowError();
	});

	it('deletes planning from cache', async () => {
		const planning = createNewPlanning();
		const cache = await PlanningCache.get(planning.year);
		cache.storePlanning(planning);
		expect(cache.read(planning.id)).resolves.toEqual(planning);

		delete window.location;
		window.location = new URL(`http://localhost/planning?year=${planning.year}&month=${Utils.nameForMonth(planning.month)}`);

		const planningController = new PlanningController(planning.year, planning.month, '');
		await planningController.init();
		const screen = await planningController.initPlanningScreen(cache);

		screen.onClickedDeletePlanning(planning);
		expect(cache.read(planning.id)).rejects.toThrowError();
	});
});
