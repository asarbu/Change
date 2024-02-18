import Idb from '../idb';
import { Category, Statement } from './planningModel';

export default class PlanningCache {
	static DATABASE_NAME = 'Planning';

	static PLANNING_TEMPLATE_URI = 'static/v2/js/planning.json';

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
	 * @param {string} storeName Object store name associated with this object
	 * @param {Idb} idb Idb instance
	 */
	constructor(storeName, idb) {
		this.idb = idb;
		this.storeName = storeName;
	}

	/**
	 * Initialize current instance of PlanningCache
	 * @async
	 */
	async init() {
		await this.idb.init();

		const storeCount = await this.idb.count(this.storeName);
		if (storeCount === 0) {
			await fetch(PlanningCache.PLANNING_TEMPLATE_URI)
				.then((response) => response.json())
				.then((planningFile) => this.idb.putAll(this.storeName, planningFile));
		}
	}

	/**
	 * Read all planning statements from the cache
	 * @returns {Promise<Array<Statement>>}
	 */
	async readAll() {
		return this.idb.openCursor(this.storeName);
	}

	/**
	 * Updates all of the statements from the current object store
	 * @async
	 * @param {Array<Statement>} statements Statenents to be updated in dabatase
	 */
	async updateAll(statements) {
		await this.idb.clear(this.storeName);
		await this.idb.putAll(this.storeName, statements);
	}

	/**
	 * Fetch only the statements of type "Expense"
	 * @async
	 * @returns {Array<Statement>}
	 */
	async readExpenses() {
		const keyRange = IDBKeyRange.only('Expense');
		return this.idb.getAllByIndex(this.storeName, 'byType', keyRange);
	}

	/**
	 * Fetch only the planning categories from the current object store
	 * @async
	 * @returns {Array<Category>}
	 */
	async readCategories() {
		return this.idb.openCursor(this.storeName);
	}

	/**
	 * Fetch only the planning statement corresponding to the key
	 * @async
	 * @param {string} key Key to lookup in the datastore
	 * @returns {Statement}
	 */
	async read(key) {
		return this.idb.get(this.storeName, key);
	}

	/**
	 * Update a single Planning statement in the database
	 * @async
	 * @param {string} key Key to lookup in the datastore
	 * @param {Statement} value Value to update
	 * @returns {Statement} Updated value
	 */
	async update(key, value) {
		await this.idb.insert(this.storeName, value, key);
	}

	/**
	 * Delete a single Planning statenent in the database
	 * @async
	 * @param {string} key Key to lookup in the datastore
	 * @returns {Statement} Deleted value
	 */
	async delete(key) {
		await this.idb.delete(this.storeName, key);
	}
}
