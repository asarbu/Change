/* eslint-disable class-methods-use-this */
import GraphicEffects from '../../gui/effects.js';
import Sidenav from '../../gui/sidenav.js';
import Dom, { create, createImageButton } from '../../gui/dom.js';
import Planning, { Statement, Category, Goal } from '../model/planningModel.js';
import icons from '../../gui/icons.js';
import PlanningNavbar from './planningNavbar.js';
import PlanningNavbarEventHandlers from './planningNavbarEventHandlers.js';

export default class PlanningScreen {
	onClickUpdate = undefined;

	onStatementAdded = undefined;

	/** @type {Sidenav} */
	#sidenav = undefined;

	/** @type {Array<Planning>>} */
	#plannings = [];

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
		if (!planning) throw Error('No planning provided to draw on the screen');
		this.#plannings.push(planning);
		this.#defaultPlanning = planning;
	}

	/**
	 * Initialize the current screen
	 */
	init() {
		let defaultStatementName = '';
		if (this.#plannings[0].statements.length > 0) {
			defaultStatementName = this.#plannings[0].statements[0].name;
		}

		const handlers = new PlanningNavbarEventHandlers();
		handlers.onClickSave = this.onClickSave.bind(this);
		handlers.onClickEdit = this.onClickEdit.bind(this);
		handlers.onStatementTypeChanged = this.onStatementTypeChanged.bind(this);
		handlers.onClickAddStatement = this.onClickAddStatement.bind(this);
		handlers.onStatementChanged = this.onClickShowStatement.bind(this);

		this.navbar = new PlanningNavbar(
			this.#defaultPlanning.year,
			this.#defaultPlanning.month,
			defaultStatementName,
			handlers,
		);

		const mainElement = document.getElementById('main');
		mainElement.appendChild(this.navbar.toHtml());
		this.navbar.selectYear(this.#defaultPlanning.year);
		this.container = this.buildContainer();
		mainElement.appendChild(this.container);
		this.gfx = new GraphicEffects();
		this.gfx.init(this.container);
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
	 * @returns {DocumentFragment}
	 */
	buildContainer() {
		const container = create('div', { id: this.#defaultPlanning.year, classes: ['container'] });
		const section = create('div', { classes: ['section'] });
		const { statements } = this.#defaultPlanning;

		// TODO Merge this with navbar creation, since we are iterating through same array.
		for (let i = 0; i < statements.length; i += 1) {
			const statement = statements[i];
			const htmlStatement = this.buildStatement(statement).toHtml();
			htmlStatement.userData = statement;

			section.appendChild(htmlStatement);
		}

		container.appendChild(section);

		return container;
	}

	/**
	 * Creates a DOM statement
	 * @param {Statement} statement Statement representing this slice
	 * @returns {HTMLDivElement} Constructed and decorated DOM element
	 */
	buildStatement(statement) {
		const onKeyUp = this.onKeyUpStatementName.bind(this);
		const onClickStatementType = this.onClickStatementType.bind(this);
		const onClickAddCategory = this.onClickAddCategory.bind(this);
		const slice = new Dom('div').cls('slice').append(
			new Dom('h1').text(statement.name).editable().onKeyUp(onKeyUp).attr('contenteditable', this.#editMode),
			new Dom('h2').id('planning-statement-type').text(`${statement.type} `).onClick(onClickStatementType).hideable(this.#editMode)
				.append(
					new Dom('span').cls('white-50').text('▼'),
				),
			...this.buildCategories(statement.categories),
			Dom.imageButton('Add Category', icons.add_table).hideable(this.#editMode).onClick(onClickAddCategory),
		);

		this.navbar.appendStatement(statement.name);
		return slice;
	}

	/**
	 * Creates a Document Fragment containing all of the tables constructed from the categories.
	 * @param {Array<Category>} planningCategories Categories to draw inside parent statement
	 * @returns {DocumentFragment} Document fragment with all of the created tables
	 */
	buildCategories(planningCategories) {
		const categories = [];
		const onKeyUpCategoryName = this.onKeyUpCategoryName.bind(this);
		const onClickDeleteGoal = this.onClickDeleteGoal.bind(this);
		const onKeyUpGoal = this.onKeyUpGoal.bind(this);

		for (let i = 0; i < planningCategories.length; i += 1) {
			const planningCategory = planningCategories[i];
			const category = new Dom('table').id(planningCategory.id).cls('top-round', 'bot-round').append(
				new Dom('thead').append(
					new Dom('tr').append(
						new Dom('th').text(planningCategory.name).editable().contentEditable(this.#editMode)
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
					...planningCategory.goals.map((goal) => new Dom('tr').id(goal.id).userData(goal).append(
						new Dom('td').text(goal.name).editable().contentEditable(this.#editMode).onKeyUp(onKeyUpGoal),
						new Dom('td').text(goal.daily).editable().contentEditable(this.#editMode).onKeyUp(onKeyUpGoal),
						new Dom('td').text(goal.monthly).editable().contentEditable(this.#editMode).onKeyUp(onKeyUpGoal),
						new Dom('td').text(goal.yearly).editable().contentEditable(this.#editMode).onKeyUp(onKeyUpGoal),
						new Dom('td').hideable(this.#editMode).onClick(onClickDeleteGoal).append(
							Dom.imageButton('Delete goal', icons.delete),
						),
					)),
					this.buildTotalRow(planningCategory),
				),
			).userData(planningCategory);
			categories.push(category);
		}

		return categories;
	}

	/**
	 * Creates a new row in the table, fills the data and decorates it.
	 * @param {HTMLTableElement} table Table where to append row
	 * @param {Goal} item Goal data to fill in the row
	 * @param {Object} options Format options for the row
	 * @param {Number} options.index Position to add the row to. Defaults to -1 (last)
	 * @param {Boolean} options.hideLastCell Hide last cell of the row
	 * @param {Boolean} options.readonly Make the row uneditable
	 * @param {HTMLButtonElement} options.lastCellContent Optional element to add to last cell
	 * @returns {HTMLTableRowElement} Row that was created and decorated. Contains Goal in userData
	 */
	buildRow(table, item, options) {
		let index = -1;
		if (Object.prototype.hasOwnProperty.call(options, 'index')) {
			index = options.index;
		}
		const row = table.tBodies[0].insertRow(index);
		row.id = item.id;
		row.userData = item;

		this.buildDataCell(row, item.name, options);
		this.buildDataCell(row, item.daily, options);
		this.buildDataCell(row, item.monthly, options);
		this.buildDataCell(row, item.yearly, options);

		const buttonsCell = row.insertCell(-1);

		if (options?.lastCellContent) {
			buttonsCell.appendChild(options.lastCellContent);
		}

		buttonsCell.setAttribute('hideable', 'true');
		if (options?.hideLastCell && !this.#editMode) {
			buttonsCell.style.display = 'none';
		}
		return row;
	}

	/**
	 * Creates and decorates a new data cell to be appended in a table row
	 * @param {HTMLTableRowElement} row Row to populate with data cells
	 * @param {string} text Text to display
	 * @param {Object} options Miscelatious options for this data cell
	 * @param {boolean} options.readonly Makes the cell uneditable
	 * @param {boolean} options.color Paints the text a certain color (#000000)
	 * @returns {HTMLTableCellElement}
	 */
	buildDataCell(row, text, options) {
		// console.log("Create data cell", text, options.readonly)
		const dataCell = row.insertCell(-1);
		dataCell.textContent = text;
		if (!options?.readonly) {
			dataCell.setAttribute('editable', 'true');
			if (this.#editMode) {
				dataCell.setAttribute('contenteditable', 'true');
			}
			dataCell.addEventListener('keyup', this.onKeyUpGoal.bind(this), false);
		}

		if (options?.color) {
			dataCell.style.color = options.color;
		}
		return dataCell;
	}

	// #endregion

	// #region DOM manipulation
	/** Refresh screen */
	refresh(statements) {
		this.statements = statements;
		const newContainer = this.buildContainer();
		const mainElement = document.getElementById('main');
		mainElement.replaceChild(newContainer, this.container);
		this.container = newContainer;
	}

	/**
	 * @param {Category} forCategory
	 */
	buildTotalRow(forCategory) {
		const categorytDaily = forCategory.goals.reduce((acc, curr) => acc + curr.daily, 0);
		const categoryMonthly = forCategory.goals.reduce((acc, curr) => acc + curr.monthly, 0);
		const categoryYearly = forCategory.goals.reduce((acc, curr) => acc + curr.yearly, 0);

		return new Dom('tr').append(
			new Dom('td').text('Total'),
			new Dom('td').text(categorytDaily),
			new Dom('td').text(categoryMonthly),
			new Dom('td').text(categoryYearly),
			new Dom('td').hideable(this.#editMode).onClick(this.onClickAddGoal.bind(this)).append(
				Dom.imageButton('Add row', icons.add_row),
			),
		);
	}

	// Recompute from DOM instead of memory/db/network to have real time updates in UI
	/**
	 * Computes the column wise total value of the table and inserts it into the last row.
	 * @param {HTMLTableElement} table Table for which to compute total row
	 * @param {boolean} forceCreate Force the creation of total row, if not present
	 */
	recomputeTotal(table, forceCreate = false) {
		// TODO Use planning statements to recompute, instead of parsing.
		// TODO remove force create and use the table id to identify if creation is needed.
		let lastRow;
		const total = {
			id: `${table.id}Total`,
			name: 'Total',
			daily: 0,
			monthly: 0,
			yearly: 0,
		};
		if (forceCreate) {
			const addGoalButton = createImageButton('Delete goal', ['nav-item'], icons.add_row, undefined, this.onClickAddGoal.bind(this));
			const options = {
				readonly: true,
				hideLastCell: true,
				lastCellContent: addGoalButton,
			};
			lastRow = this.buildRow(table, total, options);
		} else {
			lastRow = table.tBodies[0].rows[table.tBodies[0].rows.length - 1];
		}

		let totalDaily = 0;
		let totalMonthly = 0;
		let totalYearly = 0;

		for (let rowIndex = 0; rowIndex < table.tBodies[0].rows.length - 1; rowIndex += 1) {
			const row = table.tBodies[0].rows[rowIndex];
			totalDaily += parseInt(row.cells[1].textContent, 10);
			totalMonthly += parseInt(row.cells[2].textContent, 10);
			totalYearly += parseInt(row.cells[3].textContent, 10);
		}

		lastRow.cells[1].textContent = totalDaily;
		lastRow.cells[2].textContent = totalMonthly;
		lastRow.cells[3].textContent = totalYearly;
	}
	// #endregion

	// #region event handlers
	// #region statement event handlers
	onClickDeleteStatement() {
		this.statements.splice(this.gfx.selectedIndex(), 1);
		this.refresh(this.statements);
	}

	onClickAddStatement(statement) {
		if (this.onStatementAdded) {
			this.onStatementAdded(statement);
		}
		this.refresh(this.statements);
	}

	onClickShowStatement(statementName) {
		const { statements } = this.#defaultPlanning;
		const index = statements.findIndex((statement) => statement.name === statementName);
		if (index >= 0) this.gfx.slideTo(index);
	}

	onClickChangeStatementType(e) {
		const newStatementType = e.currentTarget.textContent;
		const statement = this.statements[this.gfx.selectedIndex()];
		statement.type = newStatementType;
		this.refresh(this.statements);
	}

	onClickEdit() {
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
	onClickSave(forPlanning) {
		const editableElmts = document.querySelectorAll('[editable="true"]');
		for (let i = 0; i < editableElmts.length; i += 1) {
			editableElmts[i].contentEditable = 'false';
		}

		const hideableElmts = document.querySelectorAll('[hideable="true"]');
		for (let i = 0; i < hideableElmts.length; i += 1) {
			hideableElmts[i].style.display = 'none';
		}

		if (this.onClickUpdate) {
			const planning = forPlanning || this.#defaultPlanning;
			this.onClickUpdate(planning);
		}

		this.#editMode = false;
	}

	onClickStatementType() {
		this.navbar.onClickStatementType();
	}

	onStatementTypeChanged(newType) {
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
	onClickAddCategory() {
		const id = new Date().getTime(); // millisecond precision
		const category = new Category(id, 'New Category');
		/** @type{Statement} */
		const statement = this.statements[this.gfx.selectedIndex()];
		statement.categories.push(category);
		// TODO update only the current statement, not all of them
		this.refresh(this.statements);
	}

	onClickDeleteCategory(event) {
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
		const statement = table.userData;

		statement.name = categoryName;
	}
	// #endregion

	// #region goal event handlers
	onClickAddGoal(event) {
		const btn = event.currentTarget;
		const id = new Date().getTime(); // millisecond precision
		const goal = {
			id: id,
			name: 'New Goal',
			daily: 0,
			monthly: 0,
			yearly: 0,
		};

		const table = btn.parentNode.parentNode.parentNode;
		const tbody = table.tBodies[0];
		// Subtract one for the bottom "Total" row.
		const index = tbody.rows.length - 1;

		const button = createImageButton('Delete', [], icons.delete, undefined, this.onClickDeleteGoal.bind(this));
		const options = {
			index: index,
			lastCellContent: button,
		};
		this.buildRow(table, goal, options);

		table.userData.goals.push(goal);
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
			goal.daily = parseInt(cell.textContent, 10);
			goal.monthly = goal.daily * 30;
			goal.yearly = goal.daily * 365;
			cell.parentNode.cells[2].textContent = goal.monthly;
			cell.parentNode.cells[3].textContent = goal.yearly;
			break;
		case 2:
			goal.monthly = parseInt(cell.textContent, 10);
			goal.daily = Math.ceil(goal.monthly / 30);
			goal.yearly = goal.monthly * 12;
			cell.parentNode.cells[1].textContent = goal.daily;
			cell.parentNode.cells[3].textContent = goal.yearly;
			break;
		case 3:
			goal.yearly = parseInt(cell.textContent, 10);
			goal.daily = Math.ceil(goal.yearly / 365);
			goal.monthly = Math.ceil(goal.yearly / 12);
			cell.parentNode.cells[1].textContent = goal.daily;
			cell.parentNode.cells[2].textContent = goal.monthly;
			break;
		default:
			break;
		}

		this.recomputeTotal(table);
	}

	onClickDeleteGoal(event) {
		const row = event.currentTarget.parentNode.parentNode;
		const tBody = row.parentNode;
		const goal = row.userData;
		const category = row.parentNode.parentNode.userData;

		category.goals.splice(category.goals.indexOf(goal), 1);

		tBody.removeChild(row);
		this.recomputeTotal(tBody.parentNode);
	}
	// #endregion
	// #endregion
}
