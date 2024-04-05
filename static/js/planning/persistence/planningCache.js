import Idb from '../../persistence/idb.js';
import { Category, Statement } from '../model/planningModel.js';

export default class PlanningCache {
	static DATABASE_NAME = 'Planning';

	static PLANNING_TEMPLATE_URI = '/planning.json';

	/**
	 * Avoid initializing IDBs multiple times so we can update versions
	 * @type {Array<PlanningCache>}
	 */
	static #initializedCaches = [];

	static async getAll() {
		const idb = await Idb.of(
			PlanningCache.DATABASE_NAME,
			PlanningCache.upgradePlanningDatabase,
		);
		const objectStores = idb.getObjectStores();
		const planningssArray = new Array(objectStores.length);
		for (let i = 0; i < objectStores.length; i += 1) {
			const storeName = objectStores[i];
			const planningCache = new PlanningCache(storeName, idb);
			planningssArray[i] = (planningCache);
		}
		PlanningCache.#initializedCaches = planningssArray;
		return planningssArray;
	}

	/**
	 * Fetches or creates a Spending cache for the provided year
	 * @param {number} forYear Year for which to retrieve the Planning Cache
	 * @returns {Promise<PlanningCache>}
	 */
	static async get(forYear) {
		const cache = PlanningCache.#initializedCaches.find((c) => c.year === forYear);
		if (cache) return cache;

		const idb = await Idb.of(
			PlanningCache.DATABASE_NAME,
			PlanningCache.upgradePlanningDatabase,
		);
		const objectStores = idb.getObjectStores();
		if (!objectStores.find((objectStore) => objectStore === `${forYear}`)) {
			await idb.createObjectStores([`${forYear}`]);
		}
		const planningCache = new PlanningCache(forYear, idb);
		await planningCache.init();
		PlanningCache.#initializedCaches.push(planningCache);
		return planningCache;
	}

	/** @type {Idb} */
	idb = undefined;

	/**
	 * Callback function to update a planning database
	 * @param {IDBDatabase} db Database to upgrade
	 * @param {number} oldVersion Version from which to update
	 * @param {number} newVersion Version to which to update
	 * @param {Array<string>} objectStores Object store names to create on upgrade
	 * @returns {undefined}
	 */
	static upgradePlanningDatabase(db, oldVersion, newVersion, objectStores) {
		if (!newVersion) {
			return;
		}

		if (oldVersion < newVersion) {
			objectStores.forEach((objectStore) => {
				const store = db.createObjectStore(objectStore, { autoIncrement: true });
				store.createIndex('byType', 'type', { unique: false });
			});
		}
	}

	/**
	 * @param {string} year Object store name associated with this object
	 * @param {Idb} idb Idb instance
	 */
	constructor(year, idb) {
		if (!idb) {
			this.idb = Idb.of(
				PlanningCache.DATABASE_NAME,
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
	 * @returns {Promise<Array<Category>>}
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
