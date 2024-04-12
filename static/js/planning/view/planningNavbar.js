import Dom from '../../gui/dom.js';
import icons from '../../gui/icons.js';
import Modal from '../../gui/modal.js';
import Utils from '../../utils/utils.js';
import PlanningNavbarEventHandlers from './planningNavbarEventHandlers.js';

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
	#monthsDropup = undefined;

	/** @type {Modal} */
	#statementDropup = undefined;

	/** @type {Modal} */
	#statementsDropup = undefined;

	/** @type {PlanningNavbarEventHandlers} */
	#eventHandlers = undefined;

	/** @type {number} */
	#selectedMonth = undefined;

	/** @type {number} */
	#selectedYear = undefined;

	/** @type {number} */
	#selectedStatement = undefined;

	/**
	 * Constructs an instance of Planning Navbar
	 * @param {number} year default year to select in navbar
	 * @param {number} month default month to select in navbar
	 * @param {PlanningNavbarEventHandlers} eventHandlers Callbacks for when events fire
	 */
	constructor(year, month, statement, eventHandlers) {
		this.#yearsInDropup = new Map();
		this.#monthsInDropup = new Map();
		this.#statementsInDropup = new Map();

		this.#selectedYear = year;
		this.#selectedMonth = month;
		this.#selectedStatement = statement;
		this.#eventHandlers = eventHandlers;

		const onClickMonthDropup = undefined;

		const main = document.getElementById('main');
		main.appendChild(this.buildYearModal().toHtml());
		const onClickYearDropup = this.onClickYearDropup.bind(this);
		const onClickStatementDropup = this.onClickStatementDropup.bind(this);

		this.#navbar = new Dom('nav').append(
			this.buildNavbarHeader(),
			new Dom('div').cls('nav-footer').append(
				new Dom('button').cls('nav-item', 'nav-trigger').attr('data-side', 'left').append(
					new Dom('img').cls('white-fill').text('Menu').attr('alt', 'Menu').attr('src', icons.menu),
				),
				new Dom('button').id('planning-year-dropup').cls('nav-item').onClick(onClickYearDropup).append(
					new Dom('span').id('planning-year-text').text(`${year} `),
					new Dom('span').id('planning-year-caret').cls('white-50').text(''),
				),
				new Dom('button').id('planning-month-dropup').cls('nav-item').onClick(onClickMonthDropup).append(
					new Dom('span').id('planning-month-text').text(`${Utils.nameForMonth(month)} `),
					new Dom('span').id('planning-month-caret').cls('white-50').text(''),
				),
				new Dom('button').id('planning-stmt-right').cls('nav-item').onClick(onClickStatementDropup).append(
					new Dom('span').id('planning-stmt-text').text(`${statement} `),
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
		const onClickEdit = this.onClickEdit.bind(this);
		const onClickSave = this.onClickSave.bind(this);

		return new Dom('div').cls('nav-header').append(
			new Dom('button').id('planning-navbar-edit').cls('nav-item').onClick(onClickEdit).append(
				new Dom('img').cls('white-fill').text('Edit').attr('alt', 'Edit').attr('src', icons.edit),
			),
			new Dom('button').id('planning-navbar-save').cls('nav-item').onClick(onClickSave).hide()
				.append(
					new Dom('img').cls('white-fill').text('Save').attr('alt', 'Save').attr('src', icons.save),
				),
		);
	}

	toHtml() {
		return this.#navbar.toHtml();
	}

	onClickEdit(event) {
		const editButton = event.currentTarget;
		const saveButton = document.getElementById('save-navbar-button');
		editButton.parentNode.replaceChild(saveButton, editButton);

		if (this.#eventHandlers.onClickEdit) {
			this.#eventHandlers.onClickEdit();
		}
	}

	onClickSave(event) {
		const saveButton = event.currentTarget;
		const editButton = document.getElementById('edit-navbar-button');
		saveButton.parentNode.replaceChild(editButton, saveButton);

		if (this.#eventHandlers.onClickSsave) {
			this.#eventHandlers.onClickSave();
		}
	}

	buildYearModal() {
		this.#statementDropup = new Modal('planning-year-dropup')
			.header(
				new Dom('h2').text('Choose planning year'),
			).body().addCancelFooter();
		return this.#statementDropup;
	}

	appendYear(year) {
		if (this.#yearsInDropup.has(year)) return;

		const onYearChanged = this.onYearChanged.bind(this, year);
		const yearDropupItem = new Dom('div').cls('accordion-secondary').onClick(onYearChanged).text(year);
		this.#yearsInDropup.set(year, yearDropupItem);
		this.#statementDropup.body(yearDropupItem);
		this.updateYearDropupText();
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

	onClickYearDropup() {
		this.#statementDropup.open();
	}

	onYearChanged(year) {
		this.#statementDropup.close();
		window.location.href = `${window.location.pathname}?year=${year}`;
	}

	buildStatementModal() {
		this.#statementDropup = new Modal('planning-stmt-dropup')
			.header(
				new Dom('h2').text('Choose planning statement'),
			).body().addCancelFooter();
		return this.#statementDropup;
	}

	appendStatement(statement) {
		if (this.#statementsInDropup.has(statement)) return;

		const onStatementChanged = this.onStatementChanged.bind(this, statement);
		const statementDropupItem = new Dom('div').cls('accordion-secondary').onClick(onStatementChanged).text(statement);
		this.#statementsInDropup.set(statement, statementDropupItem);
		this.#statementDropup.body(statementDropupItem);
		this.updateStatementDropupText();
	}

	selectStatement(statement) {
		if (statement === this.#selectedStatement) return;

		this.#selectedStatement = statement;
		this.updateStatementDropupText();
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

	onClickStatementDropup() {
		this.#statementDropup.open();
	}

	onStatementChanged(statement) {
		this.#statementDropup.close();
		// TODO replace this with slideTo
		const { pathname } = window.location;
		const year = this.#selectedYear;
		const month = this.#selectedMonth;
		const href = `${pathname}?year=${year}&month=${month}&statement=${statement}`;
		window.location.href = href;
	}
}
