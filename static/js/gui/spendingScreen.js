import Spending, { SpendingReport } from '../persistence/spending/spendingModel.js';
import { Category } from '../persistence/planning/planningModel.js';
import Dom from './dom.js';
import icons from './icons.js';
import GraphicEffects from './effects.js';
import Modal from './modal.js';

export default class SpendingScreen {
	onClickCreateCallback = undefined;

	onClickDeleteCallback = undefined;

	onClickSaveCallback = undefined;

	/** @type {Array<Spending>} */
	spendings = undefined;

	/** @type {Array<Category>} */
	categories = undefined;

	/** @type {Map<number, Dom} */
	#drawnReports = new Map();

	/**
	 * 
	 * @param {SpendingReport} defaultSpendingReport 
	 * @param {Array<Category>} categories 
	 */
	constructor(defaultSpendingReport, categories) {
		this.defaultSpendingReport = defaultSpendingReport;
		this.categories = categories;
	}

	init() {
		const main = document.getElementById('main');
		main.appendChild(this.buildCategoryModal(this.categories));
		main.appendChild(this.buildAddSpendingModal());
		main.appendChild(this.buildMonthModal());
		main.appendChild(this.buildNavBar().toHtml());

		const container = this.build(this.spendings);
		this.gfx = new GraphicEffects();
		this.gfx.init(container);
		// this.refresh(this.spendings);
	}

	/**
	 * Draws report on screen. Updates it if already present.
	 * @param {SpendingReport} spendingReport
	 */
	updateSpendingReport(spendingReport) {
		let reportSlice = this.#drawnReports.get(spendingReport);
		if (!reportSlice) {
			reportSlice = new Dom('div').id(spendingReport.id()).cls('slice').append(
				new Dom('h1').text(`${spendingReport} spending`),
			);
			this.screen.append(reportSlice);
		} else {
			reportSlice.clear();
		}

		reportSlice.append(
			this.buildSpendingsReport(spendingReport),
		);

		this.monthDropup.body(
			new Dom('div').cls('accordion-secondary').text(spendingReport),
		);
	}

	build() {
		this.screen =	new Dom('div').cls('container').append(
			new Dom('div').id('spendings-section').cls('section'),
		);

		const main = document.getElementById('main');
		main.appendChild(this.screen.toHtml());

		return this.screen.toHtml();
	}

	buildSlice(spendingReport) {
		const main = document.getElementById('main');
		main.appendChild(this.buildSpendingSummaryModal());
		this.buildSpendingsReport(spendingReport);
	}

	/**
	 * Builds the {Dom} object associated with this report
	 * @param {SpendingReport} spendingReport
	 * @returns {Dom}
	 */
	buildSpendingsReport(spendingReport) {
		const spendingsDom = new Dom('table').id(spendingReport.id).cls('top-round', 'bot-round').append(
			new Dom('thead').append(
				new Dom('tr').append(
					new Dom('th').text(spendingReport),
					new Dom('th').text('Date'),
					new Dom('th').text('Category'),
					new Dom('th').text('Amount'),
					new Dom('th').text('Edit').hideable(this.editMode),
				),
			),
			new Dom('tbody'),
		);
		this.spendingsHtml = spendingsDom.toHtml();

		const spendings = spendingReport.spendings();
		for (let i = 0; i < spendings.length; i += 1) {
			this.appendToSpendingTable(spendings[i]);
		}
		this.appendToSpendingTable(spendingReport.totalAsSpending());

		return spendingsDom;
	}

	buildNavBar() {
		const onClickAdd = this.onClickAddSpending.bind(this);
		const onClickEdit = this.onClickEdit.bind(this);
		const onClickSave = this.onClickSave.bind(this);
		const onClickSummary = this.onClickSummary.bind(this, this.summaryHtml);
		const onClickMonth = this.onClickMonth.bind(this);
		const onClickDelete = undefined; // this.onClickDeleteSpending.bind(this);
		const onClickYear = undefined; // this.onClickDropup.bind(this);

		this.navbar = new Dom('nav').append(
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
				new Dom('button').cls('nav-item', 'nav-trigger').hideable().attr('data-side', 'left').onClick(onClickAdd)
					.append(
						new Dom('img').cls('white-fill').text('Menu').attr('alt', 'Menu').attr('src', icons.menu),
					),
				new Dom('button').cls('dropup', 'nav-item').text(`${this.id} `).onClick(onClickYear).append(
					new Dom('span').text('▲').cls('white-50'),
				),
				new Dom('button').cls('nav-item').text(`${this.month} `).onClick(onClickMonth),
				new Dom('button').cls('nav-item', 'nav-trigger').hideable().attr('data-side', 'right').onClick(onClickAdd)
					.append(
						new Dom('img').cls('white-fill').text('Menu').attr('alt', 'Menu').attr('src', icons.menu),
					),
			),
			new Dom('div').cls('dropup-content', 'top-round').hide(),
		);

		return this.navbar;
	}

	buildMonthModal() {
		this.monthDropup = new Modal('month-dropup')
			.header(
				new Dom('h2').text('Choose spending month'),
			).body().addCancelFooter();
		return this.monthDropup.toHtml();
	}

	buildSpendingSummaryModal(month) {
		this.summaryModal = new Modal('summary').header(
			new Dom('h2').text('Expenses summary'),
		).body(
			new Dom('table').id(`summary-table-${month}`).cls('top-round', 'bot-round').append(
				new Dom('thead').append(
					new Dom('tr').append(
						new Dom('th').text('Category'),
						new Dom('th').text('Spending'),
						new Dom('th').text('Budget'),
						new Dom('th').text('Percent'),
					),
				),
				new Dom('tbody').append(
					...this.buildSummary(),
				),
			),
		).addCancelFooter();

		return this.summaryModal.toHtml();
	}

	buildAddSpendingModal() {
		const onClickCategory = this.onClickCategoryInput.bind(this);
		this.addSpendingModal = new Modal('add-spending').header(
			new Dom('h2').text('Insert Spending'),
		).body(
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
		).footer(
			new Dom('h3').text('Cancel'),
			new Dom('h3').text('Save').onClick(this.onClickModalSave.bind(this)),
		);

		return this.addSpendingModal.toHtml();
	}

	onClickModalSave() {
		const newSpending = {
			id: new Date().getTime(),
			boughtOn: document.getElementById('date-input-field').valueAsDate,
			description: document.getElementById('description-input-field').value,
			price: +document.getElementById('price-input-field').value,
			category: document.getElementById('category-input-field').value,
		};

		this.appendToSpendingTable(newSpending);

		if (this.onClickCreateCallback) {
			this.onClickCreateCallback(newSpending);
		}

		this.addSpendingModal.close();
	}

	/**
	 * 
	 * @param {Array<Category>} forCategories 
	 * @returns {Dom}
	 */
	buildCategoryModal(forCategories) {
		this.categoryModal = new Modal('categories').header(
			new Dom('h2').text('Insert Spending'),
		).body(
			new Dom('div').cls('accordion').append(
				...forCategories.map((category) => new Dom('div').cls('accordion-item').append(
					new Dom('input').id(category.id).cls('accordion-state').attr('type', 'checkbox'),
					new Dom('label').cls('accordion-header').attr('for', category.id).append(
						new Dom('span').text(category.name),
					),
					new Dom('div').cls('accordion-content').append(
						...category.goals.map((goal) => new Dom('div').cls('accordion-secondary').text(goal.name).onClick(this.onClickCategory.bind(this))),
					),
				)),
			),
		).addCancelFooter();

		return this.categoryModal.toHtml();
	}

	refresh(spendings, forMonth) {
		if (!spendings) throw Error('No spendings provided');
		this.spendings = spendings;
		if (!this.spendingSlices.has(forMonth)) {
			this.createSlice(forMonth);
		}
		// TODO replace this with creating a new tbody and replacing old one
		this.spendingsTable.tBodies[0].innerHTML = '';

		this.spendingsTable.tBodies[0].appendChild(this.buildSummary());
	}

	/**
	 * Appends a new row with the current spending to the screen table
	 * @param {Spending} spending Spending to append
	 */
	appendToSpendingTable(spending) {
		const onClickDelete = this.onClickDeleteSpending.bind(this);
		const onSpendingChanged = this.onSpendingChanged.bind(this);
		const boughtOn = spending.boughtOn.toLocaleString('en-GB', { day: 'numeric', month: 'short' });
		const newRow = new Dom('tr').id(spending.id).userData(spending).append(
			new Dom('td').text(spending.description).editable().onKeyUp(onSpendingChanged),
			new Dom('td').text(boughtOn).editable().onKeyUp(onSpendingChanged),
			new Dom('td').text(spending.category).editable().onKeyUp(onSpendingChanged),
			new Dom('td').text(spending.price).editable().onKeyUp(onSpendingChanged),
			new Dom('td').hideable().append(
				new Dom('button').onClick(onClickDelete).append(
					new Dom('img').cls('white-fill').text('Delete').attr('alt', 'Delete').attr('src', icons.delete),
				),
			),
		);

		this.spendingsHtml.tBodies[0].appendChild(newRow.toHtml());
	}

	buildSummary() {
		const spentGoals = [...new Set(this.spendings.map((spending) => spending.category))];
		const goals = this.categories
			.map((category) => category.goals)
			.flat()
			.filter((goal) => spentGoals.filter((spentGoal) => spentGoal === goal.name).length > 0);
		const spendingTotal = this.spendings
			.reduce((accumulator, current) => accumulator + current.price, 0);
		const budgetTotal = goals.reduce((accumulator, current) => accumulator + current.monthly, 0);
		return spentGoals.map((goal) => {
			const spentForGoal = this.spendings
				.reduce((accumulator, spending) => accumulator + (spending.category === goal ? spending.price : 0), 0)
				.toFixed(2);
			const budgetForGoal = goals.find((plannedGoal) => plannedGoal.name === goal).monthly;
			return new Dom('tr').append(
				new Dom('td').text(goal),
				new Dom('td').text(spentForGoal),
				new Dom('td').text(budgetForGoal),
				new Dom('td').text(((100 * spentForGoal) / budgetForGoal).toFixed(2)),
			);
		}).concat(new Dom('tr').append(
			new Dom('td').text('Total'),
			new Dom('td').text(spendingTotal),
			new Dom('td').text(budgetTotal),
			new Dom('td').text(((100 * spendingTotal) / budgetTotal).toFixed(2)),
		));
	}

	// #region GUI handlers

	onClickMonth() {
		this.monthDropup.open();
	}

	async onClickDelete(event) {
		const row = event.target.parentNode.parentNode;
		const key = row.id;

		if (this.onClickDeleteCallback) {
			this.onClickDeleteCallback(key);
		}

		row.parentNode.removeChild(row);
	}
	// #endregion

	// #region onClick handlers
	onSpendingChanged(event) {
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
			spending.boughtOn = cell.valueAsDate;
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

	onClickDeleteSpending(event) {
		const row = event.currentTarget.parentNode.parentNode;
		const tBody = row.parentNode;
		const spending = row.userData;

		// this.spendings.splice(this.spendings.indexOf(spending), 1);
		spending.deleted = true;
		tBody.removeChild(row);
	}

	onClickEdit() {
		this.editButton = document.getElementById('edit-button');
		this.saveButton = document.getElementById('save-button');
		const tableDefs = document.querySelectorAll('[editable="true"]');
		for (let i = 0; i < tableDefs.length; i += 1) {
			tableDefs[i].contentEditable = 'true';
		}

		const elements = document.querySelectorAll('[hideable="true"]');
		for (let i = 0; i < elements.length; i += 1) {
			elements[i].style.display = '';
		}

		this.editMode = true;
		this.editButton.style.display = 'none';
		this.saveButton.style.display = '';
	}

	onClickSave() {
		this.editButton = document.getElementById('edit-button');
		this.saveButton = document.getElementById('save-button');
		const editables = document.querySelectorAll('[editable="true"]');
		for (let i = 0; i < editables.length; i += 1) {
			editables[i].contentEditable = 'false';
		}

		const hideables = document.querySelectorAll('[hideable="true"]');
		for (let i = 0; i < hideables.length; i += 1) {
			hideables[i].style.display = 'none';
		}

		this.editMode = false;
		this.editButton.style.display = '';
		this.saveButton.style.display = 'none';

		const changedSpendings = this.spendings
			.filter((spending) => spending.deleted || spending.edited || spending.created);

		if (this.onClickSaveCallback) {
			this.onClickSaveCallback(changedSpendings);
		}
	}

	onClickSummary() {
		this.summaryModal.open();
	}

	onClickAddSpending() {
		this.onClickCategoryInput();
	}

	onClickCategoryInput() {
		this.categoryModal.open();
	}

	onClickCategory(event) {
		const categoryInput = document.getElementById('category-input-field');
		categoryInput.value = event.target.textContent;
		this.categoryModal.close();
		this.addSpendingModal.open();
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
