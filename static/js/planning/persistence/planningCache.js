import Idb from '../../persistence/idb.js';
import Planning, { Category } from '../model/planningModel.js';

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
		const planningsInitPromises = [];
		for (let i = 0; i < objectStores.length; i += 1) {
			const storeName = objectStores[i];
			const planningCache = new PlanningCache(storeName, idb);
			planningsInitPromises.push(planningCache.init());
			planningssArray[i] = (planningCache);
		}
		await Promise.all(planningsInitPromises);
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
				// store.createIndex('byType', 'type', { unique: false });
				store.createIndex('byYear', 'year', { unique: false });
			});
		}
	}

	/**
	 * @param {string} year Object store name associated with this object
	 * @param {Idb} idb Idb instance
	 */
	constructor(year, idb) {
		this.idb = idb;
		this.year = +year;
	}

	/**
	 * Initialize current instance of PlanningCache
	 */
	async init() {
		if (!this.idb) {
			this.idb = Idb.of(
				PlanningCache.DATABASE_NAME,
				PlanningCache.upgradePlanningDatabase,
			);
		}
	}

	async storeFromTemplate() {
		const storeCount = await this.idb.count(this.year);
		if (storeCount === 0) {
			await fetch(PlanningCache.PLANNING_TEMPLATE_URI)
				.then((response) => response.json())
				.then((planningFile) => {
					const now = new Date();
					const time = now.getTime();
					const year = now.getFullYear();
					const month = now.getMonth();
					this.insert(new Planning(time, year, month, planningFile), time);
				});
		}
	}

	async insert(planning, key) {
		await this.idb.insert(this.year, planning, key);
	}

	/**
	 * Read all planning statements from the cache
	 * @returns { Promise<Array<Planning>> }
	 */
	async readAll() {
		return this.idb.openCursor(this.year);
	}

	/**
	 * Returns the planning for a single month
	 * @param {number} month for which to search the cache
	 * @returns {Promise<Planning>}
	 */
	async readForMonth(month) {
		return (await this.readAll()).find((planning) => planning.month === month);
	}

	/**
	 * Updates all of the statements from the current object store
	 * @async
	 * @param {Array<Planning>} plannings Statenents to be updated in dabatase
	 */
	async updateAll(plannings) {
		await this.idb.clear(this.year);
		await this.idb.putAll(this.year, plannings);
	}

	/**
	 * Fetch only the categories of type "Expense"
	 * @async
	 * @returns {Promise<Array<Category>>}
	 */
	async readExpenseCategories(forMonth) {
		/** @type {Array<Planning>} */
		const planningsForYear = await this.idb.getAll(this.year);
		const planningForMonth = planningsForYear.find((planning) => planning.month === forMonth);
		const expenseStatements = planningForMonth.statements.filter((statement) => statement.type === 'Expense');
		return expenseStatements.reduce((categories, statement) => {
			categories.push(...statement.categories);
			return categories;
		}, []);
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
	 * @returns {Planning}
	 */
	async read(key) {
		return this.idb.get(this.year, key);
	}

	/**
	 * Update a single Planning statement in the database
	 * @async
	 * @param {string} key Key to lookup in the datastore
	 * @param {Planning} value Value to update
	 * @returns {Planning} Updated value
	 */
	async update(key, value) {
		await this.idb.insert(this.year, value, key);
	}

	/**
	 * Delete a single Planning statenent in the database
	 * @async
	 * @param {string} key Key to lookup in the datastore
	 * @returns {Planning} Deleted value
	 */
	async delete(key) {
		await this.idb.delete(this.year, key);
	}
}
