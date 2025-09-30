export default class PlanningTableSettings {
	// TODO Creatie a column class to store these strings?
	static #COLUMN_NAME = 'Name';

	static #COLUMN_DAILY = 'Daily';

	static #COLUMN_MONTHLY = 'Monthly';

	static #COLUMN_YEARLY = 'Yearly';

	static COLUMN_NAMES = Object.freeze([
		PlanningTableSettings.#COLUMN_NAME,
		PlanningTableSettings.#COLUMN_DAILY,
		PlanningTableSettings.#COLUMN_MONTHLY,
		PlanningTableSettings.#COLUMN_YEARLY,
	]);

	#visibleColumns = undefined;

	static fromJson({ visibleColumns } =
	{
		visibleColumns: [
			PlanningTableSettings.#COLUMN_NAME,
			PlanningTableSettings.#COLUMN_MONTHLY,
			PlanningTableSettings.#COLUMN_YEARLY,
		],
	}) {
		return new PlanningTableSettings(visibleColumns);
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
