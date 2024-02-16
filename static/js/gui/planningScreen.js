/* eslint-disable class-methods-use-this */
import GraphicEffects from './effects.js';
import { create, createChild, createImageButton } from './dom.js';
import { Statement, Category, Goal } from '../persistence/planning/planningModel.js';
import icons from './icons.js';

export default class PlanningScreen {
	onClickUpdate = undefined;

	/**
	 * Constructor
	 * @param {string} id Unique identifier of the screen
	 * @param {Array<Statement>} statements Statements to draw on the screen
	 */
	constructor(id, statements) {
		/** @type { Array<Statement> } */
		this.statements = statements;
		/** @type {string} */
		this.id = id;
		/** @type {boolean} */
		this.editMode = false;
	}

	/**
	 * Initialize the current screen
	 */
	init() {
		this.gfx = new GraphicEffects();
		this.container = this.sketchAsFragment();
		this.navbar = this.sketchNavBar();
	}

	// #region DOM creation

	/**
	 * Creates all necessary objects needed to draw current screen
	 * @returns {DocumentFragment}
	 */
	sketchAsFragment() {
		const container = create('div', { id: this.id, classes: ['container'] });
		const section = create('div', { classes: ['section'] });

		// TODO Merge this with navbar creation, since we are iterating through same array.
		for (let i = 0; i < this.statements.length; i += 1) {
			const statement = this.statements[i];
			const htmlStatement = this.sketchStatement(statement);
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
	sketchStatement(statement) {
		const slice = create('div', { classes: ['slice'] });
		const h1 = create('h1', { textContent: statement.name });
		h1.setAttribute('editable', 'true');
		h1.addEventListener('keyup', this.onKeyUpStatementName.bind(this), false);
		if (this.editMode) {
			h1.setAttribute('contenteditable', 'true');
		}
		const span = create('span', { textContent: '▼', classes: ['white-50'] });

		const statementTypeDropdown = create('div', { classes: ['dropdown-content', 'top-round', 'bot-round'] });
		statementTypeDropdown.style.display = 'none';
		const h2 = create('h2', { classes: [], textContent: `${this.statements[0].type} ` });
		h2.addEventListener('click', this.onClickDropup.bind(this, statementTypeDropdown));
		h2.setAttribute('hideable', 'true');
		if (!this.editMode) h2.style.display = 'none';
		const expenseAnchor = create('div', { textContent: Statement.EXPENSE });
		expenseAnchor.addEventListener('click', this.onClickChangeStatementType.bind(this));
		statementTypeDropdown.appendChild(expenseAnchor);

		const incomeAnchor = create('div', { textContent: Statement.INCOME });
		incomeAnchor.addEventListener('click', this.onClickChangeStatementType.bind(this));
		statementTypeDropdown.appendChild(incomeAnchor);

		const savingAnchor = create('div', { textContent: Statement.SAVING });
		savingAnchor.addEventListener('click', this.onClickChangeStatementType.bind(this));
		statementTypeDropdown.appendChild(savingAnchor);

		h2.appendChild(span);
		h2.appendChild(statementTypeDropdown);

		const addCategoryButton = createImageButton('Add Category', [], icons.add_table, undefined, this.onClickAddCategory.bind(this));
		addCategoryButton.setAttribute('hideable', 'true');
		if (!this.editMode) addCategoryButton.style.display = 'none';
		slice.appendChild(h1);
		slice.appendChild(h2);

		const tables = this.sketchCategory(statement.categories);
		slice.appendChild(tables);
		slice.appendChild(addCategoryButton);

		return slice;
	}

	/**
	 * Creates a Document Fragment containing all of the tables constructed from the categories.
	 * @param {Array<Category>} planningCategories Categories to draw inside parent statement
	 * @returns {DocumentFragment} Document fragment with all of the created tables
	 */
	sketchCategory(planningCategories) {
		const tableFragment = document.createDocumentFragment();
		for (let i = 0; i < planningCategories.length; i += 1) {
			const planningCategory = planningCategories[i];
			const table = create('table', { id: planningCategory.id, classes: ['top-round', 'bot-round'] });
			tableFragment.appendChild(table);
			const thead = createChild('thead', table);
			createChild('tbody', table);

			table.userData = planningCategory;

			const headingRow = createChild('tr', thead);
			const nameCol = create('th', { textContent: planningCategory.name }, headingRow);
			nameCol.setAttribute('editable', 'true');
			if (this.editMode) {
				nameCol.setAttribute('contenteditable', 'true');
			}
			nameCol.addEventListener('keyup', this.onKeyUpCategoryName.bind(this), false);

			// TODO replace this with Add row
			create('th', { textContent: 'Daily' }, headingRow);
			create('th', { textContent: 'Monthly' }, headingRow);
			create('th', { textContent: 'Yearly' }, headingRow);
			const buttons = createChild('th', headingRow);
			createImageButton('Delete Row', [], icons.delete, buttons, this.onClickDeleteCategory.bind(this));

			buttons.setAttribute('hideable', 'true');
			if (!this.editMode) buttons.style.display = 'none';

			for (let j = 0; j < planningCategory.goals.length; j += 1) {
				const planningGoal = planningCategory.goals[j];

				const deleteButton = createImageButton('Delete goal', [], icons.delete, undefined, this.onClickDeleteGoal.bind(this));
				this.sketchRow(
					table,
					planningGoal,
					{
						index: -1,
						hideLastCell: true,
						lastCellContent: deleteButton,
					},
				);
			}
			this.recomputeTotal(table, true);
		}

		return tableFragment;
	}

	/**
	 * Creates a new row in the table, fills the data and decorates it.
	 * @param {DOMElement} table Table where to append row
	 * @param {Goal} item Goal data to fill in the row
	 * @param {Object} options Format options for the row
	 * @param {Number} options.index Position to add the row to. Defaults to -1 (last)
	 * @param {Boolean} options.hideLastCell Hide last cell of the row
	 * @param {Boolean} options.readonly Make the row uneditable
	 * @param {HTMLButtonElement} options.lastCellContent Optional element to add to last cell
	 * @returns {HTMLTableRowElement} Row that was created and decorated. Contains Goal in userData
	 */
	sketchRow(table, item, options) {
		let index = -1;
		if (Object.prototype.hasOwnProperty.call(options, 'index')) {
			index = options.index;
		}
		const row = table.tBodies[0].insertRow(index);
		row.id = item.id;
		row.userData = item;

		this.sketchDataCell(row, item.name, options);
		this.sketchDataCell(row, item.daily, options);
		this.sketchDataCell(row, item.monthly, options);
		this.sketchDataCell(row, item.yearly, options);

		const buttonsCell = row.insertCell(-1);

		if (options?.lastCellContent) {
			buttonsCell.appendChild(options.lastCellContent);
		}

		buttonsCell.setAttribute('hideable', 'true');
		if (options?.hideLastCell && !this.editMode) {
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
	sketchDataCell(row, text, options) {
		// console.log("Create data cell", text, options.readonly)
		const dataCell = row.insertCell(-1);
		dataCell.textContent = text;
		if (!options?.readonly) {
			dataCell.setAttribute('editable', 'true');
			if (this.editMode) {
				dataCell.setAttribute('contenteditable', 'true');
			}
			dataCell.addEventListener('keyup', this.onKeyUpGoal.bind(this), false);
		}

		if (options?.color) {
			dataCell.style.color = options.color;
		}
		return dataCell;
	}

	/**
	 * Activate the current screen and all its effects.
	 */
	activate() {
		const mainElement = document.getElementById('main');
		mainElement.appendChild(this.container);
		mainElement.appendChild(this.navbar);
		this.gfx.init(this.container);
	}

	/**
	 * Creates and populates the navbar with relevant information for this screen
	 * @returns {HTMLNavElement}
	 */
	sketchNavBar() {
		const navbar = create('nav');
		const navHeader = create('div', { classes: ['nav-header'] }, navbar);
		const addStatementButton = createImageButton('Add', ['nav-item'], icons.add_file, navHeader, this.onClickAddStatement.bind(this));
		this.editButton = createImageButton('Edit', ['nav-item'], icons.edit, navHeader, this.onClickEdit.bind(this));
		this.saveButton = createImageButton('Save', ['nav-item'], icons.save, undefined, this.onClickSave.bind(this));
		const deleteStatement = createImageButton('Add', ['nav-item'], icons.delete_file, navHeader, this.onClickDeleteStatement.bind(this));
		addStatementButton.style.display = 'none';
		addStatementButton.setAttribute('hideable', true);
		deleteStatement.style.display = 'none';
		deleteStatement.setAttribute('hideable', true);

		const navFooter = create('div', { classes: ['nav-footer'] }, navbar);
		const leftMenuButton = createImageButton('Menu', ['nav-item', 'nav-trigger'], icons.menu, navFooter);
		leftMenuButton.setAttribute('data-side', 'left');
		const yearDropup = create('button', { textContent: `${this.id} `, classes: ['dropup', 'nav-item'] }, navFooter);

		const span = create('span', { textContent: '▲', classes: ['white-50'] });
		const statementDropupButton = create('button', { classes: ['nav-item'], textContent: `${this.statements[0].name} ` }, navFooter);

		const statementDropupContent = create('div', { classes: ['dropup-content', 'top-round'] });
		statementDropupContent.style.display = 'none';
		statementDropupButton.addEventListener('click', this.onClickDropup.bind(this, statementDropupContent));

		for (let i = 0; i < this.statements.length; i += 1) {
			const statement = this.statements[i];
			const anchor = create('div', { textContent: statement.name });
			anchor.setAttribute('data-slice-index', i);
			anchor.addEventListener('click', this.onClickShowStatement.bind(this, statementDropupButton));
			statementDropupContent.appendChild(anchor);
		}

		statementDropupButton.appendChild(span);
		navbar.appendChild(statementDropupContent);
		const rightMenuButton = createImageButton('Menu', ['nav-item', 'nav-trigger'], icons.menu, navFooter);
		rightMenuButton.setAttribute('data-side', 'right');
		return navbar;
	}
	// #endregion

	// #region DOM manipulation
	/** Refresh screen */
	refresh(statements) {
		this.statements = statements;
		const newContainer = this.sketchAsFragment();
		const mainElement = document.getElementById('main');
		mainElement.replaceChild(newContainer, this.container);
		this.container = newContainer;
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
			lastRow = this.sketchRow(table, total, options);
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

	onClickAddStatement() {
		const id = new Date().getTime(); // millisecond precision
		const newStatement = new Statement(id, 'New statement', Statement.EXPENSE);
		this.statements.unshift(newStatement);
		this.refresh(this.statements);
	}

	onClickShowStatement(dropup, e) {
		this.gfx.onClickSetSlice(e);
		const sliceName = e.currentTarget.textContent;
		const dropupText = dropup.firstChild;
		dropupText.nodeValue = `${sliceName} `;
		dropup.click();
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

		this.editMode = true;
		this.editButton.parentNode.replaceChild(this.saveButton, this.editButton);
	}

	onClickSave() {
		const editableElmts = document.querySelectorAll('[editable="true"]');
		for (let i = 0; i < editableElmts.length; i += 1) {
			editableElmts[i].contentEditable = 'false';
		}

		const hideableElmts = document.querySelectorAll('[hideable="true"]');
		for (let i = 0; i < hideableElmts.length; i += 1) {
			hideableElmts[i].style.display = 'none';
		}

		if (this.onClickUpdate) {
			this.onClickUpdate(this.id, this.statements);
		}

		this.editMode = false;
		this.saveButton.parentNode.replaceChild(this.editButton, this.saveButton);
	}

	onClickDropup(dropup, event) {
		const button = event.currentTarget;
		button.classList.toggle('active');
		const dropupStyle = dropup.style;
		if (dropupStyle.display === 'none') {
			dropupStyle.display = 'block';
		} else {
			// No need to set arrow up because it'll be handled by setSliceButtonText
			dropupStyle.display = 'none';
		}
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

		const table = btn.parentNode.parentNode.parentNode.parentNode;
		const tbody = table.tBodies[0];
		// Subtract one for the bottom "Total" row.
		const index = tbody.rows.length - 1;

		const button = createImageButton('Add Row', [], icons.delete, undefined, this.onClickDeleteGoal.bind(this));
		const options = {
			index: index,
			lastCellContent: button,
		};
		this.sketchRow(table, goal, options);

		table.userData.goals.push(goal);
	}

	onKeyUpGoal(event) {
		const cell = event.currentTarget;
		const row = cell.parentNode;
		const table = row.parentNode.parentNode;

		const { cellIndex } = event.currentTarget;
		const goal = row.userData;

		switch (cellIndex) {
		case 0:
			goal.itemName = cell.textContent;
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
