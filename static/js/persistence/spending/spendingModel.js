/* eslint-disable max-classes-per-file */
// Too much overhead to split to multiple files

import { Category, Goal } from '../planning/planningModel.js';

export default class Spending {
	/**
	 * @param {id} id Unique identifier of this spending
	 * @param {string} type Spending type (Expense, Saving)
	 * @param {string} category Spending category (Taken from planning)
	 * @param {Date} spentOn Date when this spending was created.
	 * @param {string} description Spending description
	 * @param {number} price Amount spent on this spending
	 */
	constructor(id, type, category, spentOn, description, price) {
		this.id = id;
		this.type = type;
		this.category = category;
		this.boughtOn = spentOn;
		this.description = description;
		this.price = price;
	}

	/**
	 * Function to convert string data to properly initialized objects
	 * @param {string} key Key that identifies property to revive
	 * @param {Object} value Parsed (!!) value from JSON
	 * @returns {Object} Transformed value must be returned, otherwise property is deleted from object
	 */
	static revive(key, value) {
		if (key === 'spentOn') {
			return new Date(value);
		}
		return value;
	}
}

export class SpendingReport {
	/**
	 * @type {number}
	 */
	#month = undefined;

	/**
	 * @type {Array<Spending>}
	 */
	#spendings = undefined;

	/**
	 * @type {Set<Category>}
	 */
	#goals = undefined;

	/**
	 * @type {number}
	 */
	#total = 0;

	static MONTH_NAMES = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];

	/**
	 *
	 * @param {number} month Month for which to build the report
	 */
	constructor(month) {
		this.#month = month;
		this.#spendings = [];
		this.#goals = new Set();
	}

	/**
	 * Adds information about spending to report. Recomputes relevant data
	 * @param {Spending} spending Spending object to append to report
	 */
	appendSpending(spending) {
		this.#spendings.push(spending);
		this.#total += spending.price;
		this.#goals.add(spending.category);
	}

	/**
	 * Returns the total amount for spendings in report
	 * @returns {number}
	 */
	total() {
		return this.#total.toFixed(2);
	}

	/**
	 * 
	 * @param {string} goal 
	 * @returns {number}
	 */
	totalForGoal(goal) {
		if (!this.#goals.has(goal)) return 0;

		return this.#spendings.reduce(
			(accumulator, spending) => accumulator + (spending.category === goal ? spending.price : 0), 0,
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
	 * @returns {Array<Goal}
	 */
	goals() {
		return [...this.#goals];
	}

	/**
	 * Returns the ID of the current report
	 * @returns {number}
	 */
	id() {
		return this.#month;
	}

	toString() {
		return SpendingReport.MONTH_NAMES[this.#month];
	}
}
