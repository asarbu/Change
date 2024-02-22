import Dom from './dom.js';
import icons from './icons.js';

export default class SpendingScreen {
	onClickCreateSpending = undefined;

	onClickDeleteSpending = undefined;

	onClickSaveSpendings = undefined;

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

		const newSpendingModal = this.sketchInsertSpending();
		// const summaryModal = this.sketchSpendingSummary();
		// const categoryModal = this.createCategoryModal();

		// this.summaryModal = summaryModal;
		// this.categoryModal = categoryModal;

		const main = document.getElementById('main');
		main.appendChild(this.tab);
		main.appendChild(this.sketchNavBar().toHtml());

		const loadingTab = document.getElementById('loading_tab');
		if (loadingTab) {
			loadingTab.parentNode.removeChild(loadingTab);
		}
	}

	sketchSpendings() {
		this.spendingsHtml = new Dom('table').id(this.month).cls('top-round', 'bot-round').append(
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

		return this.spendingsHtml;
	}

	sketchNavBar() {
		const onClickAdd = undefined; // this.onClickAddSpending.bind(this);
		const onClickEdit = undefined; // this.onClickEditSpending.bind(this);
		const onClickDelete = undefined; // this.onClickDeleteSpending.bind(this);
		const onClickDropup = undefined; // this.onClickDropup.bind(this);

		this.navbar = new Dom('nav').append(
			new Dom('div').cls('nav-header').append(
				new Dom('button').cls('nav-item').hideable().onClick(onClickAdd).append(
					new Dom('img').cls('white-fill').text('Add').attr('alt', 'Add').attr('src', icons.add_file),
				),
				new Dom('button').cls('nav-item').onClick(onClickEdit).append(
					new Dom('img').cls('white-fill').text('Edit').attr('alt', 'Edit').attr('src', icons.edit),
				),
				new Dom('button').cls('nav-item').hideable().onClick(onClickDelete).append(
					new Dom('img').cls('white-fill').text('Delete').attr('alt', 'Delete').attr('src', icons.delete),
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

	sketchInsertSpending() {
		this.newSpendingHtml = new Dom('div').cls('modal').append(
			new Dom('div').cls('modal-content').append(
				new Dom('div').cls('modal-header').append(
					new Dom('h2').text('Insert Spending'),
				),
				new Dom('div').cls('modal-body').append(
					new Dom('div').cls('input-field').append(
						new Dom('input').type('date').attr('required', undefined),
						new Dom('label').text('Date: '),
					),
					new Dom('div').cls('input-field').append(
						new Dom('input').type('text').attr('required', undefined),
						new Dom('label').text('Description: '),
					),
					new Dom('div').cls('input-field').append(
						new Dom('input').type('text').attr('required', undefined),
						new Dom('label').text('Category: '),
					),
					new Dom('div').cls('input-field').append(
						new Dom('input').type('text').attr('required', undefined),
						new Dom('label').text('Price: '),
					),
				),
				new Dom('div').cls('modal-footer').append(
					new Dom('h3').text('Cancel'),
					new Dom('h3').text('Save'),
				),
			),
		)
			.toHtml();

		return this.newSpendingHtml;
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

	refresh(spendings) {
        //console.log("Refreshing spendings...", spendings);
		if(!spendings) console.trace();
		this.spendings = spendings;
		//TODO replace this with creating a new tbody and replacing old one
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

    appendToSpendingTable(key, value) {
		// console.log("Append to spending table", key, value)
		var row = this.appendRowToTable(this.spendingsTable, 
			[value.description, value.boughtDate, value.category, value.price], 
			{ hidden:true, deletable:true, readonly: true });
		row.setAttribute('db_id', key);
	}

	appendRowToTBody(tbody, data, options) {
		var index = -1;
		if (options.index) {
			index = options.index;
		}

		const row = tbody.insertRow(index);
		var dataCell;
	
		for (const dataCtn of data) {
			dataCell = row.insertCell(-1);
			dataCell.textContent = dataCtn;
			if (!options.readonly) {
				dataCell.setAttribute('editable', true);
				
			}
			if (options.useBold == true) {
				dataCell.style.fontWeight = 'bold';
			}
		}
	
		if (options.color) {
			dataCell.style.color = options.color;
		}
	
		if (options.deletable) {
			const buttonsCell = row.insertCell(-1);
			const btn = createImageButton('Delete','', ['waves-effect', 'waves-light', 'red', 'btn-small'], icons.delete);
			btn.addEventListener('click', this.onClickDelete.bind(this), false);
			
			buttonsCell.appendChild(btn);
			buttonsCell.setAttribute('hideable', 'true');
			if (options.hidden) {
				buttonsCell.style.display = 'none';
			}
		}
		return row;
	}

	appendRowToTable(table, data, options) {
		return this.appendRowToTBody(table.tBodies[0], data, options);
	}

	appendToSummaryTable(data, options) {
		this.appendRowToTable(this.summaryTable, data, options);
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
		M.updateTextFields();
	}

	onClickModalSave(event) {
		const boughtDate = this.boughtInput.value;
		const newSpending = {
			type: this.expenseTypeInput.value,
			boughtDate: boughtDate,
			month: boughtDate.substring(0, 3),
			description: this.descriptionInput.value,
			category: this.categoryInput.value,
			price: this.priceInput.value
		}

		const creationDateTime = new Date().toISOString();
		this.appendToSpendingTable(creationDateTime, newSpending);

		if(this.onClickCreateSpending) {
			this.onClickCreateSpending(newSpending,	creationDateTime);
		}
	}

	async onClickDelete(event) {
		const row = event.target.parentNode.parentNode;
		const key = row.getAttribute('db_id');
		
		if(this.onClickDeleteSpending) {
			this.onClickDeleteSpending(key);
		}

		row.parentNode.removeChild(row);
	}

	onClickEdit() {
		this.saveBtn.style.display = '';
		this.editBtn.style.display = 'none';

		const tableDefs = document.querySelectorAll('td[editable="true"]')
		for (var i = 0; i < tableDefs.length; ++i) {
			tableDefs[i].contentEditable = 'true';
		}

		const ths = document.querySelectorAll('th[hideable="true"]')
		for (var i = 0; i < ths.length; ++i) {
			ths[i].style.display = '';
		}

		const trs = document.querySelectorAll('td[hideable="true"]')
		for (var i = 0; i < trs.length; ++i) {
			trs[i].style.display = '';
		}
	}

	onClickSave() {
		this.editBtn.style.display = '';
		this.saveBtn.style.display = 'none';
		
		const tableDefs = document.querySelectorAll('td[editable="true"]')
		for (var i = 0; i < tableDefs.length; ++i) {
			tableDefs[i].contentEditable = 'false';
		}

		const ths = document.querySelectorAll('th[hideable="true"]')
		for (var i = 0; i < ths.length; ++i) {
			ths[i].style.display = 'none';
		}

		const trs = document.querySelectorAll('td[hideable="true"]')
		for (var i = 0; i < trs.length; ++i) {
			trs[i].style.display = 'none';
		}
		
		if(this.onClickSaveSpendings) {
			this.onClickSaveSpendings(this.month);
		}
	}

	//#endregion
}