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

	/**
	 * Fetches or creates a Planning cache for all years
	 * @returns {Promise<Array<PlanningCache>>}
	 */
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
	 * Fetches or creates a Planning cache for the provided year
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
	#idb = undefined;

	/** @type {string} */
	#storeName = undefined;

	/**
	 * Callback function to update a planning database
	 * @param {IDBDatabase} db Database to upgrade
	 * @param {number} oldVersion Version from which to update
	 * @param {number} newVersion Version to which to update
	 * @param {Array<string>} objectStores Object store names to create on upgrade
	 * @returns {undefined}
	 */
	static upgradePlanningDatabase(db, oldVersion, newVersion, objectStores) {
		objectStores.forEach((objectStore) => {
			const store = db.createObjectStore(objectStore, { autoIncrement: true });
			// store.createIndex('byType', 'type', { unique: false });
			store.createIndex('byYear', 'year', { unique: false });
		});
	}

	/**
	 * @param {string} year Object store name associated with this object
	 * @param {Idb} idb Idb instance
	 */
	constructor(year, idb) {
		this.#idb = idb;
		this.year = +year;
		this.#storeName = `${this.year}`;
	}

	/**
	 * Initialize current instance of PlanningCache
	 * @returns {Promise<PlanningCache>} initialized planning cache.
	 */
	async init() {
		if (!this.#idb) {
			this.#idb = await Idb.of(
				PlanningCache.DATABASE_NAME,
				PlanningCache.upgradePlanningDatabase,
			);
		}
		return this;
	}

	async count() {
		return this.#idb.count(this.#storeName);
	}

	/**
	 * Read all planning statements from the cache
	 * @returns { Promise<Array<Planning>> }
	 */
	async readAll() {
		const plannings = [];
		const objects = await this.#idb.openCursor(this.#storeName);
		objects.forEach((object) => {
			plannings.push(Object.assign(new Planning(), object));
		});
		return plannings;
	}

	/**
	 * Returns the first planning for a single month
	 * @param {number} month for which to search the cache
	 * @returns {Promise<Array<Planning>>}
	 */
	async readForMonth(month) {
		// TODO do this with a key range
		const allPlannings = await this.readAll();
		const plannings = allPlannings.filter((planning) => planning.month === month);
		return plannings;
	}

	/**
	 * Updates all of the statements from the current object store
	 * @param {Array<Planning>} plannings Statenents to be updated in dabatase
	 * @returns {Promise<undefined>}
	 */
	async updateAll(plannings) {
		await this.#idb.clear(this.#storeName);
		return this.#idb.putAll(this.#storeName, plannings);
	}

	/**
	 * Fetch only the categories of type "Expense"
	 * // TODO move this to controller
	 * @returns {Promise<Array<Category>>}
	 */
	async readExpenseCategories(forMonth) {
		/** @type {Array<Planning>} */
		const planningsForYear = await this.#idb.getAll(this.#storeName);
		const planningForMonth = planningsForYear.find((planning) => planning.month === forMonth);
		const expenseStatements = planningForMonth.statements.filter((statement) => statement.type === 'Expense');
		return expenseStatements.reduce((categories, statement) => {
			categories.push(...statement.categories);
			return categories;
		}, []);
	}

	/**
	 * Fetch only the planning statement corresponding to the key
	 * @async
	 * @param {string} key Key to lookup in the datastore
	 * @returns {Promise<Planning>}
	 */
	async read(key) {
		return this.#idb.get(this.#storeName, key);
	}

	/**
	 * Insert / Update a single Planning statement in the database
	 * @async
	 * @param {Planning} planning Value to store
	 * @returns {Promise<Planning>} Stored value
	 */
	async storePlanning(planning) {
		const [, storedPlanning] = await this.#idb.insert(this.#storeName, planning, planning.id);
		return storedPlanning;
	}

	/**
	 * Delete a single Planning statenent in the database
	 * @async
	 * @param {string} key Key to lookup in the datastore
	 * @returns {Promise<Planning>} Deleted value
	 */
	async delete(key) {
		await this.#idb.delete(this.#storeName, key);
	}
}
