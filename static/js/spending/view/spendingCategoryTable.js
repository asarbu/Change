import Dom from "../../common/gui/dom.js";
import icons from "../../common/gui/icons.js";
import TableDom from "../../common/gui/tableDom.js";
import SpendingReport from "../model/spendingReport.js";

export default class SpendingCategoryTable extends TableDom {
	/** @type {SpendingReport} */
	#spendingReport = undefined;

	/** @type {Array<import("./spendingTableColumn.js").SpendingTableColumn>} */
	#visibleColumns = undefined;

	#editMode = false;

	#spendings = [];

	constructor(name, spendingReport, visibleColumns) {
		super();
		this.#spendingReport = spendingReport;
		this.#visibleColumns = visibleColumns;
		this.#spendings = this.#spendingReport.spendings();
	}

	refresh() {
		if(!this.#spendings || this.#spendings.length === 0 || !this.#visibleColumns || this.#visibleColumns.length === 0) {
			return this.clear();
		}
		const totalSpending = this.#spendingReport.totalAsSpending();

		this.id(`table-${this.#spendingReport.month()}`)
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
						...this.#visibleColumns.map(col => new Dom('td').text(spending[col.type]).onClick(this.onClickedSpending)),
						new Dom('td').hideable(this.#editMode).append(
							new Dom('button').onClick(this.onClickDelete).append(
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
		return;
	};

	onClickedSpending = (spending) => {
		return;
	}

	editMode() {
		this.#editMode = true;
	}

	normalMode() {
		this.#editMode = false;
	}
}
