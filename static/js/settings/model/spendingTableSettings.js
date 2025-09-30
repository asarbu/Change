import SpendingTableColumn from "../../spending/view/spendingTableColumn.js";

export default class SpendingTableSettings {

	/** @type {Array<import("../../spending/view/spendingTableColumn.js").SpendingTableColumn>} */
	#visibleColumns = undefined;

	/**
	 * @param {Object} json
	 * @param {Array<string>} json.visibleColumns
	 * @returns {SpendingTableSettings}
	 */
	static fromJson({ visibleColumns } = {
		visibleColumns: SpendingTableColumn.ALL,
	}) {
		visibleColumns = visibleColumns.map(SpendingTableColumn.fromName).filter(c => c);
		return new SpendingTableSettings(visibleColumns);
	}

	constructor(visibleColumns) {
		this.#visibleColumns = visibleColumns;
	}

	/**
	 * @returns {Array<string>}
	 */
	visibleColumns() {
		return [...this.#visibleColumns];
	}

	changeVisibleColumns(columns) {
		this.#visibleColumns = columns;
	}

	toJson() {
		return { visibleColumns: this.#visibleColumns.map(c => c.name)};
	}
}
