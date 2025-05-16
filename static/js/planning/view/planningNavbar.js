/* eslint-disable prefer-destructuring */
import Dom from '../../common/gui/dom.js';
import icons from '../../common/gui/icons.js';
import Modal from '../../common/gui/modal.js';
import Sidenav from '../../common/gui/sidenav.js';
import Utils from '../../common/utils/utils.js';
import Planning, { Statement } from '../model/planningModel.js';
import GraphicEffects from '../../common/gui/effects.js';
import Alert from '../../common/gui/alert.js';
import SubmitStatementModal from './submitStatementModal.js';

export default class PlanningNavbar {
	/** @type {Dom} */
	#navbar = undefined;

	/** @type {Map<number, Dom} */
	#monthsInDropup = undefined;

	/** @type {Map<number, Dom} */
	#yearsInDropup = undefined;

	/** @type {Map<number, Dom} */
	#statementsInDropup = undefined;

	/** @type {Modal} */
	#yearsDropup = undefined;

	/** @type {Modal} */
	#monthsDropup = undefined;

	/** @type {Modal} */
	#statementsDropup = undefined;

	/** @type {SubmitStatementModal} */
	#submitStatementModal = undefined;

	/** @type {Planning} */
	#planning = undefined;

	/** @type {number} */
	#selectedMonth = undefined;

	/** @type {number} */
	#selectedYear = undefined;

	/** @type {Statement} */
	#selectedStatement = undefined;

	/** @type {Sidenav} */
	#sidenav = undefined;

	/** @type {(statement: Statement) => void} */
	#onInsertedStatementHandler = undefined;

	/** @type {(statement: Statement) => void} */
	#onEditedStatementHandler = undefined;

	/**
	 * Constructs an instance of Planning Navbar
	 * @param {Planning} planning default year to select in navbar
	 */
	constructor(planning) {
		this.#yearsInDropup = new Map();
		this.#monthsInDropup = new Map();
		this.#statementsInDropup = new Map();
		this.#sidenav = new Sidenav();

		this.#planning = planning;
		this.#selectedYear = planning.year;
		this.#selectedMonth = planning.month;

		if (planning.statements.length > 0) {
			this.#selectedStatement = planning.statements[0];
		} else {
			this.#selectedStatement = new Statement(new Date().getTime(), 'No planning statements', Statement.EXPENSE, []);
		}

		this.buildYearModal();
		this.buildMonthModal();
		this.buildStatementModal();
		this.buildSubmitStatementModal();

		const onClickedYearDropup = this.#onClickedYearDropup.bind(this);
		const onClickedMonthDropup = this.#onClickedMonthDropup.bind(this);
		const onClickedStatementDropup = this.#onClickedStatementDropup.bind(this);
		const onClickedOpenSidenav = this.#onClickedOpenSidenav.bind(this);

		this.#navbar = new Dom('nav').append(
			this.buildNavbarHeader(),
			new Dom('div').cls('nav-footer').append(
				new Dom('button').cls('nav-item', 'nav-trigger').onClick(onClickedOpenSidenav).append(
					new Dom('img').cls('white-fill').text('Menu').attr('alt', 'Menu').attr('src', icons.menu),
				),
				new Dom('button').cls('nav-item').onClick(onClickedYearDropup).append(
					new Dom('span').id('planning-year-text').text(`${this.#selectedYear} `),
					new Dom('span').id('planning-year-caret').cls('white-50').text(''),
				),
				new Dom('button').cls('nav-item').onClick(onClickedMonthDropup).append(
					new Dom('span').id('planning-month-text').text(`${Utils.nameForMonth(this.#selectedMonth)} `),
					new Dom('span').id('planning-month-caret').cls('white-50').text(''),
				),
				new Dom('button').cls('nav-item').onClick(onClickedStatementDropup).append(
					new Dom('span').id('planning-stmt-text').text(`${this.#selectedStatement.name} `),
					new Dom('span').id('planning-stmt-caret').cls('white-50').text(''),
				),
			),
			new Dom('div').cls('dropup-content', 'top-round').hide(),
		);
	}

	init() {
		this.gfx = new GraphicEffects();
		this.gfx.onSliceChange(this.onChangedStatementIndex.bind(this));
		this.refresh(this.#planning);
	}

	refresh(planning) {
		this.#planning = planning;
		if (this.gfx) {
			const container = document.getElementById(this.#planning.year);
			if (container) this.gfx.init(container);
		}
		if (planning.statements.length > 0) {
			this.#selectedStatement = planning.statements[0];
		} else {
			this.#selectedStatement = new Statement(new Date().getTime(), 'No planning statements', Statement.EXPENSE, []);
		}
		this.#refreshStatementDropup();
	}

	buildNavbarHeader() {
		const onClicedkEdit = this.onClickedEdit.bind(this);
		const onClickedSave = this.onClickedSavePlanning.bind(this);
		const onClickedAddStatement = this.#onClickedInsertStatement.bind(this);
		const onClickedEditStatement = this.onClickedEditStatement.bind(this);
		const onClickedDeleteStatement = this.#onClickedDeleteStatement.bind(this);
		const onClickedDeletePlanning = this.onClickedDeletePlanning.bind(this);

		return new Dom('div').cls('nav-header').append(
			// TODO replace ID with attributes and create DomImage class with alt and src setters
			new Dom('button').id('planning-del-planning').cls('nav-item').hide().onClick(onClickedDeletePlanning).append(
				new Dom('img').cls('white-fill').text('Delete Planning').attr('alt', 'Delete Planning').attr('src', icons.notebook_remove),
			),
			new Dom('button').id('planning-del-statement').cls('nav-item').hide().onClick(onClickedDeleteStatement).append(
				new Dom('img').cls('white-fill').text('Delete Statement').attr('alt', 'Delete Statement').attr('src', icons.delete_file),
			),
			new Dom('button').id('planning-navbar-edit').cls('nav-item').onClick(onClicedkEdit).append(
				new Dom('img').cls('white-fill').text('Edit').attr('alt', 'Edit').attr('src', icons.edit),
			),
			new Dom('button').id('planning-navbar-edit-statement').cls('nav-item').onClick(onClickedEditStatement).hide().append(
				new Dom('img').cls('white-fill').text('Edit Statement').attr('alt', 'Edit Statement').attr('src', icons.edit_file),
			),
			new Dom('button').id('planning-add-statement').cls('nav-item').onClick(onClickedAddStatement).append(
				new Dom('img').cls('white-fill').text('Add Statement').attr('alt', 'Add Statement').attr('src', icons.add_file),
			),
			new Dom('button').id('planning-navbar-save').cls('nav-item').onClick(onClickedSave).hide().append(
				new Dom('img').cls('white-fill').text('Save').attr('alt', 'Save').attr('src', icons.save),
			),
		);
	}

	toHtml() {
		return this.#navbar.toHtml();
	}

	// #region Delete Planning

	#onClickedDeletePlanning;

	onClickDeletePlanning(handler) {
		this.#onClickedDeletePlanning = handler;
	}

	onClickedDeletePlanning() {
		this.#onClickedDeletePlanning?.(this.#planning);
	}

	// #endregion

	// #region Delete Statement

	#onClickedDeleteStatementHandler;

	onClickDeleteStatement(handler) {
		this.#onClickedDeleteStatementHandler = handler;
	}

	#onClickedDeleteStatement() {
		if (this.#planning.statements.length <= 1) {
			Alert.show('Delete Planning', 'You cannot delete the last statement of a planning');
			return;
		}

		this.#onClickedDeleteStatementHandler?.(this.gfx.selectedIndex());
		this.#selectedStatement = this.#planning.statements[0];
	}

	// #endregion

	// #region Edit planning

	#onClickedEditPlanning;

	onClickEdit(handler) {
		this.#onClickedEditPlanning = handler;
	}

	onClickedEdit(event) {
		const editButton = event.currentTarget;
		const saveButton = document.getElementById('planning-navbar-save');
		const delStatement = document.getElementById('planning-del-statement');
		const delPlanning = document.getElementById('planning-del-planning');
		const editStatement = document.getElementById('planning-navbar-edit-statement');

		editButton.style.display = 'none';
		delStatement.style.display = '';
		saveButton.style.display = '';
		delPlanning.style.display = '';
		editStatement.style.display = '';

		this.#onClickedEditPlanning?.();
	}

	// #endregion

	// #region Save Planning

	#onClickedSavePlanning;

	onClickSavePlanning(handler) {
		this.#onClickedSavePlanning = handler;
	}

	onClickedSavePlanning(event) {
		const saveButton = event.currentTarget;
		const editButton = document.getElementById('planning-navbar-edit');
		const delStatement = document.getElementById('planning-del-statement');
		const delPlanning = document.getElementById('planning-del-planning');
		const editStatement = document.getElementById('planning-navbar-edit-statement');

		editButton.style.display = '';
		saveButton.style.display = 'none';
		delStatement.style.display = 'none';
		delPlanning.style.display = 'none';
		editStatement.style.display = 'none';

		this.#onClickedSavePlanning?.();
	}

	#onClickedOpenSidenav() {
		this.#sidenav.open();
	}

	// #region Year modal
	buildYearModal() {
		this.#yearsDropup = new Modal('planning-year-dropup')
			.header(
				new Dom('h2').text('Choose planning year'),
			).body().addCancelFooter();
		return this.#yearsDropup;
	}

	appendYear(year) {
		if (this.#yearsInDropup.has(year)) return;

		const onYearChanged = this.onChangedYear.bind(this, year);
		const yearDropupItem = new Dom('div').cls('accordion-secondary').onClick(onYearChanged).text(year);
		this.#yearsInDropup.set(year, yearDropupItem);
		this.#yearsDropup.body(yearDropupItem);
	}

	selectYear(year) {
		if (year === this.#selectedYear) return;

		this.#selectedYear = year;
		this.updateYearDropupText();
	}

	updateYearDropupText() {
		const dropupLeftText = document.getElementById('planning-year-text');
		const newText = `${this.#selectedYear} `;
		if (dropupLeftText.textContent !== newText) {
			dropupLeftText.textContent = newText;
		}

		const newCaret = this.#yearsInDropup.size > 1 ? '▲' : '';
		const dropupLeftCaret = document.getElementById('planning-year-caret');
		if (dropupLeftCaret.textContent !== newCaret) {
			dropupLeftCaret.textContent = newCaret;
		}
	}

	#onClickedYearDropup() {
		this.#yearsDropup.open();
	}

	onChangedYear(year) {
		this.#yearsDropup.close();
		window.location.href = `${window.location.pathname}?year=${year}`;
	}
	// #endregion

	// #region Month modal
	buildMonthModal() {
		this.#monthsDropup = new Modal('planning-month-dropup')
			.header(
				new Dom('h2').text('Choose planning month'),
			).body().addCancelFooter();
		return this.#monthsDropup;
	}

	appendMonth(month) {
		const monthName = Utils.nameForMonth(month);
		if (this.#monthsInDropup.has(month)) return;

		const onMonthChanged = this.onChangedMonth.bind(this, monthName);
		const monthDropupItem = new Dom('div').cls('accordion-secondary').onClick(onMonthChanged).text(monthName);
		this.#monthsInDropup.set(month, monthDropupItem);
		this.#monthsDropup.body(monthDropupItem);

		this.updateMonthDropupText();
	}

	selectMonth(month) {
		if (month === this.#selectedMonth) return;
		this.#selectedMonth = month;
		this.updateMonthDropupText();
	}

	updateMonthDropupText() {
		const monthText = document.getElementById('planning-month-text');
		const monthName = Utils.nameForMonth(this.#selectedMonth);
		const newText = `${monthName} `;
		if (monthText.textContent !== newText) {
			monthText.textContent = newText;
		}

		const newCaret = this.#monthsInDropup.size > 1 ? '▲' : '';
		const monthCaret = document.getElementById('planning-month-caret');
		if (monthCaret.textContent !== newCaret) {
			monthCaret.textContent = newCaret;
		}
	}

	#onClickedMonthDropup() {
		this.#monthsDropup.open();
	}

	onChangedMonth(month) {
		this.#monthsDropup.close();
		window.location.href = `${window.location.pathname}?year=${this.#selectedYear}&month=${month}`;
	}
	// #endregion

	// #region Statement modal

	buildStatementModal() {
		this.#statementsDropup = new Modal('planning-stmt-dropup')
			.header(
				new Dom('h2').text('Choose planning statement'),
			).body().addCancelFooter();
		return this.#statementsDropup;
	}

	appendStatement(statement) {
		if (this.#statementsInDropup.has(statement.name)) {
			return this.#statementsInDropup.get(statement.name);
		}

		const statementDropupItem = this.#statementToDom(statement);
		this.#statementsInDropup.set(statement.name, statementDropupItem);
		this.#statementsDropup.body(statementDropupItem);
		this.updateStatementDropupText();

		return statementDropupItem;
	}

	#refreshStatementDropup() {
		if (this.#planning.statements.length === 0) {
			document.getElementById('planning-stmt-text').textContent = 'No planning statements';
			return;
		}
		this.#statementsDropup.clearBody().body(
			...this.#planning.statements.map(this.appendStatement.bind(this)),
		);
		this.updateStatementDropupText();
	}

	#statementToDom(statement) {
		const onStatementChanged = this.onChangedStatement.bind(this, statement);
		const statementDropupItem = new Dom('div').cls('accordion-secondary').onClick(onStatementChanged).text(statement.name);
		return statementDropupItem;
	}

	selectStatement(statementName) {
		if (statementName === this.#selectedStatement) return;

		const { statements } = this.#planning;
		const jump = true;
		const statement = statements
			.find((stmt) =>	stmt.name.toLowerCase() === statementName.toLowerCase())
		?? this.#planning.statements[0];

		this.onChangedStatement(statement, jump);
	}

	/**
	 * @param {Statement} statement
	 * @returns
	 */
	onChangedStatement(statement, jump = false) {
		if (this.#statementsDropup.isOpen()) this.#statementsDropup.close();

		const statementName = statement.name;
		if (statementName === this.#selectedStatement) return;

		const { statements } = this.#planning;
		const index = statements.findIndex((stmt) => stmt.name === statementName);
		if (index >= 0) {
			const stmt = this.#planning.statements[index];
			this.#selectedStatement = stmt;
			this.updateStatementDropupText();
			if (jump) {
				this.gfx.jumpTo(index);
			} else {
				this.gfx.slideTo(index);
			}
		} else {
			Alert.show('Statement not found', `Statement ${statementName} not found in planning`);
		}
	}

	onChangedStatementIndex(index) {
		this.#selectedStatement = this.#planning.statements[index];
		this.updateStatementDropupText();
	}

	updateStatementDropupText() {
		const statementText = document.getElementById('planning-stmt-text');
		const newText = `${this.#selectedStatement.name} `;
		if (statementText.textContent !== newText) {
			statementText.textContent = newText;
		}

		const newCaret = this.#statementsInDropup.size > 1 ? '▲' : '';
		const statementCaret = document.getElementById('planning-stmt-caret');
		if (statementCaret.textContent !== newCaret) {
			statementCaret.textContent = newCaret;
		}
	}

	#onClickedStatementDropup() {
		this.#statementsDropup.open();
	}

	// #endregion

	// #region Add Statement Modal

	buildSubmitStatementModal() {
		this.#submitStatementModal = new SubmitStatementModal();
		this.#submitStatementModal.onInsertStatement(this.#onInsertedStatement.bind(this));
		this.#submitStatementModal.onEditStatement(this.#onEditedStatement.bind(this));
		return this.#submitStatementModal;
	}

	/**
	 * @param {(newStatement: Statement) => void} handler
	 */
	onInsertStatement(handler) {
		this.#onInsertedStatementHandler = handler;
	}

	#onInsertedStatement(statement) {
		this.#onInsertedStatementHandler?.(statement);
	}

	#onClickedInsertStatement() {
		this.#submitStatementModal.insertMode().open();
	}
	// #endregion

	// #region Edit Statement
	onEditStatement(handler) {
		this.#onEditedStatementHandler = handler;
	}

	#onEditedStatement(statement) {
		this.#onEditedStatementHandler?.(statement);
	}

	onClickedEditStatement() {
		const statement = this.gfx.selectedSlice().userData;
		this.#submitStatementModal.editMode(statement).open();
	}

	// #endregion
}
