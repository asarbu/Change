import Spending from './spendingModel.js';
import Idb from '../idb.js';

export default class SpendingCache {
	static DATABASE_NAME = 'Spendings';

	static DATABASE_VERSION = 1;

	/**
	 * @type {Idb}
	 */
	idb = undefined;

	/**
	 * @param {number} year Year for which to initialize current cache
	 */
	constructor(year) {
		this.year = year;
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
	async readAll(month) {
		// TODO redo this
		// Hack from https://stackoverflow.com/questions/9791219/indexeddb-search-using-wildcards
		const keyRange = IDBKeyRange.bound(month, `${month}\uffff`);
		return this.idb.getAllByIndex(this.year, 'byBoughtDate', keyRange);
	}

	/**
	 * Update all spendings in the cache
	 * @param {Array<Spending>} spendings Spendings to update
	 */
	async updateAll(spendings) {
		await this.idb.updateAll(this.year, spendings);
		this.onChange(this.month);
	}

	/**
	 * Persist a spending in cache at a certain key
	 * @param {number} key Key to identfy the spending in cache
	 * @param {Spending} spending Spending to persist
	 */
	async insert(key, spending) {
		await this.idb.put(this.year, spending, key);
		this.onChange(spending.month);
	}

	/**
	 * Remove a Spending from the cache
	 * @param {Spending} spending Spending to delete
	 */
	async delete(spending) {
		await this.idb.delete(this.year, spending.id);
		this.onChange(spending.value.month);
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
	 * @param {number} month Month for which to record the edit
	 * @param {number} time Timestamp to store in storage
	 */
	onChange(month, time) {
		if (!month) {
			throw new Error(`Illegal arguments!${this.year}${month}${time}`);
		}
		const storageKey = `Cache_modified_${this.year}_${month}`;
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
			store.createIndex('byBoughtDate', 'boughtDate', { unique: false });
			store.createIndex('byCategory', 'category', { unique: false });
			store.createIndex('byDeleteStatus', 'isDeleted', { unique: false });
			store.createIndex('byMonth', 'month', { unique: false });
			store.createIndex('byMonthAndCategory', ['month', 'category'], { unique: false });
		}
	}
}
