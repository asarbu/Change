import Spending from '../model/spending.js';
import Idb from '../../persistence/idb.js';

export default class SpendingCache {
	static DATABASE_NAME = 'Spendings';

	/**
	 * Avoid initializing IDBs multiple times so we can update versions
	 * @type {Array<SpendingCache>}
	 */
	static #initializedCaches = [];

	static async getAllCacheNames() {
		const idb = await Idb.of(
			SpendingCache.DATABASE_NAME,
			SpendingCache.upgradeSpendingsDb,
		);
		const objectStores = idb.getObjectStores();
		return objectStores;
	}

	/**
	 * Fetches or creates a Spending cache for the provided year
	 * @param {number} forYear Year for which to retrieve the SpendingCache
	 * @returns {Promise<SpendingCache>}
	 */
	static async get(forYear) {
		const cache = SpendingCache.#initializedCaches.find((c) => c.year === forYear);
		if (cache) return cache;

		const idb = await Idb.of(
			SpendingCache.DATABASE_NAME,
			SpendingCache.upgradeSpendingsDb,
		);
		const objectStores = idb.getObjectStores();
		if (!objectStores.find((objectStore) => objectStore === `${forYear}`)) {
			await idb.createObjectStores([`${forYear}`]);
		}
		const spendingCache = new SpendingCache(forYear, idb);
		SpendingCache.#initializedCaches.push(spendingCache);
		return spendingCache;
	}

	/**
	 * @type {Idb}
	 */
	idb = undefined;

	/**
	 * @param {number} year Year for which to initialize current cache
	 * @param {Idb} idb IndexedDB database associated with this object
	 */
	constructor(year, idb) {
		this.year = +year;
		this.storeName = `${this.year}`;
		this.idb = idb;
	}

	/**
	 * Read spending from the cache
	 * @param {number} key Identifier for the desired spending
	 * @returns {Promise<Spending>}
	 */
	async read(key) {
		return this.idb.get(this.year, key);
	}

	/**
	 * Read all spendings associated with a month
	 * @param {number} month Month for which to read Spendings
	 * @returns {Promise<Array<Spending>>}
	 */
	async readAllForMonth(month) {
		const fromDate = new Date(this.year, month, 1);
		const toDate = new Date(this.year, month + 1, 1);
		const keyRange = IDBKeyRange.bound(fromDate, toDate, false, true);
		return this.idb.getAllByIndex(this.year, 'bySpentOn', keyRange);
	}

	/**
	 * @returns {Promise<Array<Spending>>}
	 */
	async readAll() {
		const objects = await this.idb.getAll(this.year);
		const spendings = [];
		objects.forEach((object) => {
			spendings.push(new Spending(
				object.id,
				object.type,
				object.spentOn,
				object.category,
				object.description,
				+object.price,
			));
		});
		return spendings;
	}

	/**
	 * Persist a spending in cache at a certain key
	 * @param {Spending} spending Spending to persist
	 */
	async store(spending) {
		const spendingToStore = spending;
		await this.idb.insert(this.year, spendingToStore, spending.id);
	}

	/**
	 * @param {Array<Spending>} spendings
	 * @returns {Promise<void>}
	 */
	async storeAll(spendings) {
		return this.idb.putAll(this.storeName, spendings);
	}

	/**
	 * Remove a Spending from the cache
	 * @param {Spending} spending Spending to delete
	 */
	async delete(spending) {
		await this.idb.delete(this.year, spending.id);
	}

	async clear() {
		await this.idb.clear(this.storeName);
	}

	/**
	 * Callback function to update a planning database
	 * @param {IDBDatabase} db Database to upgrade
	 * @param {number} oldVersion Version from which to update
	 * @param {number} newVersion Version to which to update
	 * @param {Array<string>} objectStores Object store names to create on upgrade
	 * @returns {undefined}
	 */
	static upgradeSpendingsDb(db, oldVersion, newVersion, objectStores) {
		if (!newVersion) {
			return;
		}

		if (oldVersion < newVersion) {
			objectStores.forEach((objectStore) => {
				const store = db.createObjectStore(objectStore, { autoIncrement: true });
				store.createIndex('bySpentOn', 'spentOn', { unique: false });
				store.createIndex('byCategory', 'category', { unique: false });
			});
		}
	}
}
