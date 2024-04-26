/**
 * @jest-environment jsdom
 */

import {
	beforeAll, describe, expect, test,
} from '@jest/globals';
import Planning, { Category, Goal, Statement } from '../static/js/planning/model/planningModel';
import PlanningScreen from '../static/js/planning/view/planningScreen';

// TODO edit mode tests
describe('Planning screen', () => {
	/** @type {PlanningScreen} */
	let defaultPlanningScreen;

	beforeAll(() => {
		const planning = new Planning(1, 1970, 0, []);
		defaultPlanningScreen = new PlanningScreen(planning);
	});

	test('builds no goal for no data', () => {
		const goal = defaultPlanningScreen.buildGoal();
		expect(goal).not.toBeDefined();
	});

	test('builds one goal with correct goal data', () => {
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

	test('builds no categories for empty array', () => {
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

	test('builds one category with correct category data', () => {
		const category = new Category('Category One', 'Category Name', []);
		const builtCategories = defaultPlanningScreen.buildCategories([category]);
		/** @type {HTMLTableElement} */
		const buildCategory = builtCategories[0].toHtml();
		expectCorrectCategoryHtml(category, buildCategory);
	});

	test('builds two categories with correct category data', () => {
		const categoryOne = new Category('Category One', 'Category Name', []);
		const categoryTwo = new Category('Category Two', 'Category Name', []);
		const builtCategories = defaultPlanningScreen.buildCategories([categoryOne, categoryTwo]);
		/** @type {HTMLTableElement} */
		expectCorrectCategoryHtml(categoryOne, builtCategories[0].toHtml());
		expectCorrectCategoryHtml(categoryTwo, builtCategories[1].toHtml());
	});

	test('build no statement for no data', () => {
		const statementHtml = defaultPlanningScreen.buildStatement();
		expect(statementHtml).not.toBeDefined();
	});

	test('build one statements with correct statement data', () => {
		const statement = new Statement('Statement One', 'Statement name', Statement.EXPENSE, []);
		const html = defaultPlanningScreen.buildStatement(statement).toHtml();
		expect(html).toBeDefined();
		const title = html.children[0].textContent;
		const subtitle = html.children[1].textContent;
		expect(title).toBe('Statement name');
		expect(subtitle).toBe(`${Statement.EXPENSE} ▼`);
	});

	test('builds total row for a category', () => {
		const goalOne = new Goal('Goal One', 10, 30, 3650);
		const goalTwo = new Goal('Goal Two', 10, 30, 3650);
		const category = new Category('Category ID', 'Category name', [goalOne, goalTwo]);
		const html = defaultPlanningScreen.buildTotalRow(category).toHtml();
		expect(html.children[0].textContent).toBe('Total');
		expect(html.children[1].textContent).toBe('20');
		expect(html.children[2].textContent).toBe('60');
		expect(html.children[3].textContent).toBe('7300');
	});

	test('correctly computes total for a given category', () => {
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

	test('correctly recomputes total for a changed category', () => {
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
});
