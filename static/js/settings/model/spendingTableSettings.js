export default class SpendingTableSettings {
	// TODO Create a column class to store these strings?
	static #COLUMN_DESCRIPTION = 'Description';

	static #COLUMN_DATE = 'Date';

	static #COLUMN_CATEGORY = 'Category';

	static #COLUMN_AMOUNT = 'Amount';

	static COLUMN_NAMES = Object.freeze([
		SpendingTableSettings.#COLUMN_DATE,
		SpendingTableSettings.#COLUMN_DESCRIPTION,
		SpendingTableSettings.#COLUMN_CATEGORY,
		SpendingTableSettings.#COLUMN_AMOUNT,
	]);

	#visibleColumns = undefined;

	static fromJson({ visibleColumns } =
	{
		visibleColumns: [
			SpendingTableSettings.#COLUMN_DATE,
			SpendingTableSettings.#COLUMN_DESCRIPTION,
			SpendingTableSettings.#COLUMN_CATEGORY,
			SpendingTableSettings.#COLUMN_AMOUNT,
		],
	}) {
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
		return { visibleColumns: this.#visibleColumns };
	}
}
