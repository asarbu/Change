import Spending from '../persistence/spending/spendingModel.js';
import { Category } from '../persistence/planning/planningModel.js';
import Dom from './dom.js';
import icons from './icons.js';

export default class SpendingScreen {
	onClickCreateCallback = undefined;

	onClickDeleteCallback = undefined;

	onClickSaveCallback = undefined;

	/** @type {Array<Spending>} */
	spendings = undefined;

	/** @type {Array<Category>} */
	categories = undefined;

	constructor(month, spendings, categories) {
		this.month = month;
		this.spendings = spendings;
		this.categories = categories;
	}

	init() {
		this.sketchScreen();
		// this.refresh(this.spendings);
	}

	sketchScreen() {
		this.tab =	new Dom('div').id(this.month).cls('container').append(
			new Dom('div').cls('section').append(
				new Dom('div').cls('slice').append(
					new Dom('h1').text('Monthly spending'),
					this.sketchSpendings(),
				),
			),
		)
			.toHtml();

		const main = document.getElementById('main');
		main.appendChild(this.tab);
		main.appendChild(this.buildAddSpendingModal());
		main.appendChild(this.createCategoryModal());
		main.appendChild(this.buildSpendingSummaryModal());
		main.appendChild(this.buildNavBar().toHtml());

		const loadingTab = document.getElementById('loading_tab');
		if (loadingTab) {
			loadingTab.parentNode.removeChild(loadingTab);
		}
	}

	sketchSpendings() {
		const spendingsDom = new Dom('table').id(this.month).cls('top-round', 'bot-round').append(
			new Dom('thead').append(
				new Dom('tr').append(
					new Dom('th').text(this.month),
					new Dom('th').text('Date'),
					new Dom('th').text('Category'),
					new Dom('th').text('Amount'),
					new Dom('th').text('Edit').hideable(this.editMode),
				),
			),
			new Dom('tbody'),
		);
		this.spendingsHtml = spendingsDom.toHtml();

		for (let i = 0; i < this.spendings.length; i += 1) {
			this.appendToSpendingTable(this.spendings[i]);
		}

		return spendingsDom;
	}

	buildNavBar() {
		const onClickAdd = this.onClickAddSpending.bind(this);
		const onClickEdit = this.onClickEdit.bind(this);
		const onClickSave = this.onClickSave.bind(this);
		const onClickSummary = this.onClickSummary.bind(this, this.summaryHtml);
		const onClickDelete = undefined; // this.onClickDeleteSpending.bind(this);
		const onClickDropup = undefined; // this.onClickDropup.bind(this);

		this.navbar = new Dom('nav').append(
			new Dom('div').cls('nav-header').append(
				new Dom('button').cls('nav-item').hideable().onClick(onClickDelete).append(
					new Dom('img').cls('white-fill').text('Delete').attr('alt', 'Delete').attr('src', icons.delete),
				),
				new Dom('button').id('edit-button').cls('nav-item').onClick(onClickEdit).append(
					new Dom('img').cls('white-fill').text('Edit').attr('alt', 'Edit').attr('src', icons.edit),
				),
				new Dom('button').id('save-button').cls('nav-item').onClick(onClickSave).hide().append(
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
				new Dom('button').cls('nav-item', 'nav-trigger').hideable().attr('data-side', 'left').onClick(onClickAdd).append(
					new Dom('img').cls('white-fill').text('Menu').attr('alt', 'Menu').attr('src', icons.menu),
				),
				new Dom('button').cls('dropup', 'nav-item').text(`${this.id} `).append(
					new Dom('span').text('▲').cls('white-50'),
				),
				new Dom('button').cls('nav-item').text(`${this.month} `).onClick(onClickDropup),
				new Dom('button').cls('nav-item', 'nav-trigger').hideable().attr('data-side', 'right').onClick(onClickAdd).append(
					new Dom('img').cls('white-fill').text('Menu').attr('alt', 'Menu').attr('src', icons.menu),
				),
			),
			new Dom('div').cls('dropup-content', 'top-round').hide(),
		);

		return this.navbar;
	}

	buildSpendingSummaryModal(month) {
		this.summaryHtml = new Dom('div').id('summary-backdrop').cls('modal').append(
			new Dom('div').id('summary-content').cls('modal-content').append(
				new Dom('div').cls('modal-header').append(
					new Dom('h2').text('Expenses summary'),
				),
				new Dom('div').cls('modal-body').append(
					new Dom('table').id(`summary-table-${month}`).append(
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
							new Dom('tr').append(
								new Dom('td').text('Total'),
								new Dom('td').text(this.spendings.reduce((previous, current) => previous + current.price, 0)),
							),
						),
					),
				),
				new Dom('div').cls('modal-footer').append(
					new Dom('h3').text('Cancel'),
				),
			),
		)
			.toHtml();

		// TODO rework this into DOM object
		this.summaryHtml.addEventListener('click', this.onClickCloseModal.bind(this, this.summaryHtml));

		return this.summaryHtml;
	}

	buildAddSpendingModal() {
		const onClickCategory = this.onClickCategoryInput.bind(this);
		this.newSpendingHtml = new Dom('div').id('add-spending-backdrop').cls('modal').append(
			new Dom('div').id('add-spending-content').cls('modal-content').append(
				new Dom('div').cls('modal-header').append(
					new Dom('h2').text('Insert Spending'),
				),
				new Dom('div').cls('modal-body').append(
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
				),
				new Dom('div').cls('modal-footer').append(
					new Dom('h3').text('Cancel'),
					new Dom('h3').text('Save').onClick(this.onClickModalSave.bind(this)),
				),
			),
		)
			.toHtml();

		// TODO rework this into DOM object
		this.newSpendingHtml.addEventListener('click', this.onClickCloseModal.bind(this, this.newSpendingHtml));

		return this.newSpendingHtml;
	}

	onClickModalSave(event) {
		const modalBackdrop = event.target.parentNode.parentNode.parentNode;

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

		this.onClickCloseModal(modalBackdrop);
	}

	createCategoryModal() {
		this.categoryHtml = new Dom('div').id('categories-backdrop').cls('modal').append(
			new Dom('div').id('categories-content').cls('modal-content').append(
				new Dom('div').cls('modal-header').append(
					new Dom('h2').text('Insert Spending'),
				),
				new Dom('div').cls('modal-body', 'accordion').append(
					...this.categories.map((category) => new Dom('div').cls('accordion-item').append(
						new Dom('input').id(category.id).cls('accordion-state').attr('type', 'checkbox'),
						new Dom('label').cls('accordion-header').attr('for', category.id).append(
							new Dom('span').text(category.name),
						),
						new Dom('div').cls('accordion-content').append(
							...category.goals.map((goal) => new Dom('div').cls('accordion-secondary').text(goal.name).onClick(this.onClickCategory.bind(this))),
						),
					)),
				),
			),
		)
			.toHtml();

		// TODO rework this into DOM object
		this.categoryHtml.addEventListener('click', this.onClickCloseModal.bind(this, this.categoryHtml));

		return this.categoryHtml;
	}

	refresh(spendings, forMonth) {
		if (!spendings) throw Error('No spendings provided');
		this.spendings = spendings;
		if (!this.spendingSlices.has(forMonth)) {
			this.createSlice(forMonth);
		}
		// TODO replace this with creating a new tbody and replacing old one
		this.spendingsTable.tBodies[0].innerHTML = '';

		this.totals = new Map();
		for (const spending of this.spendings) {
			const spendingValue = spending.value;
			if (!this.totals.has(spendingValue.category)) {
				this.totals.set(spendingValue.category, 0);
			}
			const newTotal = this.totals.get(spendingValue.category) + parseFloat(spendingValue.price);
			this.totals.set(spendingValue.category, newTotal);
			this.appendToSpendingTable(spending.key, spending.value);
		}
		
		this.buildSummary();
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
		const budget = this.categories.map((category) => category.goals);
		return spentGoals.map((goal) => new Dom('tr').append(
			new Dom('td').text(goal),
			new Dom('td').text(this.spendings.reduce((accumulator, spending) => accumulator + (spending.category === goal ? spending.price : 0), 0).toFixed(2)),
			new Dom('td').text(this.categories.find((category) => category.name === category)),
		));
		/*
		let totalSpent = 0;
		let totalBudget = 0;
		let totalPercent = 0.00;
		let count = 0;

		const fragment = document.createDocumentFragment();
		const tBody = create('tbody');
		fragment.appendChild(tBody);
		for (const [key, value] of this.totals) {
			const planningBudget = this.plannings.get(key);
			const percentage = value / parseFloat(planningBudget);
			this.appendRowToTBody(tBody, [key, value, planningBudget, parseInt(percentage * 100)], { readonly: true, color: getColorForPercentage(percentage) });
			
			totalBudget = totalBudget + parseInt(planningBudget);
			totalSpent = totalSpent + parseInt(value);
			totalPercent = totalPercent + parseInt(percentage * 100);
			count++;
		}
		const options = { useBold: true, readonly: true, index: -1, color: getColorForPercentage(totalPercent/count)};
		this.appendRowToTBody(tBody, ['Total', totalSpent, totalBudget, parseInt(totalPercent/count)], options);
		this.summaryTable.replaceChild(fragment, this.summaryTable.tBodies[0]);*/
	}

	// #region GUI handlers
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
		this.onClickOpenModal(document.getElementById('summary-backdrop'));
	}

	onClickAddSpending() {
		this.onClickCategoryInput();
	}

	onClickCategoryInput() {
		this.onClickOpenModal(document.getElementById('categories-backdrop'));
	}

	onClickCategory(event) {
		const categoryInput = document.getElementById('category-input-field');
		const categoryModal = document.getElementById('categories-backdrop');
		categoryInput.value = event.target.textContent;
		this.onClickCloseModal(categoryModal);
		this.onClickOpenModal(document.getElementById('add-spending-backdrop'));
		this.focusInputField('price-input-field');
	}

	onClickOpenModal(modalBackdrop) {
		const modalContent = modalBackdrop.firstChild;
		modalBackdrop.classList.add('show-modal-backdrop');
		modalContent.classList.add('show-modal-content');
	}

	focusInputField(withId) {
		/* Focus cannot be applied to invisible elements.
		 * We need to wait for elemnt to be focusable.
		 * We also cannot use display: none -> display: visible because that cannot be animated 
		 */
		requestAnimationFrame(() => {
			const priceInputField = document.getElementById(withId);
			priceInputField.focus();
			if (document.activeElement !== priceInputField) {
				requestAnimationFrame(this.focusInputField.bind(this, withId));
			}
		});
	}

	onClickCloseModal(modalBackdrop, event) {
		// Force close if it function not triggered by an event (triggered by code)
		if (!event || event.target === modalBackdrop) {
			modalBackdrop.firstChild.classList.remove('show-modal-content');
			modalBackdrop.classList.remove('show-modal-backdrop');
		}
	}
	// #endregion
}
