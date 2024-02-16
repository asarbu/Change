class SpendingTab {
	onClickCreateSpending = undefined;
	onClickDeleteSpending = undefined;
	onClickSaveSpendings = undefined;
	spendings = undefined;
	constructor(month, spendings, plannings, categories) {
		this.month = month;
		this.spendings = spendings;
		this.plannings = plannings;
		this.categories = categories;
	}

	init() {
		//console.log("Init spending tab")
		this.createTab();
		this.refresh(this.spendings);
	}

	createTab() {
		const tab = create("div", {id: this.month, classes: ["container"]});
		this.tab = tab;
		const section = create("div", {clsses: ["section", "no-pad-bot"]});
		const container = create("div", {classes: ["container"]});
		//const h1 = create("h1", {classes: ["header", "center", "red-text"], textContent: monthName});
		const row = create("div", {classes: ["row", "center"]});
		const h5 = create("h5", {classes: ["header", "col", "s12", "light"], textContent: "Monthly spendings"});
		const li = create("li", {classes: ["tab"]});
		const a = create("a");
		const h6 = create("h6", {textContent: this.month});
		const buttonRow = create("div", {classes:["row", "center"]});
		const editBtn = createImageButton("EditBtn", "", ["waves-effect", "red", "waves-light", "btn"],	icons.edit);
		const saveBtn = createImageButton("SaveBtn", "", ["waves-effect", "red", "waves-light", "btn"],	icons.save);

		a.setAttribute("href", "#" + this.month);
		
		//container.appendChild(h1);
		row.appendChild(h5);
		container.appendChild(row);
		section.appendChild(container);
		tab.appendChild(section);
		a.appendChild(h6);
		li.appendChild(a);
		buttonRow.appendChild(editBtn);
		buttonRow.appendChild(saveBtn);
	
		const table = this.createSpendingsTable();
		//TODO move add spending fabs outside of this tab?
		const fabs = this.createFloatingActionButtons();
		const newSpendingModal = this.createNewSpendingModal();
		const summaryModal = this.createSummaryModal();
		const categoryModal = this.createCategoryModal();

		editBtn.addEventListener("click", this.onClickEdit.bind(this));
		saveBtn.addEventListener("click", this.onClickSave.bind(this));
		saveBtn.style.display = "none";

		this.spendingsTable = table;
		this.summaryModal = summaryModal;
		this.categoryModal = categoryModal;
		this.editBtn = editBtn;
		this.saveBtn = saveBtn;

		tab.appendChild(table);
		tab.appendChild(summaryModal);
		tab.appendChild(categoryModal);
		tab.appendChild(newSpendingModal);
		tab.appendChild(fabs);
		tab.appendChild(buttonRow);

		const main = document.getElementById("main");
		main.appendChild(tab);
		document.getElementById("tabs").appendChild(li);
		
		const loadingTab = document.getElementById("loading_tab");
		if(loadingTab) {
			loadingTab.parentNode.removeChild(loadingTab);
		}
	}
	
	createSpendingsTable() {
		const table = create("table", {id: this.month, classes: ["striped", "row", "table-content"]});
		const thead = create("thead");
		const tr = create("tr");
		const thMonthName = create("th", {textContent: this.month});
		const thDate = create("th", {textContent: "Date"});
		const thCategory = create("th", {textContent: "Category"});
		const thAmount = create("th", {textContent: "Amount"});
		const thEdit = create("th", {textContent: "Edit"});
		const tBody = create("tbody");

		thEdit.setAttribute("hideable", true);
		thEdit.style.display = "none";

		tr.appendChild(thMonthName);
		tr.appendChild(thDate);
		tr.appendChild(thCategory);
		tr.appendChild(thAmount);
		tr.appendChild(thEdit);
		thead.appendChild(tr);
		table.appendChild(thead);
		table.appendChild(tBody);
	
		return table;
	}

	createSummaryModal() {
		const modal = create("div", {id: "summary-modal-" + this.month, classes: ["modal", "bottom-sheet"]});
		const modalContent = create("div", {classes: ["modal-content"]});
		const modalFooter = create("div", {classes: ["modal-footer"]});
		const h4 = create("h4", {textContent: "Expenses vs. planning summary"});
		const table = create("table", {id: "summary-table-" + this.month, classes: ["striped", "row", "table-content"]});
		const tHead = create("thead");
		const tr = create("tr");
		const thCategory = create("th", {textContent: "Category"});
		const thSpending = create("th", {textContent: "Spending"});
		const thBudget = create("th", {textContent: "Budget"});
		const thPercentage = create("th", {textContent: "Percent"});
		const tBody = create("tbody");
		const a = create("a", {textContent: "Close", classes: ["modal-close", "waves-effect", "waves-green", "btn-flat"]});

		a.setAttribute("href", "#!");

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

	createFloatingActionButtons() {
		const fabs = create("div");
		const leftAddDiv = create("div", {classes: ["fixed-action-btn-left"]});
		const rightAddDiv = create("div", {classes: ["fixed-action-btn"]});
		const summaryDiv = create("div", {classes: ["fixed-action-btn-center"]});

		const leftAddBtn = createImageButton("Add Spending", "#new-spending-modal-" + this.month,
			["btn-floating", "btn-large", "waves-effect", "waves-light", "red", "modal-trigger"], 
			icons.add);
		
		const rightAddBtn = createImageButton("Add Spending", "#new-spending-modal-" + this.month,
			["btn-floating", "btn-large", "waves-effect", "waves-light", "red", "modal-trigger"], 
			icons.add);
	
		const summaryBtn = createImageButton("Add Spending", "#summary-modal-" + this.month,
			["btn-floating", "btn-large", "waves-effect", "waves-light", "red", "modal-trigger"], 
			icons.summary);

		leftAddDiv.appendChild(leftAddBtn);
		rightAddDiv.appendChild(rightAddBtn);
		summaryDiv.appendChild(summaryBtn);

		fabs.appendChild(leftAddDiv);
		fabs.appendChild(summaryDiv);
		fabs.appendChild(rightAddDiv);

		var elems = [leftAddDiv, rightAddDiv, summaryDiv];
		M.FloatingActionButton.init(elems, {});

		return fabs;
	}

	createNewSpendingModal() {
		const modal = create("div", {id: "new-spending-modal-" + this.month, classes: ["modal", "bottom-sheet"]});
		const modalContent = create("div", {classes: ["modal-content"]});
		const h4 = create("h4", {textContent: "New Spending"});
		const card = create("div", {classes: ["card"]});
		const cardContent = create("div", {classes: ["card-content", "container"]});
		const modalFooter = create("div", {classes: ["modal-footer"]});
		const saveButton = create("button", {classes: ["modal-close", "waves-effect", "waves-green", "btn-flat", "save-modal"]});
		saveButton.textContent = "Save";
		saveButton.addEventListener("click", this.onClickModalSave.bind(this), false);

		const boughtInputField = create("div", {classes: ["input-field"]});
		const boughtInput = create("input", {id: "bought_date" + this.month, type: "text", classes:["datepicker", "valid"]});
		const boughtLabel = create("label", {textContent: "Bought date:", classes:["active"]});
		var options = { year: 'numeric', month: 'short', day: 'numeric' };
		var today = new Date();
		boughtInput.value = today.toLocaleDateString("en-US", options);
		boughtLabel.setAttribute("for", "bought_date" + this.month);

		const descriptionInputField = create("div", {classes: ["input-field"]});
		const descriptionInput = create("input", {id: "description" + this.month, type: "text", classes:["validate"]});
		const descriptionLabel = create("label", {textContent: "Description:"});
		descriptionLabel.setAttribute("for", "description" + this.month);

		const categoryInputField = create("div", {classes: ["input-field", "modal-trigger"]});
		const categoryInput = create("input", {id: "category"+ this.month, type: "text", classes:["validate"]});
		const expenseTypeInput = create("input", {id: "expense_type"+ this.month, type: "hidden"});
		const categoryLabel = create("label", {textContent: "Category:"});
		categoryInputField.setAttribute("href", "#category-modal-" + this.month);
		categoryLabel.setAttribute("for",  "category"+ this.month);

		const priceInputField = create("div", {classes: ["input-field"]});
		const priceInput = create("input", {id: "price"+ this.month, type: "number", step: "0.01", classes:["validate"]});
		const priceLabel = create("label", {textContent: "Price:"});
		priceLabel.setAttribute("for", "price"+ this.month);

		boughtInputField.appendChild(boughtInput);
		boughtInputField.appendChild(boughtLabel);
		descriptionInputField.appendChild(descriptionInput);
		descriptionInputField.appendChild(descriptionLabel);
		categoryInputField.appendChild(categoryInput);
		categoryInputField.appendChild(expenseTypeInput);
		categoryInputField.appendChild(categoryLabel);
		priceInputField.appendChild(priceInput);
		priceInputField.appendChild(priceLabel);
		cardContent.appendChild(boughtInputField);
		cardContent.appendChild(descriptionInputField);
		cardContent.appendChild(categoryInputField);
		cardContent.appendChild(priceInputField);
		card.appendChild(cardContent);
		modalContent.appendChild(h4);
		modalContent.appendChild(card);
		modalFooter.appendChild(saveButton);
		modal.appendChild(modalContent);
		modal.appendChild(modalFooter);

		this.expenseTypeInput = expenseTypeInput;
		this.boughtInput = boughtInput;
		this.descriptionInput = descriptionInput;
		this.priceInput = priceInput;
		this.categoryInput = categoryInput;
		
		return modal;
	}

	createCategoryModal() {
		const categoryModal = create("div", { id: "category-modal-" + this.month, classes: ["modal", "bottom-sheet"]});
		const modalContent = create("div", { classes: ["modal-content"]});
		const modalFooter = create("div", { classes: ["modal-footer"]});
		const a = create("a", {id: "categoryModalClose", textContent: "Close", href: "#!", classes: ["modal-close", "waves-effect", "waves-green", "btn-flat"]});
		const categoryList = create("ul", {id: "categoryList", classes: ["collapsible", "popout"]});

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
		this.spendingsTable.tBodies[0].innerHTML = "";
		
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
		row.setAttribute("db_id", key);
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
				dataCell.setAttribute("editable", true);
				
			}
			if (options.useBold == true) {
				dataCell.style.fontWeight = "bold";
			}
		}
	
		if (options.color) {
			dataCell.style.color = options.color;
		}
	
		if (options.deletable) {
			const buttonsCell = row.insertCell(-1);
			const btn = createImageButton("Delete","", ["waves-effect", "waves-light", "red", "btn-small"], icons.delete);
			btn.addEventListener("click", this.onClickDelete.bind(this), false);
			
			buttonsCell.appendChild(btn);
			buttonsCell.setAttribute("hideable", "true");
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
			const li = create("li");
			const header = create("div", {textContent: key, classes: ["collapsible-header"]});
			const body = create("div", {classes: ["collapsible-body"]});
			const span = create("span");
			const ul = create("ul", {classes: ["card", "collection"]});

			for (const data of value) {
				const li = create("li", {textContent: data, classes: ["collection-item", "modal-close"]});
				li.addEventListener("click", this.onClickCategory.bind(this), false);
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
		const tBody = create("tbody");
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
		this.appendRowToTBody(tBody, ["Total", totalSpent, totalBudget, parseInt(totalPercent/count)], options);
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
		const key = row.getAttribute("db_id");
		
		if(this.onClickDeleteSpending) {
			this.onClickDeleteSpending(key);
		}

		row.parentNode.removeChild(row);
	}

	onClickEdit() {
		this.saveBtn.style.display = "";
		this.editBtn.style.display = "none";

		const tableDefs = document.querySelectorAll('td[editable="true"]')
		for (var i = 0; i < tableDefs.length; ++i) {
			tableDefs[i].contentEditable = "true";
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
		this.editBtn.style.display = "";
		this.saveBtn.style.display = "none";
		
		const tableDefs = document.querySelectorAll('td[editable="true"]')
		for (var i = 0; i < tableDefs.length; ++i) {
			tableDefs[i].contentEditable = "false";
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