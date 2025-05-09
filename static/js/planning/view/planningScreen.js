/* eslint-disable class-methods-use-this */
import Dom from '../../common/gui/dom.js';
import Planning, { Statement, Category, Goal } from '../model/planningModel.js';
import icons from '../../common/gui/icons.js';
import PlanningNavbar from './planningNavbar.js';
import Modal from '../../common/gui/modal.js';

export default class PlanningScreen {
	#onClickSavePlanning = undefined;

	#onClickedSaveStatement = undefined;

	#onClickedDeletePlanning = undefined;

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

		this.navbar.onClickSavePlanning(this.onClickedSavePlanning.bind(this));
		this.navbar.onClickEdit(this.onClickedEdit.bind(this));
		this.navbar.onChangeStatementType(this.onClickedChangeStatementType.bind(this));
		this.navbar.onClickSaveStatement(this.onClickedSaveStatement.bind(this));
		this.navbar.onClickDeletePlanning(this.onClickedDeletePlanning.bind(this));
		this.navbar.onClickDeleteStatement(this.onClickedDeleteStatement.bind(this));

		const mainElement = document.getElementById('main');
		mainElement.replaceChildren();
		mainElement.appendChild(this.navbar.toHtml());
		this.navbar.selectYear(this.#defaultPlanning.year);
		this.containerHtml = this.buildContainerDom(this.#defaultPlanning).toHtml();
		mainElement.appendChild(this.containerHtml);
		this.navbar.init();
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
	 * @param {Planning} planning
	 * @returns {Dom}
	 */
	buildContainerDom(planning) {
		const container = new Dom('div').id(planning.year).cls('container');
		const section =	new Dom('div').cls('section');
		if (planning.statements.length === 0) {
			section.append(
				new Dom('h1').cls('slice').text('No statements available'),
			);
		} else {
			planning.statements
				.map(this.#buildStatementDom.bind(this))
				.reduce((dom, statement) => dom.append(statement), section);
		}
		this.navbar.refresh(planning);

		container.append(section);
		return container;
	}

	/**
	 * Creates a DOM statement
	 * @param {Statement} statement Statement representing this slice
	 * @returns {Dom | undefined} Constructed and decorated DOM element
	 */
	#buildStatementDom(statement) {
		if (!statement) return undefined;

		const onKeyUp = this.onKeyUpStatementName.bind(this);
		const onClickStatementType = this.onClickedStatementType.bind(this);
		const onClickAddCategory = this.onClickedAddCategory.bind(this, statement);
		const slice = new Dom('div').id(`statement-${statement.id}`).cls('slice').userData(statement).append(
			new Dom('h1').text(statement.name).editable().onKeyUp(onKeyUp).attr('contenteditable', this.#editMode),
			new Dom('h2').text(`${statement.type} `).onClick(onClickStatementType).hideable(this.#editMode)
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
		const onClickedDeleteCategory = this.onClickedDeleteCategory.bind(this);

		for (let i = 0; i < planningCategories.length; i += 1) {
			const category = planningCategories[i];
			const categoryDom = new Dom('table').id(`${category.id}`).append(
				new Dom('thead').append(
					new Dom('tr').append(
						new Dom('th').text(category.name).editable().contentEditable(this.#editMode)
							.onKeyUp(onKeyUpCategoryName),
						new Dom('th').cls('large-screen-only', 'normal-col').text('Daily'),
						new Dom('th').cls('normal-col').text('Monthly'),
						new Dom('th').cls('normal-col').text('Yearly'),
						new Dom('th').cls('narrow-col').hideable(this.#editMode).onClick(onClickedDeleteCategory).append(
							Dom.imageButton('Delete row', icons.delete),
						),
					),
				),
				new Dom('tbody').append(
					...category.goals.map((goal) => this.buildGoal(goal)),
				),
				new Dom('tfoot').append(
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
			new Dom('td').cls('large-screen-only').text(goal.daily).editable().contentEditable(this.#editMode).onKeyUp(onKeyUpGoal),
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
		this.#defaultPlanning = planning;

		const container = this.buildContainerDom(planning).toHtml();
		this.containerHtml.parentElement.replaceChild(container, this.containerHtml);
		this.containerHtml = container;
	}

	/**
	 * @param {Statement} statement
	 */
	refreshStatement(statement) {
		const statementHtml = document.getElementById(`statement-${statement.id}`);
		const statementDom = this.#buildStatementDom(statement);
		const { scrollTop } = statementHtml;
		statementHtml.parentElement.replaceChild(statementDom.toHtml(), statementHtml);
		statementDom.toHtml().scrollTop = scrollTop;
	}

	/**
	 * @param {Category} category
	 */
	refreshCategory(category) {
		const categoryHtml = document.getElementById(`${category.id}`);
		const categoryDom = this.#buildStatementDom(category);
		const { scrollTop } = categoryHtml;
		categoryHtml.parentElement.replaceChild(categoryDom.toHtml(), categoryHtml);
		categoryDom.toHtml().scrollTop = scrollTop;
	}

	/**
	 * @param {Category} forCategory
	 */
	buildTotalRow(forCategory) {
		return new Dom('tr').append(
			new Dom('td').text('Total'),
			new Dom('td').cls('large-screen-only').text(forCategory.totalDaily()),
			new Dom('td').text(forCategory.totalMonthly()),
			new Dom('td').text(forCategory.totalYearly()),
			new Dom('td').hideable(this.#editMode).onClick(this.onClickedAddGoal.bind(this)).append(
				Dom.imageButton('Add row', icons.add_row),
			),
		);
	}

	/**
	 * Computes the column wise total value of the category table and replaces the last row.
	 * @param {Category} category category for which to compute total row
	 */
	recomputeCategoryTotal(category) {
		if (!category || !this.#categoryDoms.has(category.id)) throw Error(`Invalid category ${category}`);

		const categoryDom = this.#categoryDoms.get(category.id);
		/** @type {HTMLTableSectionElement} */
		const { tFoot } = categoryDom.toHtml();
		tFoot.children[0].remove();
		tFoot.appendChild(this.buildTotalRow(category).toHtml());
	}
	// #endregion

	// #region event handlers
	// #region planning event handlers
	onClickDeletePlanning(handler) {
		this.#onClickedDeletePlanning = handler;
	}

	onClickedDeletePlanning(planning) {
		if (this.#onClickedDeletePlanning) {
			const areYouSureModal = Modal.areYouSureModal(
				'are-you-sure-delete-planning',
				'Are you sure you want to delete planning?',
				this.#onClickedDeletePlanning.bind(this, planning),
			).open();
			const main = document.getElementById('main');
			main.appendChild(areYouSureModal.toHtml());
			return areYouSureModal;
		}
		return undefined;
	}

	onClickSavePlanning(handler) {
		this.#onClickSavePlanning = handler;
	}
	// #endregion

	// #region statement event handlers
	selectStatement(statementName) {
		this.navbar.selectStatement(statementName);
	}

	onChangedStatement(statement) {
		this.navbar.onChangedStatement(statement);
	}

	onClickSaveStatement(handler) {
		this.#onClickedSaveStatement = handler;
	}

	onClickedDeleteStatement(index) {
		this.#defaultPlanning.statements.splice(index, 1);
		this.refresh(this.#defaultPlanning);
	}

	onClickedSaveStatement(statement) {
		if (this.#onClickedSaveStatement) {
			return this.#onClickedSaveStatement(statement);
		}
		return undefined;
	}

	onClickedChangeStatementType(statement) {
		this.refreshStatement(statement);
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
	onClickedSavePlanning(forPlanning) {
		const editableElmts = document.querySelectorAll('[editable="true"]');
		for (let i = 0; i < editableElmts.length; i += 1) {
			editableElmts[i].contentEditable = 'false';
		}

		const hideableElmts = document.querySelectorAll('[hideable="true"]');
		for (let i = 0; i < hideableElmts.length; i += 1) {
			hideableElmts[i].style.display = 'none';
		}

		this.#editMode = false;

		if (this.#onClickSavePlanning) {
			const planning = forPlanning || this.#defaultPlanning;
			return this.#onClickSavePlanning(planning);
		}
		return undefined;
	}

	onClickedStatementType() {
		this.navbar.onClickedStatementType();
	}

	onKeyUpStatementName(event) {
		const statementName = event.currentTarget.textContent;
		const statement = event.currentTarget.parentNode.userData;
		statement.name = statementName;
	}
	// #endregion

	// #region category event handlers
	onClickedAddCategory(statement) {
		const id = new Date().getTime(); // millisecond precision
		const category = new Category(id, 'New Category');
		statement.categories.push(category);
		this.refreshStatement(statement);
	}

	onClickedDeleteCategory(event) {
		const table = event.currentTarget.parentNode.parentNode.parentNode;
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
		const categoryTbody = this.#categoryDoms.get(category.id).toHtml().tBodies[0];
		const lastIndex = categoryTbody.children.length - 1;
		categoryTbody.insertBefore(goalDom.toHtml(), categoryTbody.children[lastIndex]);
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
			throw Error(`Did not expect cell index ${cellIndex} on key up goal`);
		}

		this.recomputeCategoryTotal(table.userData);
	}

	onClickedDeleteGoal(event) {
		const row = event.currentTarget.parentNode;
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
