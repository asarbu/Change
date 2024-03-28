/* eslint-disable max-classes-per-file */
import Dom from './dom.js';
import icons from './icons.js';
import Modal from './modal.js';

export class SpendingNavBarEventHandlers {
	onMonthChanged = undefined;

	onYearChanged = undefined;

	onClickEdit = undefined;

	onClickSave = undefined;

	onClickDelete = undefined;

	onClickAddSpending = undefined;

	onClickSummary = undefined;
}

export default class SpendingNavBar {
	/** @type {Dom} */
	#navbar = undefined;

	/** @type {Map<number, Dom} */
	#monthsInDropup = undefined;

	/** @type {Map<number, Dom} */
	#yearsInDropup = undefined;

	/** @type {Modal} */
	#monthsDropup = undefined;

	/** @type {SpendingNavBarEventHandlers} */
	#eventHandlers = undefined;

	/** @type {number} */
	#selectedMonth = undefined;

	/** @type {Array<string>} */
	static #MONTH_NAMES = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];

	/**
	 * Constructs an instance of Spending Navbar
	 * @param {number} year default year to show in navbar
	 * @param {number} month default month to show in navbar
	 * @param {SpendingNavBarEventHandlers} eventHandlers Callbacks for when navbar events take place
	 */
	constructor(year, month, eventHandlers) {
		this.year = year;
		this.#monthsInDropup = new Map();
		this.#monthsDropup = new Modal();
		this.#eventHandlers = eventHandlers;

		const main = document.getElementById('main');
		main.appendChild(this.buildMonthModal().toHtml());

		const onClickYear = eventHandlers.onYearChanged ? eventHandlers.onYearChanged : () => {};
		const onClickDelete = eventHandlers.onClickDelete ? eventHandlers.onClickDelete : () => {};
		const onClickEdit = eventHandlers.onClickEdit ? eventHandlers.onClickEdit : () => {};
		const onClickSave = eventHandlers.onClickSave ? eventHandlers.onClickSave : () => {};
		const onClickSummary = eventHandlers.onClickSummary ? eventHandlers.onClickSummary : () => {};
		const onClickAdd = eventHandlers.onClickAddSpending
			? eventHandlers.onClickAddSpending
			: () => {};
		const onClickMonthDropup = this.onClickMonthDropup.bind(this);

		this.#navbar = new Dom('nav').append(
			new Dom('div').cls('nav-header').append(
				new Dom('button').cls('nav-item').hideable().onClick(onClickDelete).append(
					new Dom('img').cls('white-fill').text('Delete').attr('alt', 'Delete').attr('src', icons.delete),
				),
				new Dom('button').id('edit-button').cls('nav-item').onClick(onClickEdit).append(
					new Dom('img').cls('white-fill').text('Edit').attr('alt', 'Edit').attr('src', icons.edit),
				),
				new Dom('button').id('save-button').cls('nav-item').onClick(onClickSave).hide()
					.append(
						new Dom('img').cls('white-fill').text('Save').attr('alt', 'Save').attr('src', icons.save),
					),
				new Dom('button').id('summary-button').cls('nav-item').onClick(onClickSummary).append(
					new Dom('img').cls('white-fill').text('Summary').attr('alt', 'Save').attr('src', icons.summary),
				),
				new Dom('button').cls('nav-item').onClick(onClickAdd).append(
					new Dom('img').cls('white-fill').text('Add').attr('alt', 'Add').attr('src', icons.hand_coin),
				),
			),
			new Dom('div').cls('nav-footer').append(
				new Dom('button').cls('nav-item', 'nav-trigger').attr('data-side', 'left').append(
					new Dom('img').cls('white-fill').text('Menu').attr('alt', 'Menu').attr('src', icons.menu),
				),
				new Dom('button').id('dropup-left').cls('nav-item').text(`${year} `).onClick(onClickYear),
				new Dom('button').id('dropup-right').cls('nav-item').onClick(onClickMonthDropup).append(
					new Dom('span').id('dropup-right-text').text(`${SpendingNavBar.#MONTH_NAMES[month]} `),
					new Dom('span').id('dropup-right-caret').cls('white-50').text(''),
				),
				new Dom('button').cls('nav-item', 'nav-trigger').attr('data-side', 'right').append(
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
		this.yearDropup = new Modal('year-dropup')
			.header(
				new Dom('h2').text('Choose spending year'),
			).body().addCancelFooter();
		return this.yearDropup.toHtml();
	}

	appendYear(year) {
		if (this.#yearsInDropup.has(year)) return;

		const yearDropupItem = new Dom('div').cls('accordion-secondary').text(year);
		this.#yearsInDropup.set(year, yearDropupItem);
		this.yearDropup.body(yearDropupItem);
	}

	appendMonth(month) {
		if (this.#monthsInDropup.has(month)) return;

		const onMonthChanged = this.onMonthChanged.bind(this, month);
		const monthDropupItem = new Dom('div')
			.cls('accordion-secondary')
			.text(SpendingNavBar.#MONTH_NAMES[month])
			.onClick(onMonthChanged);

		this.#monthsInDropup.set(month, monthDropupItem);
		this.#monthsDropup.body(monthDropupItem);
		this.updateMonthDropupText();
	}

	onMonthChanged(month) {
		if (this.#eventHandlers.onMonthChanged) {
			this.#eventHandlers.onMonthChanged(month);
		}
		this.#monthsDropup.close();
	}

	selectMonth(month) {
		if (month === this.#selectedMonth) return;

		this.#selectedMonth = month;
		this.updateMonthDropupText();
	}

	updateMonthDropupText() {
		const dropupRightText = document.getElementById('dropup-right-text');
		const newText = `${SpendingNavBar.#MONTH_NAMES[this.#selectedMonth]} `;
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

	// #endregion
}
