import Dom from "../../common/gui/dom.js";
import icons from "../../common/gui/icons.js";
import Modal from "../../common/gui/modal.js";
import TableDom from "../../common/gui/tableDom.js";
import Spending from "../model/spending.js";
import SpendingReport from "../model/spendingReport.js";
import SpendingSubmitModal from "./spendingSubmitModal.js";

export default class SpendingCategoryTable extends TableDom {
	/** @type {SpendingReport} */
	#spendingReport = undefined;

	/** @type {Array<import("./spendingTableColumn.js").SpendingTableColumn>} */
	#visibleColumns = undefined;

	#editMode = false;

	/** @type {Array<Spending>} */
	#spendings = [];

	/** @type {Array<string>} */
	#availableCategories = undefined;

	/** @type {string} */
	#name = undefined;

	constructor(name, spendings, availableCategories, visibleColumns) {
		super();
		this.#name = name;
		this.#visibleColumns = visibleColumns;
		this.#spendings = spendings;
		this.#availableCategories = availableCategories;
	}

	refresh() {
		if(!this.#spendings || this.#spendings.length === 0 || !this.#visibleColumns || this.#visibleColumns.length === 0) {
			return this.clear();
		}
		const totalSpending = new Spending(`total-${this.#name}`, '-', '-', '-', 'Total', this.#spendings.reduce((acc, spending) => acc + spending.price, 0));

		this.id(`table-${this.#name}`)
			.thead(
				new Dom('tr').append(
					...this.#visibleColumns.map(col => new Dom('th').cls(col.size).text(col)),
					new Dom('th').cls('narrow').hideable(this.#editMode).append(
						new Dom('button').onClick(this.onClickDelete).append(
							new Dom('img').cls('white-fill').text('Delete').attr('alt', 'Delete').attr('src', icons.delete),
						),
					),
				),
			).tbody(
				...this.#spendings.map(
					(spending) => new Dom('tr').id(spending.id).userData(spending).append(
						...this.#visibleColumns.map(col => new Dom('td').text(spending[col.type]).onClick(this.onClickedSpending.bind(this, spending))),
						new Dom('td').hideable(this.#editMode).append(
							new Dom('button').onClick(this.onClickDelete.bind(spending)).append(
								new Dom('img').cls('white-fill').text('Delete').attr('alt', 'Delete').attr('src', icons.delete),
							),
						),
					)),
			).tfoot(
				new Dom('tr').append(
					...this.#visibleColumns.map((col) => new Dom('td').text(totalSpending[col.type])),
					new Dom('td').hideable(this.#editMode),
				),
			).userData(this.#spendingReport);
		return this;
	}

	onClickDelete = (spending) => {
		Modal.areYouSureModal(
			'delete-spending-modal',
			'Are you sure you want to delete this spending?',
			() => {
				spending.deleted = true;
				this.#spendings.splice(this.#spendings.indexOf(spending), 1);
				this.refresh();
			},
		).open();
		return;
	};

	/**
	 * 
	 * @param {Spending} spending 
	 * @returns 
	 */
	onClickedSpending = (spending) => {
		if (!this.#editMode) return;
		
		new SpendingSubmitModal(this.#availableCategories).editMode(spending).onEditSpending((editedSpending) => {
			spending.category = editedSpending.category;
			spending.description = editedSpending.description;
			spending.price = editedSpending.price;
			spending.spentOn = editedSpending.spentOn;
			spending.edited = true;
		}).open();
	}

	editMode() {
		this.#editMode = true;
		
		const elements = this.toHtml().querySelectorAll('[hideable="true"]');
		for (let i = 0; i < elements.length; i += 1) {
			elements[i].style.display = '';
		}
	}

	normalMode() {
		this.#editMode = false;

		const hideables = this.toHtml().querySelectorAll('[hideable="true"]');
		for (let i = 0; i < hideables.length; i += 1) {
			hideables[i].style.display = 'none';
		}

	}
}
