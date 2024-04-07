import Dom from '../../gui/dom.js';
import icons from '../../gui/icons.js';
import Modal from '../../gui/modal.js';
import Utils from '../../utils/utils.js';
import PlanningNavbarEventHandlers from './planningNavbarEventHandlers.js';

export default class PlanningNavBar {
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
	#yearsDropup = undefined;

	/** @type {Modal} */
	#statementsDropup = undefined;

	/** @type {PlanningNavbarEventHandlers} */
	#eventHandlers = undefined;

	/** @type {number} */
	#selectedMonth = undefined;

	/** @type {number} */
	#selectedYear = undefined;

	/**
	 * Constructs an instance of Planning Navbar
	 * @param {number} year default year to select in navbar
	 * @param {number} month default month to select in navbar
	 * @param {PlanningNavbarEventHandlers} eventHandlers Callbacks for when events fire
	 */
	constructor(year, month, statement, eventHandlers) {
		this.#yearsInDropup = new Map();

		const onClickEdit = undefined;
		const onClickSave = undefined;
		const onClickMonthDropup = undefined;

		const main = document.getElementById('main');
		main.appendChild(this.buildYearModal().toHtml());
		const onClickYearDropup = this.onClickYearDropup.bind(this);

		this.#navbar = new Dom('nav').append(
			new Dom('div').cls('nav-header').append(
				new Dom('button').id('planning-navbar-edit').cls('nav-item').onClick(onClickEdit).append(
					new Dom('img').cls('white-fill').text('Edit').attr('alt', 'Edit').attr('src', icons.edit),
				),
				new Dom('button').id('planning-navbar-save').cls('nav-item').onClick(onClickSave).hide()
					.append(
						new Dom('img').cls('white-fill').text('Save').attr('alt', 'Save').attr('src', icons.save),
					),
			),
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
				new Dom('button').id('planning-stmt-right').cls('nav-item').onClick(onClickMonthDropup).append(
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

	toHtml() {
		return this.#navbar.toHtml();
	}

	buildYearModal() {
		this.#yearsDropup = new Modal('planning-year-dropup')
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
		this.#yearsDropup.open();
	}

	onYearChanged(year) {
		this.#yearsDropup.close();
		window.location.href = `${window.location.pathname}?year=${year}`;
	}
}
