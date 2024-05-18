import { Category, Goal } from '../../planning/model/planningModel.js';
import Spending from './spending.js';

export default class SpendingReport {
	/** @type {number} */
	#month = undefined;

	/** @type {number} */
	#year = undefined;

	/** @type {Array<Spending>} */
	#spendings = undefined;

	/** @type {Set<Category>} */
	#goals = undefined;

	/** @type {number} */
	#total = 0;

	static MONTH_NAMES = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];

	/**
	 * @param {number} month Month for which to build the report
	 * @param {number} year Year for which to build the report
	 */
	constructor(year, month) {
		this.#month = month;
		this.#year = year;
		this.#spendings = [];
		this.#goals = new Set();
	}

	/**
	 * Adds information about spending to report. Recomputes relevant data
	 * @param {Spending} spending Spending object to append to report
	 */
	appendSpending(spending) {
		if (this.invalidBoughtDate(spending)) return;

		this.#spendings.push(spending);
		this.#total += spending.price;
		this.#goals.add(spending.category);
	}

	/**
	 * @param {Spending} spending
	 * @returns {boolean}
	 */
	invalidBoughtDate(spending) {
		return spending.spentOn.getMonth() !== this.#month
			|| spending.spentOn.getFullYear() !== this.#year;
	}

	/**
	 * Returns the total amount for spendings in report
	 * @returns {number}
	 */
	total() {
		return this.#total.toFixed(2);
	}

	/**
	 * Computes total amount spent in a month for a specific goal name
	 * @param {string} goal
	 * @returns {number}
	 */
	totalForGoal(goal) {
		if (!this.#goals.has(goal)) return 0;

		return this.#spendings.reduce(
			(accumulator, spending) => accumulator + (spending.category === goal ? spending.price : 0),
			0,
		);
	}

	/**
	 * Returns reports' total amount as a Spending object
	 * @returns {Spending}
	 */
	totalAsSpending() {
		return new Spending(`total-${this.#month}`, '-', '-', '-', 'Total', this.#total);
	}

	/**
	 * Returns a copy of the spendings data in current report
	 * @returns {Array<Spending>}
	 */
	spendings() {
		return [...this.#spendings];
	}

	/**
	 * Returns a copy of the category data in current report
	 * @returns {Array<Goal>}
	 */
	goals() {
		return [...this.#goals];
	}

	/**
	 * Returns the ID of the current report
	 * @returns {number}
	 */
	month() {
		return this.#month;
	}

	year() {
		return this.#year;
	}

	id() {
		return `${this.#year}_${this.#month}`;
	}

	toString() {
		return SpendingReport.MONTH_NAMES[this.#month];
	}
}
