import Idb from '../../common/persistence/idb.js';
import Planning from '../model/planningModel.js';

export default class PlanningCache {
	static DATABASE_NAME = 'Planning';

	static PLANNING_TEMPLATE_URI = '/planning.json';

	/**
	 * Avoid initializing IDBs multiple times so we can update versions
	 * @type {Array<PlanningCache>}
	 */
	static #initializedCaches = [];

	/**
	 * Fetches or creates an initialized Planning cache for the provided year
	 * @param {number} forYear Year for which to retrieve the Planning Cache
	 * @returns {Promise<PlanningCache>}
	 */
	static async get(forYear) {
		const cache = PlanningCache.#initializedCaches.find((c) => c.year === forYear);
		if (cache) return cache;

		const planningCache = new PlanningCache(forYear);
		await planningCache.init();
		PlanningCache.#initializedCaches.push(planningCache);
		return planningCache;
	}

	/**
	 * @returns {Promise<Array<string>>}
	 */
	static async availableYears() {
		const idb = await Idb.of(
			PlanningCache.DATABASE_NAME,
			PlanningCache.upgradePlanningDatabase,
		);
		// Sort array of strings years in decreasing order
		return idb.getObjectStores().sort((a, b) => b - a);
	}

	/** @type {Idb} */
	#idb = undefined;

	/** @type {string} */
	#storeName = undefined;

	/** @type {boolean} */
	#initialized = false;

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
			store.createIndex('byMonth', 'month', { unique: false });
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
		if (!this.#initialized) {
			this.#idb = await Idb.of(
				PlanningCache.DATABASE_NAME,
				PlanningCache.upgradePlanningDatabase,
			);

			const objectStores = this.#idb.getObjectStores();
			if (!objectStores.find((objectStore) => objectStore === `${this.year}`)) {
				await this.#idb.createObjectStores([`${this.year}`]);
			}
		}
		this.#initialized = true;
		return this;
	}

	async count() {
		if (!this.#initialized) await this.init();
		return this.#idb.count(this.#storeName);
	}

	/**
	 * Read all planning statements from the cache
	 * @returns { Promise<Array<Planning>> }
	 */
	async readAll() {
		if (!this.#initialized) await this.init();
		const plannings = [];
		const objects = await this.#idb.getAll(this.#storeName);
		objects.forEach((object) => {
			plannings.push(Planning.fromJavascriptObject(object));
		});
		return plannings;
	}

	/**
	 * Returns the planning for a single month
	 * @param {number} month for which to search the cache
	 * @returns {Promise<Planning>}
	 */
	async readForMonth(month) {
		if (!this.#initialized) await this.init();
		const keyRange = IDBKeyRange.only(month);
		const objects = await this.#idb.getAllByIndex(this.#storeName, 'byMonth', keyRange, false, true);
		if (objects.length > 1) throw Error('More than one monthly planning encountered in cache');
		if (objects.length === 0) return undefined;
		return Planning.fromJavascriptObject(objects[0]);
	}

	/**
	 * Updates all of the statements from the current object store
	 * @param {Array<Planning>} plannings Statenents to be updated in dabatase
	 * @returns {Promise<undefined>}
	 */
	async updateAll(plannings) {
		if (!this.#initialized) await this.init();
		await this.#idb.clear(this.#storeName);
		return this.#idb.putAll(this.#storeName, plannings);
	}

	/**
	 * Fetch only the planning statement corresponding to the key
	 * @async
	 * @param {string} key Key to lookup in the datastore
	 * @returns {Promise<Planning>}
	 */
	async read(key) {
		if (!this.#initialized) await this.init();
		const jsObject = await this.#idb.get(this.#storeName, key);
		return Planning.fromJavascriptObject(jsObject);
	}

	/**
	 * Insert / Update a single Planning statement in the database
	 * @async
	 * @param {Planning} planning Value to store
	 * @returns {Promise<Planning>} Stored value
	 */
	async store(planning) {
		if (!this.#initialized) await this.init();
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
		if (!this.#initialized) await this.init();
		await this.#idb.delete(this.#storeName, key);
	}
}
