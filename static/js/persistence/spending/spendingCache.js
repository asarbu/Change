import Spending from './spendingModel.js';
import Idb from '../idb.js';

export default class SpendingCache {
	static DATABASE_NAME = 'Spendings';

	static DATABASE_VERSION = 2024;

	static async getAll() {
		const idb = new Idb(
			SpendingCache.DATABASE_NAME,
			SpendingCache.DATABASE_VERSION,
			SpendingCache.upgradeSpendingsDb,
		);
		await idb.init();

		const objectStores = idb.getObjectStores();
		const spendingsArray = new Array(objectStores.length);
		for (let i = 0; i < objectStores.length; i += 1) {
			const storeName = objectStores[i];
			const spendingCache = new SpendingCache(storeName, idb);
			await spendingCache.init();
			spendingsArray[i] = (spendingCache);
		}
		return spendingsArray;
	}

	/**
	 * @type {Idb}
	 */
	idb = undefined;

	/**
	 * @param {number} year Year for which to initialize current cache
	 */
	constructor(year) {
		this.year = +year;
		this.idb = new Idb(
			SpendingCache.DATABASE_NAME,
			SpendingCache.DATABASE_VERSION,
			SpendingCache.upgradeSpendingsDb,
		);
	}

	/**
	 * Initialize current instance of PlanningCache
	 */
	async init() {
		await this.idb.init();
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
		const toDate = new Date(this.year, month + 1, 0);
		const keyRange = IDBKeyRange.bound(fromDate, toDate);
		return this.idb.getAllByIndex(this.year, 'byBoughtDate', keyRange);
	}

	/**
	 * @returns {Array<Spending>}
	 */
	async readAllForYear() {
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
	 * @param {IndexedDb} db Database to upgrade
	 * @param {number} oldVersion Version from which to update
	 * @param {number} newVersion Version to which to update
	 * @returns {undefined}
	 */
	static upgradeSpendingsDb(db, oldVersion, newVersion) {
		if (!newVersion) {
			return;
		}

		if (oldVersion < newVersion) {
			const store = db.createObjectStore(`${newVersion}`, { autoIncrement: true });
			store.createIndex('byBoughtDate', 'boughtOn', { unique: false });
			store.createIndex('byCategory', 'category', { unique: false });
		}
	}
}
