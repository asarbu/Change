import Spending from './spendingModel.js';
import Idb from '../idb.js';

export default class SpendingCache {
	static DATABASE_NAME = 'Spendings';

	/**
	 * Avoid initializing IDBs multiple times so we can update versions
	 * @type {Array<SpendingCache>}
	 */
	static #initializedCaches = [];

	static async getAll() {
		const idb = await Idb.get(
			SpendingCache.DATABASE_NAME,
			SpendingCache.upgradeSpendingsDb,
		);
		const objectStores = idb.getObjectStores();
		const spendingsArray = new Array(objectStores.length);
		for (let i = 0; i < objectStores.length; i += 1) {
			const storeName = objectStores[i];
			const spendingCache = new SpendingCache(storeName, idb);
			spendingsArray[i] = (spendingCache);
		}
		SpendingCache.#initializedCaches = spendingsArray;
		return spendingsArray;
	}

	/**
	 * Fetches or creates a Spending cache for the provided year
	 * @param {number} forYear Year for which to retrieve the SpendingCache
	 * @returns {SpendingCache}
	 */
	static async get(forYear) {
		const cache = SpendingCache.#initializedCaches.find((c) => c.year === forYear);
		if (cache) return cache;

		const idb = await Idb.get(
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
		const keyRange = IDBKeyRange.bound(fromDate, toDate);
		return this.idb.getAllByIndex(this.year, 'byBoughtDate', keyRange);
	}

	/**
	 * @returns {Array<Spending>}
	 */
	async readAll() {
		const spendings = this.idb.getAll(this.year);
		return spendings;
	}

	/**
	 * Persist a spending in cache at a certain key
	 * @param {Spending} spending Spending to persist
	 */
	async insert(spending) {
		await this.idb.insert(this.year, spending, spending.id);
		this.onChange(spending);
	}

	/**
	 * Remove a Spending from the cache
	 * @param {Spending} spending Spending to delete
	 */
	async delete(spending) {
		await this.idb.delete(this.year, spending.id);
		this.onChange(spending);
	}

	/**
	 * Returns the timestamp when this cache was modified last time. Defaults to 0 epoch time.
	 * @param {number} forMonth Month for which to check when the cache was last modified
	 * @returns {number} time when this cache was modified
	 */
	timeOfChange(forMonth) {
		const storageKey = `Cache_modified_${this.year}_${forMonth}`;
		if (localStorage.getItem(storageKey)) {
			return localStorage.getItem(storageKey);
		}
		return new Date(0).getTime();
	}

	/**
	 * Persists the time of edit for cache in permanent storage
	 * @param {Spending} spending Spending for which to record the edit
	 * @param {number} time Timestamp to store in storage
	 */
	onChange(spending, time) {
		if (!spending) {
			throw new Error(`Illegal arguments!${this.year}${spending}${time}`);
		}

		const storageKey = `Cache_modified_${this.year}_${spending.boughtOn.getMonth()}`;
		if (time) {
			localStorage.setItem(storageKey, time);
		}
		localStorage.setItem(storageKey, new Date().getTime());
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
				store.createIndex('byBoughtDate', 'boughtOn', { unique: false });
				store.createIndex('byCategory', 'category', { unique: false });
			});
		}
	}
}
