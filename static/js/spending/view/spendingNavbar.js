/* eslint-disable max-classes-per-file */
import Dom from '../../common/gui/dom.js';
import icons from '../../common/gui/icons.js';
import Modal from '../../common/gui/modal.js';
import SpendingNavbarEventHandlers from './spendingNavbarHandlers.js';

export default class SpendingNavbar {
	/** @type {Dom} */
	#navbar = undefined;

	/** @type {Map<number, Dom} */
	#monthsInDropup = undefined;

	/** @type {Map<number, Dom} */
	#yearsInDropup = undefined;

	/** @type {Modal} */
	#monthsDropup = undefined;

	/** @type {Modal} */
	#yearsDropup = undefined;

	/** @type {SpendingNavbarEventHandlers} */
	#eventHandlers = undefined;

	/** @type {number} */
	#selectedMonth = undefined;

	/** @type {number} */
	#selectedYear = undefined;

	/** @type {Array<string>} */
	static #MONTH_NAMES = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];

	/**
	 * Constructs an instance of Spending Navbar
	 * @param {number} year default year to show in navbar
	 * @param {number} month default month to show in navbar
	 * @param {SpendingNavbarEventHandlers} eventHandlers Callbacks for when navbar events take place
	 */
	constructor(year, month, eventHandlers) {
		this.year = year;
		this.#monthsInDropup = new Map();
		this.#yearsInDropup = new Map();
		this.#eventHandlers = eventHandlers;

		this.buildMonthModal();
		this.buildYearModal();

		const onClickEdit = this.onClickEdit.bind(this);
		const onClickSave = this.onClickSave.bind(this);
		const onClickSummary = eventHandlers.onClickSummary ? eventHandlers.onClickSummary : () => {};
		const onClickAdd = eventHandlers.onClickAddSpending
			? eventHandlers.onClickAddSpending
			: () => {};
		const onClickMonthDropup = this.onClickMonthDropup.bind(this);
		const onClickYearDropup = this.onClickYearDropup.bind(this);

		this.#navbar = new Dom('nav').append(
			new Dom('div').cls('nav-header').append(
				new Dom('button').id('spending-navbar-edit').cls('nav-item').onClick(onClickEdit).append(
					new Dom('img').cls('white-fill').text('Edit').attr('alt', 'Edit').attr('src', icons.edit),
				),
				new Dom('button').id('spending-navbar-save').cls('nav-item').onClick(onClickSave).hide()
					.append(
						new Dom('img').cls('white-fill').text('Save').attr('alt', 'Save').attr('src', icons.save),
					),
				new Dom('button').id('spending-navbar-summary').cls('nav-item').onClick(onClickSummary).append(
					new Dom('img').cls('white-fill').text('Summary').attr('alt', 'Save').attr('src', icons.summary),
				),
				new Dom('button').id('spending-navbar-add-spending').cls('nav-item').onClick(onClickAdd).append(
					new Dom('img').cls('white-fill').text('Add').attr('alt', 'Add').attr('src', icons.hand_coin),
				),
			),
			new Dom('div').cls('nav-footer').append(
				new Dom('button').id('dropup-left').cls('nav-item').onClick(onClickYearDropup).append(
					new Dom('span').id('dropup-left-text').text(`${year} `),
					new Dom('span').id('dropup-left-caret').cls('white-50').text(''),
				),
				new Dom('button').id('dropup-right').cls('nav-item').onClick(onClickMonthDropup).append(
					new Dom('span').id('dropup-right-text').text(`${SpendingNavbar.#MONTH_NAMES[month]} `),
					new Dom('span').id('dropup-right-caret').cls('white-50').text(''),
				),
				new Dom('button').cls('nav-item', 'nav-trigger').append(
					new Dom('img').cls('white-fill').text('Menu').attr('alt', 'Menu').attr('src', icons.menu),
				),
			),
			new Dom('div').cls('dropup-content', 'top-round').hide(),
		);
	}

	toHtml() {
		return this.#navbar.toHtml();
	}

	buildMonthModal() {
		this.#monthsDropup = new Modal('month-dropup')
			.header(
				new Dom('h2').text('Choose spending month'),
			).body().addCancelFooter();
		return this.#monthsDropup;
	}

	buildYearModal() {
		this.#yearsDropup = new Modal('year-dropup')
			.header(
				new Dom('h2').text('Choose spending year'),
			).body().addCancelFooter();
		return this.#yearsDropup;
	}

	appendYear(year) {
		if (this.#yearsInDropup.has(year)) return;

		const onYearChanged = this.onYearChanged.bind(this, year);
		const yearDropupItem = new Dom('div').cls('accordion-secondary').onClick(onYearChanged).text(year);
		this.#yearsInDropup.set(year, yearDropupItem);
		this.#yearsDropup.body(yearDropupItem);
		this.updateYearDropupText();
	}

	appendMonth(month) {
		if (this.#monthsInDropup.has(month)) return;

		const onMonthChanged = this.onMonthChanged.bind(this, month);
		const monthDropupItem = new Dom('div')
			.cls('accordion-secondary')
			.text(SpendingNavbar.#MONTH_NAMES[month])
			.onClick(onMonthChanged);

		this.#monthsInDropup.set(month, monthDropupItem);
		this.#monthsDropup.body(monthDropupItem);
		this.updateMonthDropupText();
	}

	selectMonth(month) {
		if (month === this.#selectedMonth) return;

		this.#selectedMonth = month;
		this.updateMonthDropupText();
	}

	selectYear(year) {
		if (year === this.#selectedYear) return;

		this.#selectedYear = year;
		this.updateYearDropupText();
	}

	updateYearDropupText() {
		const dropupLeftText = document.getElementById('dropup-left-text');
		const newText = `${this.#selectedYear} `;
		if (dropupLeftText.textContent !== newText) {
			dropupLeftText.textContent = newText;
		}

		const newCaret = this.#yearsInDropup.size > 1 ? '▲' : '';
		const dropupLeftCaret = document.getElementById('dropup-left-caret');
		if (dropupLeftCaret.textContent !== newCaret) {
			dropupLeftCaret.textContent = newCaret;
		}
	}

	updateMonthDropupText() {
		const dropupRightText = document.getElementById('dropup-right-text');
		const newText = `${SpendingNavbar.#MONTH_NAMES[this.#selectedMonth]} `;
		if (dropupRightText.textContent !== newText) {
			dropupRightText.textContent = newText;
		}

		const newCaret = this.#monthsInDropup.size > 1 ? '▲' : '';
		const dropupRightCaret = document.getElementById('dropup-right-caret');
		if (dropupRightCaret.textContent !== newCaret) {
			dropupRightCaret.textContent = newCaret;
		}
	}

	// #region GUI handlers

	onClickMonthDropup() {
		this.#monthsDropup.open();
	}

	onClickYearDropup() {
		this.#yearsDropup.open();
	}

	onMonthChanged(month) {
		if (this.#eventHandlers.onMonthChanged) {
			this.#eventHandlers.onMonthChanged(month);
		}
		this.#monthsDropup.close();
	}

	onYearChanged(year) {
		this.#yearsDropup.close();
		window.location.href = `${window.location.pathname}?year=${year}`;
	}

	onClickEdit() {
		const editButton = document.getElementById('spending-navbar-edit');
		const saveButton = document.getElementById('spending-navbar-save');
		const summaryButton = document.getElementById('spending-navbar-summary');
		const addSpendingButton = document.getElementById('spending-navbar-add-spending');

		editButton.style.display = 'none';
		addSpendingButton.style.display = 'none';
		summaryButton.style.display = 'none';
		saveButton.style.display = '';

		if (this.#eventHandlers.onClickEdit) {
			this.#eventHandlers.onClickEdit();
		}
	}

	onClickSave() {
		const editButton = document.getElementById('spending-navbar-edit');
		const saveButton = document.getElementById('spending-navbar-save');
		const summaryButton = document.getElementById('spending-navbar-summary');
		const addSpendingButton = document.getElementById('spending-navbar-add-spending');

		editButton.style.display = '';
		summaryButton.style.display = '';
		addSpendingButton.style.display = '';
		saveButton.style.display = 'none';

		if (this.#eventHandlers.onClickSave) {
			this.#eventHandlers.onClickSave();
		}
	}

	// #endregion
}
