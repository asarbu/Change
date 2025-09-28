import Dom from "../../common/gui/dom.js";
import icons from "../../common/gui/icons.js";
import Modal from "../../common/gui/modal.js";
import TableDom from "../../common/gui/tableDom.js";
import { Category } from "../../planning/model/planningModel.js";
import Spending from "../model/spending.js";
import SpendingSubmitModal from "./spendingSubmitModal.js";

export default class SpendingCategoryTable extends TableDom {
	/** @type {Array<import("./spendingTableColumn.js").SpendingTableColumn>} */
	#visibleColumns = undefined;

	/** @type {boolean} */
	#editMode = false;

	/** @type {Array<Spending>} */
	#spendings = [];

	/** @type {Array<string>} */
	#availableCategories = undefined;

	/** @type {number} */
	#month = undefined;

	/**
	 * 
	 * @param {number} month 
	 * @param {Array<Spending>} spendings 
	 * @param {Array<Category>} availableCategories 
	 * @param {Array<string>} visibleColumns 
	 */
	constructor(visibleColumns) {
		super();
		this.#visibleColumns = visibleColumns;
	}

	refresh(month = this.#month, spendings = this.#spendings, availableCategories = this.#availableCategories) {
		if(!this.#visibleColumns || this.#visibleColumns.length === 0) {
			this.thead();
			return this;
		}
		
		this.#spendings = spendings || [];
		this.#availableCategories = availableCategories;

		const totalSpending = new Spending(`total-${month}`, '-', '-', '-', 'Total', spendings.reduce((acc, spending) => acc + spending.price, 0));

		this.id(`table-${month}`)
			.thead(
				new Dom('tr').append(
					...this.#visibleColumns.map(col => new Dom('th').cls(col.size).text(col)),
					new Dom('th').cls('narrow').hideable(this.#editMode).append(
						new Dom('button').onClick(this.onClickedDeleteTable).append(
							new Dom('img').cls('white-fill').text('Delete').attr('alt', 'Delete').attr('src', icons.delete),
						),
					),
				),
			).tbody(
				...this.#spendings.map(
					(spending) => new Dom('tr').id(spending.id).userData(spending).append(
						...this.#visibleColumns.map(col => new Dom('td').text(spending[col.type]).onClick(this.onClickedSpending.bind(this, spending))),
						new Dom('td').hideable(this.#editMode).append(
							new Dom('button').onClick(this.onClickedDelete.bind(this, spending)).append(
								new Dom('img').cls('white-fill').text('Delete').attr('alt', 'Delete').attr('src', icons.delete),
							),
						),
					)),
			).tfoot(
				new Dom('tr').append(
					...this.#visibleColumns.map((col) => new Dom('td').text(totalSpending[col.type])),
					new Dom('td').hideable(this.#editMode),
				),
			);
		return this;
	}

	onClickedDeleteTable = () => {
		return Modal.areYouSureModal(
			'delete-spending-modal',
			'Are you sure you want to delete this month\'s spendings?',
			() => {
				this.#spendings.length = 0;
				this.refresh();
			},
		).open();
	}

	onClickedDelete = (spending) => {
		return Modal.areYouSureModal(
			'delete-spending-modal',
			'Are you sure you want to delete this spending?',
			() => {
				this.#spendings.splice(this.#spendings.indexOf(spending), 1);
				this.refresh();
			},
		).open();
	};

	/**
	 * 
	 * @param {Spending} spending 
	 * @returns 
	 */
	onClickedSpending = (spending) => {
		if (!this.#editMode) return;
		
		new SpendingSubmitModal(this.#availableCategories)
			.editMode(spending)
			.onSubmit((editedSpending) => {
				spending.category = editedSpending.category;
				spending.description = editedSpending.description;
				spending.price = editedSpending.price;
				spending.spentOn = editedSpending.spentOn;
				this.refresh();
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
