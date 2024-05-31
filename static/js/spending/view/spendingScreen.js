import Spending from '../model/spending.js';
import SpendingReport from '../model/spendingReport.js';
import { Category } from '../../planning/model/planningModel.js';
import Dom from '../../common/gui/dom.js';
import icons from '../../common/gui/icons.js';
import GraphicEffects from '../../common/gui/effects.js';
import Modal from '../../common/gui/modal.js';
import SpendingNavbar from './spendingNavbar.js';
import SpendingNavbarEventHandlers from './spendingNavbarHandlers.js';
import Sidenav from '../../common/gui/sidenav.js';
import Alert from '../../common/gui/alert.js';

export default class SpendingScreen {
	onCreateSpendingCallback = undefined;

	onSaveReportCallback = undefined;

	onDeleteReportCallback = undefined;

	/** @type {Array<Category>} */
	categories = undefined;

	/** @type {Map<number, Dom} */
	#drawnSlices = new Map();

	/** @type {Modal} */
	#addSpendingModal = undefined;

	/** @type {Modal} */
	#categoryModal = undefined;

	/** @type {Sidenav} */
	#sidenav = undefined;

	/**
	 * @param {number} year
	 * @param {SpendingReport} defaultSpendingReport
	 * @param {Array<Category>} categories
	 */
	constructor(year, defaultSpendingReport, categories) {
		this.year = year;
		this.defaultSpendingReport = defaultSpendingReport;
		this.categories = categories;
	}

	init() {
		const eventHandlers = new SpendingNavbarEventHandlers();
		eventHandlers.onClickAddSpending = this.onClickAddSpending.bind(this);
		eventHandlers.onClickEdit = this.onClickEdit.bind(this);
		eventHandlers.onClickSave = this.onClickSave.bind(this);
		eventHandlers.onClickSummary = this.onClickSummary.bind(this);
		eventHandlers.onMonthChanged = this.slideToMonth.bind(this);
		this.navbar = new SpendingNavbar(this.year, this.defaultSpendingReport, eventHandlers);
		const main = document.getElementById('main');
		main.appendChild(this.navbar.toHtml());
		this.navbar.selectMonth(this.defaultSpendingReport.month());
		this.navbar.selectYear(this.year);

		this.buildCategoryModal(this.categories);
		this.buildAddSpendingModal();
		this.buildSpendingSummaryModal(this.defaultSpendingReport);

		const container = this.build(this.defaultSpendingReport);
		this.gfx = new GraphicEffects();
		this.gfx.init(container);

		this.#sidenav = new Sidenav(this.gfx);
		document.body.appendChild(this.#sidenav.toHtml());
	}

	/**
	 * Builds or rebuilds the slice with the given report
	 * @param {SpendingReport} spendingReport
	 */
	refreshMonth(spendingReport) {
		let reportSlice = this.#drawnSlices.get(spendingReport.month());
		const sliceId = `slice_${spendingReport.month()}`;
		if (!reportSlice) {
			reportSlice = new Dom('div').id(sliceId).cls('slice').userData(spendingReport).append(
				new Dom('h1').text(`${spendingReport} spending`),
			);
			this.section.append(reportSlice);
			this.navbar.appendMonth(spendingReport.month());
			// Screen changed, effects need reinitialization
			this.gfx.init(this.screen.toHtml());
		} else {
			const sliceTable = document.getElementById(`table-${spendingReport.month()}`);
			reportSlice.toHtml().removeChild(sliceTable);
		}

		reportSlice.append(
			this.buildTable(spendingReport),
		);

		this.#drawnSlices.set(spendingReport.month(), reportSlice);
	}

	updateYear(year) {
		this.navbar.appendYear(year);
	}

	/**
	 * Slides the current shown slice to the one for the month provided
	 * @param {number} month
	 */
	slideToMonth(month) {
		const reportSlice = this.#drawnSlices.get(month);
		const sliceIndex = Array.prototype.indexOf.call(
			this.section.toHtml().childNodes,
			reportSlice.toHtml(),
		);
		this.gfx.slideTo(sliceIndex);
	}

	/**
	 * Jumps to the month selected without animation
	 * @param {number} month
	 */
	jumpToMonth(month) {
		const reportSlice = this.#drawnSlices.get(month);
		const sliceIndex = Array.prototype.indexOf.call(
			this.section.toHtml().childNodes,
			reportSlice.toHtml(),
		);
		this.gfx.jumpTo(sliceIndex);
	}

	/**
	 * @param {SpendingReport} spendingReport
	 * @returns {HTMLElement}
	 */
	build(spendingReport) {
		this.section = new Dom('div').id('spendings-section').cls('section');
		this.screen = new Dom('div').cls('container').append(
			this.section,
		);

		const main = document.getElementById('main');
		main.appendChild(this.screen.toHtml());
		main.appendChild(this.buildTable(spendingReport).toHtml());

		return this.screen.toHtml();
	}

	/**
	 * Builds the {Dom} object associated with this report
	 * @param {SpendingReport} spendingReport
	 * @returns {Dom}
	 */
	buildTable(spendingReport) {
		const onClickDelete = this.onClickDeleteSlice.bind(this);
		const spendingsDom = new Dom('table').id(`table-${spendingReport.month()}`).append(
			new Dom('thead').append(
				new Dom('tr').append(
					new Dom('th').cls('narrow-col').text('Date'),
					new Dom('th').text(spendingReport),
					new Dom('th').cls('normal-col').text('Category'),
					new Dom('th').cls('normal-col').text('Amount'),
					new Dom('th').cls('narrow-col').hideable(this.editMode).append(
						new Dom('button').onClick(onClickDelete).append(
							new Dom('img').cls('white-fill').text('Delete').attr('alt', 'Delete').attr('src', icons.delete),
						),
					),
				),
			),
			new Dom('tbody').append(
				...spendingReport.spendings().map((spending) => this.buildEditableRow(spending)),
			),
			new Dom('tfoot').append(
				this.buildReadOnlyRow(spendingReport.totalAsSpending()),
			),
		).userData(spendingReport);
		this.spendingsHtml = spendingsDom.toHtml();

		return spendingsDom;
	}

	/**
	 * @param {SpendingReport} spendingReport
	 * @returns {HTMLElement}
	 */
	buildSpendingSummaryModal(spendingReport) {
		// TODO. Build summary modal according to currently clicked month
		const spentGoals = spendingReport.goals();
		const goals = this.categories
			.map((category) => category.goals)
			.flat()
			.filter((goal) => spentGoals.filter((spentGoal) => spentGoal === goal.name).length > 0);
		const budgetTotal = goals.reduce((accumulator, current) => accumulator + current.monthly, 0);
		const spendingTotal = spendingReport.total();

		this.summaryModal = new Modal('summary').header(
			new Dom('h2').text('Expenses summary'),
		).body(
			new Dom('table').id(`summary-table-${spendingReport}`).append(
				new Dom('thead').append(
					new Dom('tr').append(
						new Dom('th').text('Category'),
						new Dom('th').cls('normal-col').text('Spending'),
						new Dom('th').cls('normal-col').text('Budget'),
						new Dom('th').cls('normal-col').text('Percent'),
					),
				),
				new Dom('tbody').append(
					...spentGoals.map((goal) => {
						const spentForGoal = spendingReport.totalForGoal(goal).toFixed(2);
						const foundGoal = goals.find((plannedGoal) => plannedGoal.name === goal);
						let budgetForGoal = 1;
						if (!foundGoal) {
							Alert.show('Planning error', `Goal not found in planning: ${goal}`);
						} else {
							budgetForGoal = foundGoal.monthly;
						}
						return new Dom('tr').append(
							new Dom('td').text(goal),
							new Dom('td').text(spentForGoal),
							new Dom('td').text(budgetForGoal),
							new Dom('td').text(((100 * spentForGoal) / budgetForGoal).toFixed(2)),
						);
					}),
				),
				new Dom('tfoot').append(
					new Dom('tr').append(
						new Dom('td').text('Total'),
						new Dom('td').text(spendingTotal),
						new Dom('td').text(budgetTotal),
						new Dom('td').text(((100 * spendingTotal) / budgetTotal).toFixed(2)),
					),
				),
			),
		).addCancelFooter();

		return this.summaryModal;
	}

	buildAddSpendingModal() {
		const onClickCategory = this.onClickCategoryInput.bind(this);
		const onClickSave = this.onClickModalSave.bind(this);
		this.#addSpendingModal = new Modal('add-spending').header(
			new Dom('h2').text('Insert Spending'),
		).body(
			new Dom('form').append(
				new Dom('div').cls('input-field').append(
					new Dom('input').id('date-input-field').type('date').attr('required', '').attr('value', new Date().toISOString().substring(0, 10)),
					new Dom('label').text('Date: '),
				),
				new Dom('div').cls('input-field').append(
					new Dom('input').id('category-input-field').type('text').attr('required', '').onClick(onClickCategory),
					new Dom('label').text('Category: '),
				),
				new Dom('div').cls('input-field').append(
					new Dom('input').id('price-input-field').type('number').attr('required', '').attr('step', '0.01'),
					new Dom('label').text('Price: '),
				),
				new Dom('div').cls('input-field').append(
					new Dom('input').id('description-input-field').type('text').attr('required', ''),
					new Dom('label').text('Description: '),
				),
				new Dom('input').type('submit').hide().onClick(onClickSave),
			),
		);
		this.#addSpendingModal.footer(
			new Dom('h3').text('Cancel').onClick(this.#addSpendingModal.close.bind(this.#addSpendingModal)),
			new Dom('h3').text('Save').onClick(onClickSave),
		);

		return this.#addSpendingModal;
	}

	/**
	 * @param {Array<Category>} forCategories
	 * @returns {Dom}
	 */
	buildCategoryModal(forCategories) {
		const onClickCategory = this.onClickCategory.bind(this);
		const onClickCategoryHeader = this.onClickCategoryHeader.bind(this);
		this.#categoryModal = new Modal('categories')
			.header(
				new Dom('h2').text('Insert Spending'),
			).body(
				new Dom('div').cls('accordion').append(
					...forCategories.map((category) => new Dom('div').cls('accordion-item').onTransitionEnd(onClickCategoryHeader).append(
						new Dom('input').id(category.id).cls('accordion-state').attr('type', 'checkbox'),
						new Dom('label').cls('accordion-header').attr('for', category.id).append(
							new Dom('span').text(category.name),
						),
						new Dom('div').cls('accordion-content').append(
							...category.goals.map((goal) => new Dom('div').cls('accordion-secondary').text(goal.name).onClick(onClickCategory)),
						),
					)),
				),
			).scrollable()
			.addCancelFooter();

		return this.#categoryModal;
	}

	/**
	 * Appends a new row with the current spending to the slice table.
	 * The row is editable and can be deleted.
	 * @param {Spending} spending Spending to append
	 */
	buildEditableRow(spending) {
		const onClickDelete = this.onClickDeleteSpending.bind(this);
		const onSpendingChanged = this.onSpendingChanged.bind(this);
		const spentOn = spending.spentOn.toLocaleString('en-GB', { day: 'numeric' });
		const newRow = new Dom('tr').id(spending.id).userData(spending).append(
			new Dom('td').text(spentOn).editable().onKeyUp(onSpendingChanged),
			new Dom('td').text(spending.description).editable().onKeyUp(onSpendingChanged),
			new Dom('td').text(spending.category).editable().onKeyUp(onSpendingChanged),
			new Dom('td').text(spending.price).editable().onKeyUp(onSpendingChanged),
			new Dom('td').hideable(this.editMode).append(
				new Dom('button').onClick(onClickDelete).append(
					new Dom('img').cls('white-fill').text('Delete').attr('alt', 'Delete').attr('src', icons.delete),
				),
			),
		);

		return newRow;
		// this.spendingsHtml.tBodies[0].appendChild(newRow.toHtml());
	}

	/**
	 * Appends a new row with the current spending to the slice table.
	 * The row cannot be edited nor deleted.
	 * @param {Spending} spending
	 */
	buildReadOnlyRow(spending) {
		const spentOn = spending.spentOn.toLocaleString('en-GB', { day: 'numeric' });
		const newRow = new Dom('tr').id(spending.id).userData(spending).append(
			new Dom('td').text(spentOn),
			new Dom('td').text(spending.description),
			new Dom('td').text(spending.category),
			new Dom('td').text(spending.price.toFixed(2)),
			new Dom('td').hideable(this.editMode),
		);
		return newRow;
	}

	// #region event handlers
	onClickModalSave(event) {
		event.preventDefault();
		const newSpending = {
			id: new Date().getTime(),
			spentOn: document.getElementById('date-input-field').valueAsDate,
			description: document.getElementById('description-input-field').value,
			price: +document.getElementById('price-input-field').value,
			category: document.getElementById('category-input-field').value,
		};

		if (!newSpending.price) {
			document.getElementById('price-input-field').focus();
			return;
		}

		if (this.onCreateSpendingCallback) {
			this.onCreateSpendingCallback(newSpending);
		}

		this.#addSpendingModal.close();
	}

	onClickDeleteSpending(event) {
		if (!this.editMode) return;

		const row = event.currentTarget.parentNode.parentNode;
		const tBody = row.parentNode;
		/** @type {Spending} */
		const spending = row.userData;
		spending.deleted = true;

		tBody.removeChild(row);
	}

	onClickDeleteSlice(event) {
		if (!this.editMode) return;

		const table = (event.currentTarget.parentNode.parentNode.parentNode.parentNode);
		const spendingReport = table.userData;

		if (this.onDeleteReportCallback) {
			this.onDeleteReportCallback(spendingReport);
		}
		table.parentNode.removeChild(table);
	}

	onSpendingChanged(event) {
		if (!this.editMode) return;

		const cell = event.currentTarget;
		const row = cell.parentNode;

		const { cellIndex } = event.currentTarget;
		/** @type {Spending} */
		const spending = row.userData;

		switch (cellIndex) {
		case 0:
			spending.description = cell.textContent;
			break;
		case 1:
			spending.spentOn = cell.valueAsDate;
			break;
		case 2:
			spending.category = cell.textContent;
			break;
		case 3:
			spending.price = +cell.textContent;
			break;
		default:
			break;
		}

		spending.edited = true;
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
	}

	onClickSave() {
		const editables = document.querySelectorAll('[editable="true"]');
		for (let i = 0; i < editables.length; i += 1) {
			editables[i].contentEditable = 'false';
		}

		const hideables = document.querySelectorAll('[hideable="true"]');
		for (let i = 0; i < hideables.length; i += 1) {
			hideables[i].style.display = 'none';
		}

		this.editMode = false;

		this.#drawnSlices.forEach((slice) => {
			const spendingReport = slice.toHtml().userData;
			if (spendingReport) {
				const changedSpendings = spendingReport.spendings()
					.filter((spending) => spending.deleted || spending.edited);

				if (this.onSaveReportCallback && changedSpendings?.length > 0) {
					this.onSaveReportCallback(changedSpendings);
				}
			}
		});
	}

	onClickSummary() {
		this.summaryModal.open();
	}

	onClickAddSpending() {
		// TODO. Build category modal according to currently clicked month
		this.onClickCategoryInput();
	}

	onClickCategoryInput() {
		if (this.#addSpendingModal.isOpen()) {
			this.#addSpendingModal.close();
		}
		this.#categoryModal.open();
	}

	onClickCategoryHeader(event) {
		const header = event.currentTarget;
		header.scrollIntoView(true);
	}

	onClickCategory(event) {
		// TODO move setters in modal
		this.#categoryModal.close();
		this.#addSpendingModal.open();
		const categoryInput = document.getElementById('category-input-field');
		const descriptionInput = document.getElementById('description-input-field');
		categoryInput.value = event.target.textContent;
		descriptionInput.value = event.target.textContent;
		this.focusInputField('price-input-field');
	}

	focusInputField(withId) {
		/* Focus cannot be applied to invisible elements.
		 * We need to wait for elemnt to be focusable.
		 * We also cannot use display: none -> display: visible because 'display' cannot be animated
		 */
		requestAnimationFrame(() => {
			const priceInputField = document.getElementById(withId);
			priceInputField.focus();
			if (document.activeElement !== priceInputField) {
				requestAnimationFrame(this.focusInputField.bind(this, withId));
			}
		});
	}
	// #endregion
}
