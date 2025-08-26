import Dom from "../../common/gui/dom.js";
import icons from "../../common/gui/icons.js";
import TableDom from "../../common/gui/tableDom.js";
import SpendingReport from "../model/spendingReport.js";

export default class SpendingCategoryTable extends TableDom {
	/** @type {SpendingReport} */
	#spendingReport = undefined;

	/** @type {Array<string>} */
	#visibleColumns = undefined;

	#editMode = false;

	constructor(spendingReport, visibleColumns) {
		super();
		this.#spendingReport = spendingReport;
		this.#visibleColumns = visibleColumns;
	}

	refresh() {
		if(!this.#spendingReport || !this.#visibleColumns || this.#visibleColumns.length === 0) {
			return this.clear();
		}

		const totalSpending = this.#spendingReport.totalAsSpending();
		const totalValues = {
			date: totalSpending.toLocaleString('en-GB', { day: 'numeric' }),
			name: totalSpending.description,
			category: totalSpending.category,
			price: totalSpending.price.toFixed(2),
		};

		this.id(`table-${this.#spendingReport.month()}`)
			.thead(
				new Dom('tr').append(
					...this.#visibleColumns.map(col => new Dom('th').text(col)),
					new Dom('th').cls('narrow-col').hideable(this.#editMode).append(
						new Dom('button').onClick(this.onClickDelete).append(
							new Dom('img').cls('white-fill').text('Delete').attr('alt', 'Delete').attr('src', icons.delete),
						),
					),
				),
			).tbody(
				...this.#spendingReport.spendings().map(
					(spending) => new Dom('tr').id(spending.id).userData(spending).append(
						...this.#visibleColumns.map(col => new Dom('td').text(spending[col.toLowerCase()]).onClick(this.onClickedSpending)),
						new Dom('td').hideable(this.#editMode).append(
							new Dom('button').onClick(this.onClickDelete).append(
								new Dom('img').cls('white-fill').text('Delete').attr('alt', 'Delete').attr('src', icons.delete),
							),
						),
					)),
			).tfoot(
				new Dom('tr').append(
					...this.#visibleColumns.map((col) => new Dom('td').text(totalValues[col])),
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
}
