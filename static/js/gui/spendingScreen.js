import Spending from '../persistence/spending/spendingModel.js';
import Dom from './dom.js';
import icons from './icons.js';

export default class SpendingScreen {
	onClickCreateCallback = undefined;

	onClickDeleteCallback = undefined;

	onClickSaveCallback = undefined;

	/** @type {Array<Spending>} */
	spendings = undefined;

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

		const newSpendingModal = this.buildInsertSpendingModal();
		// const summaryModal = this.sketchSpendingSummary();
		// const categoryModal = this.createCategoryModal();

		// this.summaryModal = summaryModal;
		// this.categoryModal = categoryModal;

		const main = document.getElementById('main');
		main.appendChild(this.tab);
		main.appendChild(this.buildInsertSpendingModal());
		main.appendChild(this.sketchNavBar().toHtml());

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

	sketchNavBar() {
		const onClickAdd = this.onClickOpenModal.bind(this, this.newSpendingHtml);
		const onClickEdit = this.onClickEdit.bind(this);
		const onClickSave = this.onClickSave.bind(this);
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

	onClickOpenModal(modalBackdrop, event) {
		// Get the modalBackdrop
		const modalContent = modalBackdrop.firstChild;
		modalBackdrop.classList.add('show-modal-backdrop');
		modalContent.classList.add('show-modal-content');
		// TODO focus on description when opening modal
		// await new Promise(r => setTimeout(r, 100));
		this.focusInputField('price-input-field');
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

	sketchSpendingSummary() {
		const modal = create('div', {id: 'summary-modal-' + this.month, classes: ['modal', 'bottom-sheet']});
		const modalContent = create('div', {classes: ['modal-content']});
		const modalFooter = create('div', {classes: ['modal-footer']});
		const h4 = create('h4', {textContent: 'Expenses vs. planning'});
		const table = create('table', {id: 'summary-table-' + this.month, classes: ['striped', 'row', 'table-content']});
		const tHead = create('thead');
		const tr = create('tr');
		const thCategory = create('th', {textContent: 'Category'});
		const thSpending = create('th', {textContent: 'Spending'});
		const thBudget = create('th', {textContent: 'Budget'});
		const thPercentage = create('th', {textContent: 'Percent'});
		const tBody = create('tbody');
		const a = create('a', {textContent: 'Close', classes: ['modal-close', 'waves-effect', 'waves-green', 'btn-flat']});

		a.setAttribute('href', '#!');

		tr.appendChild(thCategory);
		tr.appendChild(thSpending);
		tr.appendChild(thBudget);
		tr.appendChild(thPercentage);
		tHead.appendChild(tr);
		table.appendChild(tHead);
		table.appendChild(tBody);
		modalContent.appendChild(h4);
		modalContent.appendChild(table);
		modalFooter.appendChild(a);
		modal.appendChild(modalContent);
		modal.appendChild(modalFooter);

		this.summaryTable = table;

		return modal;
	}

	buildInsertSpendingModal() {
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
						new Dom('input').id('description-input-field').type('text').attr('required', ''),
						new Dom('label').text('Description: '),
					),
					new Dom('div').cls('input-field').append(
						new Dom('input').id('category-input-field').type('text').attr('required', ''),
						new Dom('label').text('Category: '),
					),
					new Dom('div').cls('input-field').append(
						new Dom('input').id('price-input-field').type('text').attr('required', undefined),
						new Dom('label').text('Price: '),
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
		const date = document.getElementById('date-input-field').valueAsDate;
		const description = document.getElementById('description-input-field').value;
		const price = document.getElementById('price-input-field').value;
		const category = document.getElementById('category-input-field').value;

		const newSpending = {
			id: new Date().getTime(),
			boughtOn: date,
			description,
			price,
			category,
		};

		this.appendToSpendingTable(newSpending);

		if (this.onClickCreateCallback) {
			this.onClickCreateCallback(newSpending);
		}

		this.onClickCloseModal(modalBackdrop);
	}

	createCategoryModal() {
		const categoryModal = create('div', { id: 'category-modal-' + this.month, classes: ['modal', 'bottom-sheet']});
		const modalContent = create('div', { classes: ['modal-content']});
		const modalFooter = create('div', { classes: ['modal-footer']});
		const a = create('a', {id: 'categoryModalClose', textContent: 'Close', href: '#!', classes: ['modal-close', 'waves-effect', 'waves-green', 'btn-flat']});
		const categoryList = create('ul', {id: 'categoryList', classes: ['collapsible', 'popout']});

		modalFooter.appendChild(a);
		modalContent.appendChild(categoryList);
		categoryModal.appendChild(modalContent);
		categoryModal.appendChild(modalFooter);

		this.categoryList = categoryList;
		this.drawCategoryList();
		return categoryModal;
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
		
		this.processSummary();
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

	async drawCategoryList() {
		for (const [key, value] of this.categories.entries()) {
			const li = create('li');
			const header = create('div', {textContent: key, classes: ['collapsible-header']});
			const body = create('div', {classes: ['collapsible-body']});
			const span = create('span');
			const ul = create('ul', {classes: ['card', 'collection']});

			for (const data of value) {
				const li = create('li', {textContent: data, classes: ['collection-item', 'modal-close']});
				li.addEventListener('click', this.onClickCategory.bind(this), false);
				ul.appendChild(li);
			}

			span.appendChild(ul);
			body.appendChild(span);
			li.appendChild(header);
			li.appendChild(body);
			this.categoryList.appendChild(li);
		}
	}

	processSummary() {
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
		this.summaryTable.replaceChild(fragment, this.summaryTable.tBodies[0]);
	}
	
	//#region GUI handlers
	onClickCategory(event) {
		this.categoryInput.value = event.target.innerText;
		this.categoryInput.classList.add('valid');
		this.expenseTypeInput.value = (event.target.parentNode.parentNode.parentNode.parentNode.firstElementChild.innerText);
	}

	async onClickDelete(event) {
		const row = event.target.parentNode.parentNode;
		const key = row.id;

		if (this.onClickDeleteCallback) {
			this.onClickDeleteCallback(key);
		}

		row.parentNode.removeChild(row);
	}

	//#endregion

	// #region onClick handlers
	onSpendingChanged(event) {
		const cell = event.currentTarget;
		const row = cell.parentNode;
		const table = row.parentNode.parentNode;

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
			spending.price = cell.textContent;
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

	onClickEdit(event) {
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

	// # endregion
}
