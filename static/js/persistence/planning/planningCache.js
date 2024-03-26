import Idb from '../idb.js';
import { Category, Statement } from './planningModel.js';

export default class PlanningCache {
	static DATABASE_NAME = 'Planning';

	static PLANNING_TEMPLATE_URI = 'static/js/planning.json';

	// TODO: Lower this to 1 at release
	static DATABASE_VERSION = 2024;

	/**
	 * Returns all planning caches in the database, initialized
	 * @constructs PlanningCache
	 * @returns {Promise<Array<PlanningCache>>}
	 */
	static async getAll() {
		const idb = new Idb(
			PlanningCache.DATABASE_NAME,
			PlanningCache.DATABASE_VERSION,
			PlanningCache.upgradePlanningDatabase,
		);
		await idb.init();

		const objectStores = idb.getObjectStores();
		const planningsArray = new Array(objectStores.length);
		for (let i = 0; i < objectStores.length; i += 1) {
			const storeName = objectStores[i];
			const planningCache = new PlanningCache(storeName, idb);
			await planningCache.init();
			planningsArray[i] = (planningCache);
		}
		return planningsArray;
	}

	/**
	 * Callback function to update a planning database
	 * @param {IndexedDb} db Database to upgrade
	 * @param {number} oldVersion Version from which to update
	 * @param {number} newVersion Version to which to update
	 * @returns {undefined}
	 */
	static upgradePlanningDatabase(db, oldVersion, newVersion) {
		if (!newVersion) {
			return;
		}

		const store = db.createObjectStore(newVersion, { autoIncrement: true });
		store.createIndex('byType', 'type', { unique: false });
	}

	/**
	 * @param {string} year Object store name associated with this object
	 * @param {Idb} idb Idb instance
	 */
	constructor(year, idb) {
		if (!idb) {
			this.idb = new Idb(
				PlanningCache.DATABASE_NAME,
				PlanningCache.DATABASE_VERSION,
				PlanningCache.upgradePlanningDatabase,
			);
		} else {
			this.idb = idb;
		}

		this.year = +year;
	}

	/**
	 * Initialize current instance of PlanningCache
	 */
	async init() {
		await this.idb.init();

		const storeCount = await this.idb.count(this.year);
		if (storeCount === 0) {
			await fetch(PlanningCache.PLANNING_TEMPLATE_URI)
				.then((response) => response.json())
				.then((planningFile) => this.idb.putAll(this.year, planningFile));
		}
	}

	/**
	 * Read all planning statements from the cache
	 * @returns {Promise<Array<Statement>>}
	 */
	async readAll() {
		return this.idb.openCursor(this.year);
	}

	/**
	 * Updates all of the statements from the current object store
	 * @async
	 * @param {Array<Statement>} statements Statenents to be updated in dabatase
	 */
	async updateAll(statements) {
		await this.idb.clear(this.year);
		await this.idb.putAll(this.year, statements);
	}

	/**
	 * Fetch only the categories of type "Expense"
	 * @async
	 * @returns {Array<Category>}
	 */
	async readExpenseCategories() {
		const keyRange = IDBKeyRange.only('Expense');
		const expenseStatements = await this.idb.getAllByIndex(this.year, 'byType', keyRange);
		const expenses = [];
		for (let i = 0; i < expenseStatements.length; i += 1) {
			expenses.push(...expenseStatements[i].categories);
		}
		return expenses;
	}

	/**
	 * Fetch only the planning categories from the current object store
	 * @async
	 * @returns {Array<Category>}
	 */
	async readCategories() {
		return this.idb.openCursor(this.year);
	}

	/**
	 * Fetch only the planning statement corresponding to the key
	 * @async
	 * @param {string} key Key to lookup in the datastore
	 * @returns {Statement}
	 */
	async read(key) {
		return this.idb.get(this.year, key);
	}

	/**
	 * Update a single Planning statement in the database
	 * @async
	 * @param {string} key Key to lookup in the datastore
	 * @param {Statement} value Value to update
	 * @returns {Statement} Updated value
	 */
	async update(key, value) {
		await this.idb.insert(this.year, value, key);
	}

	/**
	 * Delete a single Planning statenent in the database
	 * @async
	 * @param {string} key Key to lookup in the datastore
	 * @returns {Statement} Deleted value
	 */
	async delete(key) {
		await this.idb.delete(this.year, key);
	}
}
