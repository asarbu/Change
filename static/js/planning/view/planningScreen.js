/* eslint-disable class-methods-use-this */
import GraphicEffects from '../../gui/effects.js';
import Sidenav from '../../gui/sidenav.js';
import Dom from '../../gui/dom.js';
import Planning, { Statement, Category, Goal } from '../model/planningModel.js';
import icons from '../../gui/icons.js';
import PlanningNavbar from './planningNavbar.js';

export default class PlanningScreen {
	onClickUpdate = undefined;

	onStatementAdded = undefined;

	#onClickedDeletePlanning = undefined;

	/** @type {Sidenav} */
	#sidenav = undefined;

	/** @type {Map<string, Dom>} */
	#categoryDoms = new Map();

	/** @type {Planning} */
	#defaultPlanning = undefined;

	/** @type {boolean} */
	#editMode = false;

	/**
	 * Constructor
	 * @param {string} year Unique identifier of the screen
	 * @param {Planning} planning Planning object to draw on the screen
	 */
	constructor(planning) {
		if (!planning) {
			throw Error('No planning provided to draw on the screen');
		}
		this.#defaultPlanning = planning;
	}

	/**
	 * Initialize the current screen
	 */
	init() {
		this.navbar = new PlanningNavbar(this.#defaultPlanning);

		this.navbar.onClickSave(this.onClickedSave.bind(this));
		this.navbar.onClickEdit(this.onClickedEdit.bind(this));
		this.navbar.onChangeStatementType(this.onChangedStatementType.bind(this));
		this.navbar.onClickSaveStatement(this.onClickedSaveStatement.bind(this));
		this.navbar.onChangeStatement(this.onClickedShowStatement.bind(this));
		this.navbar.onClickDeletePlanning(this.onClickedDeletePlanning.bind(this));

		const mainElement = document.getElementById('main');
		mainElement.appendChild(this.navbar.toHtml());
		this.navbar.selectYear(this.#defaultPlanning.year);
		this.containerHtml = this.buildContainer().toHtml();
		mainElement.appendChild(this.containerHtml);
		this.gfx = new GraphicEffects();
		this.gfx.init(this.containerHtml);
		this.#sidenav = new Sidenav(this.gfx);
		document.body.appendChild(this.#sidenav.toHtml());
	}

	// #region DOM update
	appendYear(year) {
		this.navbar.appendYear(year);
		this.navbar.updateYearDropupText();
	}

	appendMonth(month) {
		this.navbar.appendMonth(month);
		this.navbar.updateMonthDropupText();
	}
	// #endregion

	// #region DOM creation

	/**
	 * Creates all necessary objects needed to draw current screen
	 * @returns {Dom}
	 */
	buildContainer() {
		const container = new Dom('div').id(this.#defaultPlanning.year).cls('container');
		const section =	new Dom('div').cls('section');
		const { statements } = this.#defaultPlanning;

		// TODO Merge this with navbar creation, since we are iterating through same array.
		for (let i = 0; i < statements.length; i += 1) {
			const statement = statements[i];
			const htmlStatement = this.buildStatement(statement).userData(statement);

			section.append(htmlStatement);
			this.navbar.appendStatement(statement.name);
		}

		container.append(section);
		return container;
	}

	/**
	 * Creates a DOM statement
	 * @param {Statement} statement Statement representing this slice
	 * @returns {Dom | undefined} Constructed and decorated DOM element
	 */
	buildStatement(statement) {
		if (!statement) return undefined;

		const onKeyUp = this.onKeyUpStatementName.bind(this);
		const onClickStatementType = this.onClickedStatementType.bind(this);
		const onClickAddCategory = this.onClickedAddCategory.bind(this);
		const slice = new Dom('div').cls('slice').append(
			new Dom('h1').text(statement.name).editable().onKeyUp(onKeyUp).attr('contenteditable', this.#editMode),
			new Dom('h2').id('planning-statement-type').text(`${statement.type} `).onClick(onClickStatementType).hideable(this.#editMode)
				.append(
					new Dom('span').cls('white-50').text('▼'),
				),
			...this.buildCategories(statement.categories),
			Dom.imageButton('Add Category', icons.add_table).hideable(this.#editMode).onClick(onClickAddCategory),
		);

		return slice;
	}

	/**
	 * Creates a Dom array containing all of the tables constructed from the categories.
	 * @param {Array<Category>} planningCategories Categories to draw inside parent statement
	 * @returns {Array<Dom>} Document fragment with all of the created tables
	 */
	buildCategories(planningCategories) {
		const categories = [];
		const onKeyUpCategoryName = this.onKeyUpCategoryName.bind(this);

		for (let i = 0; i < planningCategories.length; i += 1) {
			const category = planningCategories[i];
			const categoryDom = new Dom('table').id(category.id).cls('top-round', 'bot-round').append(
				new Dom('thead').append(
					new Dom('tr').append(
						new Dom('th').text(category.name).editable().contentEditable(this.#editMode)
							.onKeyUp(onKeyUpCategoryName),
						new Dom('th').text('Daily'),
						new Dom('th').text('Monthly'),
						new Dom('th').text('Yearly'),
						new Dom('th').hideable(this.#editMode).append(
							Dom.imageButton('Delete row', icons.delete),
						),
					),
				),
				new Dom('tbody').append(
					...category.goals.map((goal) => this.buildGoal(goal)),
					this.buildTotalRow(category),
				),
			).userData(category);
			categories.push(categoryDom);
			this.#categoryDoms.set(category.id, categoryDom);
		}
		return categories;
	}

	/**
	 * @param {Goal} goal to build
	 * @returns {Dom | undefined}
	 */
	buildGoal(goal) {
		if (!goal) return undefined;
		const onClickDeleteGoal = this.onClickedDeleteGoal.bind(this);
		const onKeyUpGoal = this.onKeyUpGoal.bind(this);
		return new Dom('tr').id(`Goal_${goal.id}`).userData(goal).append(
			new Dom('td').text(goal.name).editable().contentEditable(this.#editMode).onKeyUp(onKeyUpGoal),
			new Dom('td').text(goal.daily).editable().contentEditable(this.#editMode).onKeyUp(onKeyUpGoal),
			new Dom('td').text(goal.monthly).editable().contentEditable(this.#editMode).onKeyUp(onKeyUpGoal),
			new Dom('td').text(goal.yearly).editable().contentEditable(this.#editMode).onKeyUp(onKeyUpGoal),
			new Dom('td').hideable(this.#editMode).onClick(onClickDeleteGoal).append(
				Dom.imageButton('Delete goal', icons.delete),
			),
		);
	}
	// #endregion

	// #region DOM manipulation
	/** Refresh screen */
	refresh(planning) {
		return planning;
		// TODO reimplement this
		/*
		const newContainer = this.buildContainer();
		const mainElement = document.getElementById('main');
		mainElement.replaceChild(newContainer, this.containerHtml);
		this.containerHtml = newContainer; */
	}

	/**
	 * @param {Category} forCategory
	 */
	buildTotalRow(forCategory) {
		return new Dom('tr').append(
			new Dom('td').text('Total'),
			new Dom('td').text(forCategory.totalDaily()),
			new Dom('td').text(forCategory.totalMonthly()),
			new Dom('td').text(forCategory.totalYearly()),
			new Dom('td').hideable(this.#editMode).onClick(this.onClickedAddGoal.bind(this)).append(
				Dom.imageButton('Add row', icons.add_row),
			),
		);
	}

	// Recompute from DOM instead of memory/db/network to have real time updates in UI
	/**
	 * Computes the column wise total value of the category table and replaces the last row.
	 * @param {Category} category category for which to compute total row
	 */
	recomputeCategoryTotal(category) {
		if (!category || !this.#categoryDoms.has(category.id)) throw Error(`Invalid category ${category}`);

		const categoryDom = this.#categoryDoms.get(category.id);
		/** @type {HTMLTableSectionElement} */
		const tBody = categoryDom.toHtml().tBodies[0];
		tBody.children[tBody.children.length - 1].remove();
		tBody.appendChild(this.buildTotalRow(category).toHtml());
	}
	// #endregion

	// #region event handlers
	// #region planning event handlers
	onClickDeletePlanning(handler) {
		this.#onClickedDeletePlanning = handler;
	}

	onClickedDeletePlanning(planning) {
		if (this.#onClickedDeletePlanning) {
			return this.#onClickedDeletePlanning(planning);
		}
		return undefined;
	}
	// #endregion

	// #region statement event handlers
	onClickedDeleteStatement() {
		this.#defaultPlanning.statements.splice(this.gfx.selectedIndex(), 1);
		this.refresh(this.#defaultPlanning);
	}

	onClickedSaveStatement(statement) {
		if (this.onStatementAdded) {
			return this.onStatementAdded(statement);
		}
		return undefined;
	}

	onClickedShowStatement(statementName) {
		const { statements } = this.#defaultPlanning;
		const index = statements.findIndex((statement) => statement.name === statementName);
		if (index >= 0) this.gfx.slideTo(index);
	}

	onClickedChangeStatementType(e) {
		const newStatementType = e.currentTarget.textContent;
		const statement = this.#defaultPlanning.statements[this.gfx.selectedIndex()];
		statement.type = newStatementType;
		this.refresh(this.#defaultPlanning);
	}

	onClickedEdit() {
		const tableDefs = document.querySelectorAll('[editable="true"]');
		for (let i = 0; i < tableDefs.length; i += 1) {
			tableDefs[i].contentEditable = 'true';
		}

		const elements = document.querySelectorAll('[hideable="true"]');
		for (let i = 0; i < elements.length; i += 1) {
			elements[i].style.display = '';
		}

		this.#editMode = true;
	}

	/**
	 * @param {Planning} forPlanning
	 */
	onClickedSave(forPlanning) {
		const editableElmts = document.querySelectorAll('[editable="true"]');
		for (let i = 0; i < editableElmts.length; i += 1) {
			editableElmts[i].contentEditable = 'false';
		}

		const hideableElmts = document.querySelectorAll('[hideable="true"]');
		for (let i = 0; i < hideableElmts.length; i += 1) {
			hideableElmts[i].style.display = 'none';
		}

		this.#editMode = false;

		if (this.onClickUpdate) {
			const planning = forPlanning || this.#defaultPlanning;
			return this.onClickUpdate(planning);
		}
		return undefined;
	}

	onClickedStatementType() {
		this.navbar.onClickedStatementType();
	}

	onChangedStatementType(newType) {
		/** @type {HTMLElement} */
		const planningStatementType = document.getElementById('planning-statement-type');
		/** @type {Statement} */
		const statement = planningStatementType.parentNode.userData;
		planningStatementType.firstChild.nodeValue = newType;
		statement.type = newType;
	}

	onKeyUpStatementName(event) {
		const statementName = event.currentTarget.textContent;
		const statement = event.currentTarget.parentNode.userData;
		statement.name = statementName;
	}
	// #endregion

	// #region category event handlers
	onClickedAddCategory() {
		const id = new Date().getTime(); // millisecond precision
		const category = new Category(id, 'New Category');
		/** @type{Statement} */
		const statement = this.#defaultPlanning.statements[this.gfx.selectedIndex()];
		statement.categories.push(category);
		// TODO update only the current statement, not all of them
		this.refresh(this.#defaultPlanning);
	}

	onClickedDeleteCategory(event) {
		const table = event.currentTarget.parentNode.parentNode.parentNode.parentNode;
		const category = table.userData;
		const statement = table.parentNode.userData;

		statement.categories.splice(statement.categories.indexOf(category), 1);
		table.parentNode.removeChild(table);
	}

	// eslint-disable-next-line class-methods-use-this
	onKeyUpCategoryName(event) {
		const categoryName = event.currentTarget.textContent;
		const table = event.currentTarget.parentNode.parentNode.parentNode;
		const category = table.userData;

		category.name = categoryName;
	}
	// #endregion

	// #region goal event handlers
	onClickedAddGoal(event) {
		const btn = event.currentTarget;
		const category = btn.parentNode.parentNode.parentNode.userData;
		const goal = new Goal('New Goal', 0, 0, 0);

		category.goals.push(goal);
		const goalDom = this.buildGoal(goal);
		this.#categoryDoms.get(category.id).append(goalDom);
		// Total does not have to be recomputed because we add amounts of 0
	}

	onKeyUpGoal(event) {
		const cell = event.currentTarget;
		const row = cell.parentNode;
		const table = row.parentNode.parentNode;

		const { cellIndex } = event.currentTarget;
		/** @type {Goal} */
		const goal = row.userData;

		switch (cellIndex) {
		case 0:
			goal.name = cell.textContent;
			break;
		case 1:
			goal.daily = +cell.textContent;
			goal.monthly = goal.daily * 30;
			goal.yearly = goal.daily * 365;
			cell.parentNode.cells[2].textContent = goal.monthly;
			cell.parentNode.cells[3].textContent = goal.yearly;
			break;
		case 2:
			goal.monthly = +cell.textContent;
			goal.daily = Math.ceil(goal.monthly / 30);
			goal.yearly = goal.monthly * 12;
			cell.parentNode.cells[1].textContent = goal.daily;
			cell.parentNode.cells[3].textContent = goal.yearly;
			break;
		case 3:
			goal.yearly = +cell.textContent;
			goal.daily = Math.ceil(goal.yearly / 365);
			goal.monthly = Math.ceil(goal.yearly / 12);
			cell.parentNode.cells[1].textContent = goal.daily;
			cell.parentNode.cells[2].textContent = goal.monthly;
			break;
		default:
			break;
		}

		this.recomputeCategoryTotal(table.userData);
	}

	onClickedDeleteGoal(event) {
		const row = event.currentTarget.parentNode.parentNode;
		const tBody = row.parentNode;
		const goal = row.userData;
		const category = row.parentNode.parentNode.userData;

		category.goals.splice(category.goals.indexOf(goal), 1);

		tBody.removeChild(row);
		this.recomputeCategoryTotal(category);
	}
	// #endregion
	// #endregion
}
