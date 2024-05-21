/* eslint-disable prefer-destructuring */
import Dom from '../../common/gui/dom.js';
import icons from '../../common/gui/icons.js';
import Modal from '../../common/gui/modal.js';
import Utils from '../../common/utils/utils.js';
import Planning, { Statement } from '../model/planningModel.js';
import PlanningNavbarEventListeners from './planningNavbarEventListeners.js';

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

	/** @type {Modal} */
	#addStatementDropup = undefined;

	/** @type {Modal} */
	#statementTypeDropup = undefined;

	/** @type {PlanningNavbarEventListeners} */
	#eventListeners = undefined;

	/** @type {Planning} */
	#planning = undefined;

	/** @type {number} */
	#selectedMonth = undefined;

	/** @type {number} */
	#selectedYear = undefined;

	/** @type {number} */
	#selectedStatement = undefined;

	/** @type {boolean} */
	#addSpendingPending = false;

	/**
	 * Constructs an instance of Planning Navbar
	 * @param {Planning} planning default year to select in navbar
	 */
	constructor(planning) {
		this.#yearsInDropup = new Map();
		this.#monthsInDropup = new Map();
		this.#statementsInDropup = new Map();
		this.#eventListeners = new PlanningNavbarEventListeners();

		this.#planning = planning;
		this.#selectedYear = planning.year;
		this.#selectedMonth = planning.month;
		if (planning.statements.length > 0) {
			this.#selectedStatement = planning.statements[0].name;
		}

		this.buildYearModal();
		this.buildMonthModal();
		this.buildStatementModal();
		this.buildStatementTypeModal();
		this.buildAddStatementModal();

		const onClickYearDropup = this.onClickedYearDropup.bind(this);
		const onClickMonthDropup = this.onClickedMonthDropup.bind(this);
		const onClickStatementDropup = this.onClickedStatementDropup.bind(this);

		this.#navbar = new Dom('nav').append(
			this.buildNavbarHeader(),
			new Dom('div').cls('nav-footer').append(
				new Dom('button').cls('nav-item', 'nav-trigger').attr('data-side', 'left').append(
					new Dom('img').cls('white-fill').text('Menu').attr('alt', 'Menu').attr('src', icons.menu),
				),
				new Dom('button').cls('nav-item').onClick(onClickYearDropup).append(
					new Dom('span').id('planning-year-text').text(`${this.#selectedYear} `),
					new Dom('span').id('planning-year-caret').cls('white-50').text(''),
				),
				new Dom('button').cls('nav-item').onClick(onClickMonthDropup).append(
					new Dom('span').id('planning-month-text').text(`${Utils.nameForMonth(this.#selectedMonth)} `),
					new Dom('span').id('planning-month-caret').cls('white-50').text(''),
				),
				new Dom('button').cls('nav-item').onClick(onClickStatementDropup).append(
					new Dom('span').id('planning-stmt-text').text(`${this.#selectedStatement} `),
					new Dom('span').id('planning-stmt-caret').cls('white-50').text(''),
				),
				new Dom('button').cls('nav-item', 'nav-trigger').attr('data-side', 'right').append(
					new Dom('img').cls('white-fill').text('Menu').attr('alt', 'Menu').attr('src', icons.menu),
				),
			),
			new Dom('div').cls('dropup-content', 'top-round').hide(),
		);
	}

	buildNavbarHeader() {
		const onClickEdit = this.onClickedEdit.bind(this);
		const onClickSave = this.onClickedSave.bind(this);
		const onClickAddStatement = this.onClickedAddStatement.bind(this);
		const onClickDeletePlanning = this.onClickedDeletePlanning.bind(this);
		const onClickDeleteStatement = this.onClickedDeleteStatement.bind(this);

		return new Dom('div').cls('nav-header').append(
			new Dom('button').id('planning-del-planning').cls('nav-item').hide().onClick(onClickDeletePlanning)
				.append(
					new Dom('img').cls('white-fill').text('Delete Planning').attr('alt', 'Delete Planning').attr('src', icons.notebook_remove),
				),
			new Dom('button').id('planning-del-statement').cls('nav-item').hide().onClick(onClickDeleteStatement)
				.append(
					new Dom('img').cls('white-fill').text('Delete Statement').attr('alt', 'Delete Statement').attr('src', icons.delete_file),
				),
			new Dom('button').id('planning-navbar-edit').cls('nav-item').onClick(onClickEdit).append(
				new Dom('img').cls('white-fill').text('Edit').attr('alt', 'Edit').attr('src', icons.edit),
			),
			new Dom('button').id('planning-navbar-save').cls('nav-item').onClick(onClickSave).hide()
				.append(
					new Dom('img').cls('white-fill').text('Save').attr('alt', 'Save').attr('src', icons.save),
				),
			new Dom('button').id('planning-add-statement').cls('nav-item').onClick(onClickAddStatement)
				.append(
					new Dom('img').cls('white-fill').text('Add Statement').attr('alt', 'Add Statement').attr('src', icons.add_file),
				),
		);
	}

	toHtml() {
		return this.#navbar.toHtml();
	}

	onClickDeletePlanning(handler) {
		this.#eventListeners.onClickedDeletePlanning = handler;
	}

	onClickedDeletePlanning() {
		if (this.#eventListeners.onClickedDeletePlanning) {
			this.#eventListeners.onClickedDeletePlanning(this.#planning);
		}
	}

	onClickDeleteStatement(handler) {
		this.#eventListeners.onClickedDeletedStatement = handler;
	}

	onClickedDeleteStatement() {
		if (this.#eventListeners.onClickedDeletedStatement) {
			this.#eventListeners.onClickedDeletedStatement();
		}
	}

	onClickEdit(handler) {
		this.#eventListeners.onClickedEdit = handler;
	}

	onClickedEdit(event) {
		const editButton = event.currentTarget;
		const saveButton = document.getElementById('planning-navbar-save');
		const delStatement = document.getElementById('planning-del-statement');
		const delPlanning = document.getElementById('planning-del-planning');

		editButton.style.display = 'none';
		delStatement.style.display = '';
		saveButton.style.display = '';
		delPlanning.style.display = '';

		if (this.#eventListeners.onClickedEdit) {
			this.#eventListeners.onClickedEdit();
		}
	}

	onClickSave(handler) {
		this.#eventListeners.onClickedSave = handler;
	}

	onClickedSave(event) {
		const saveButton = event.currentTarget;
		const editButton = document.getElementById('planning-navbar-edit');
		const delStatement = document.getElementById('planning-del-statement');
		const delPlanning = document.getElementById('planning-del-planning');

		editButton.style.display = '';
		saveButton.style.display = 'none';
		delStatement.style.display = 'none';
		delPlanning.style.display = 'none';

		if (this.#eventListeners.onClickedSave) {
			this.#eventListeners.onClickedSave();
		}
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

	onClickedYearDropup() {
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

	onClickedMonthDropup() {
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

	onChangeStatement(handler) {
		this.#eventListeners.onChangedStatement = handler;
	}

	appendStatement(statement) {
		if (this.#statementsInDropup.has(statement)) return;

		const onStatementChanged = this.onChangedStatement.bind(this, statement);
		const statementDropupItem = new Dom('div').cls('accordion-secondary').onClick(onStatementChanged).text(statement);
		this.#statementsInDropup.set(statement, statementDropupItem);
		this.#statementsDropup.body(statementDropupItem);
		this.updateStatementDropupText();
	}

	selectStatement(statement) {
		if (statement === this.#selectedStatement) return;
		this.#selectedStatement = statement;
	}

	updateStatementDropupText() {
		const statementText = document.getElementById('planning-stmt-text');
		const newText = `${this.#selectedStatement} `;
		if (statementText.textContent !== newText) {
			statementText.textContent = newText;
		}

		const newCaret = this.#statementsInDropup.size > 1 ? '▲' : '';
		const statementCaret = document.getElementById('planning-stmt-caret');
		if (statementCaret.textContent !== newCaret) {
			statementCaret.textContent = newCaret;
		}
	}

	onClickedStatementDropup() {
		this.#statementsDropup.open();
	}

	onChangedStatement(statement) {
		this.#statementsDropup.close();
		if (this.#eventListeners.onChangedStatement) {
			this.#eventListeners.onChangedStatement(statement);
		}
	}

	// #endregion

	// #region Add Statement Modal

	buildAddStatementModal() {
		const onClickSave = this.onClickedSaveStatement.bind(this);
		const onClickStatementType = this.onClickedStatementType.bind(this, true);
		this.#addStatementDropup = new Modal('add-statement').header(
			new Dom('h2').text('Add Statement'),
		).body(
			new Dom('form').append(
				new Dom('div').cls('input-field').append(
					new Dom('input').id('statement-date-input').type('date').attr('required', '').attr('value', new Date().toISOString().substring(0, 10)),
					new Dom('label').text('Date: '),
				),
				new Dom('div').cls('input-field').append(
					new Dom('input').id('statement-name-input').type('text').attr('required', ''),
					new Dom('label').text('Statement name: '),
				),
				new Dom('div').cls('input-field').onClick().append(
					new Dom('input').id('statement-type-input').onClick(onClickStatementType).type('text').attr('required', ''),
					new Dom('label').text('Type: '),
				),
				new Dom('input').type('submit').hide().onClick(onClickSave),
			),
		);
		this.#addStatementDropup.footer(
			new Dom('h3').text('Cancel').onClick(this.#addStatementDropup.close.bind(this.#addStatementDropup)),
			new Dom('h3').text('Save').onClick(onClickSave),
		);

		return this.#addStatementDropup;
	}

	onClickSaveStatement(handler) {
		this.#eventListeners.onClickedSaveStatement = handler;
	}

	onClickedSaveStatement() {
		const statementId = document.getElementById('statement-date-input').valueAsDate.getTime();
		const statementName = document.getElementById('statement-name-input').value;
		const statementType = document.getElementById('statement-type-input').value;
		const newStatement = new Statement(statementId, statementName, statementType);

		if (this.#eventListeners.onClickedSaveStatement) {
			this.#eventListeners.onClickedSaveStatement(newStatement);
		}
		this.#addStatementDropup.close();
	}

	onClickedAddStatement() {
		this.#addStatementDropup.open();
	}
	// #endregion

	// #region Statement Type modal
	buildStatementTypeModal() {
		const onStatementTypeChanged = this.onChangedStatementType.bind(this);
		this.#statementTypeDropup = new Modal('statement-type').header(
			new Dom('h2').text('Select Statement Type'),
		).body(
			new Dom('div').cls('accordion-secondary').text('Income').onClick(onStatementTypeChanged),
			new Dom('div').cls('accordion-secondary').text('Expense').onClick(onStatementTypeChanged),
			new Dom('div').cls('accordion-secondary').text('Savings').onClick(onStatementTypeChanged),
		).addCancelFooter();

		return this.#statementTypeDropup;
	}

	onClickedStatementType() {
		this.#statementTypeDropup.open();
		if (this.#addStatementDropup.isOpen()) {
			this.#addSpendingPending = true;
			this.#addStatementDropup.close();
		}
	}

	onChangeStatementType(handler) {
		this.#eventListeners.onChangedStatementType = handler;
	}

	onChangedStatementType(event) {
		const type = event.currentTarget.textContent;
		this.#statementTypeDropup.close();
		if (this.#addSpendingPending) {
			this.#addSpendingPending = false;
			this.#addStatementDropup.open();
			document.getElementById('statement-type-input').value = type;
		}

		if (this.#eventListeners.onChangedStatementType) {
			this.#eventListeners.onChangedStatementType(event);
		}
	}
	// #endregion
}
