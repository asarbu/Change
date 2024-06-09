import Spending from '../model/spending.js';
import Idb from '../../common/persistence/idb.js';

export default class SpendingCache {
	static DATABASE_NAME = 'Spendings';

	#initialized = false;

	/**
	 * @type {Idb}
	 */
	#idb = undefined;

	/**
	 * @param {number} year Year for which to initialize current cache
	 * @param {Idb} idb IndexedDB database associated with this object
	 */
	constructor(year, idb) {
		this.year = +year;
		this.storeName = `${this.year}`;
		this.#idb = idb;
	}

	async #init() {
		const idb = await Idb.of(
			SpendingCache.DATABASE_NAME,
			SpendingCache.upgradeSpendingsDb,
		);
		const objectStores = idb.getObjectStores();
		if (!objectStores.find((objectStore) => objectStore === `${this.year}`)) {
			await idb.createObjectStores([`${this.year}`]);
		}
		this.#idb = idb;
		this.#initialized = true;
	}

	/**
	 * Read spending from the cache
	 * @param {number} key Identifier for the desired spending
	 * @returns {Promise<Spending>}
	 */
	async read(key) {
		if (!this.#initialized) await this.#init();
		return this.#idb.get(this.storeName, key);
	}

	/**
	 * Read all spendings associated with a month
	 * @param {number} month Month for which to read Spendings
	 * @returns {Promise<Array<Spending>>}
	 */
	async readAllForMonth(month) {
		if (!this.#initialized) await this.#init();
		const fromDate = new Date(this.year, month, 1);
		const toDate = new Date(this.year, month + 1, 1);
		const keyRange = IDBKeyRange.bound(fromDate, toDate, false, true);
		return this.#idb.getAllByIndex(this.storeName, 'bySpentOn', keyRange);
	}

	/**
	 * @returns {Promise<Array<Spending>>}
	 */
	async readAll() {
		if (!this.#initialized) await this.#init();
		const objects = await this.#idb.getAll(this.storeName);
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
		if (!this.#initialized) await this.#init();
		const spendingToStore = spending;
		await this.#idb.insert(this.storeName, spendingToStore, spending.id);
	}

	/**
	 * @param {Array<Spending>} spendings
	 * @returns {Promise<void>}
	 */
	async storeAll(spendings) {
		if (!this.#initialized) await this.#init();
		return this.#idb.putAll(this.storeName, spendings);
	}

	/**
	 * @param {Array<Spending>} spendings
	 * @returns {Promise<void>}
	 */
	async deleteAll(spendings) {
		if (!this.#initialized) await this.#init();
		const deletePromises = [];
		for (let index = 0; index < spendings.length; index += 1) {
			const spending = spendings[index];
			deletePromises.push(this.#idb.delete(this.storeName, spending.id));
		}
		return Promise.all(deletePromises);
	}

	/**
	 * Remove a Spending from the cache
	 * @param {Spending} spending Spending to delete
	 */
	async delete(spending) {
		if (!this.#initialized) await this.#init();
		await this.#idb.delete(this.storeName, spending.id);
	}

	async clear() {
		if (!this.#initialized) await this.#init();
		await this.#idb.clear(this.storeName);
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

	// eslint-disable-next-line class-methods-use-this
	async readYears() {
		const idb = await Idb.of(
			SpendingCache.DATABASE_NAME,
			SpendingCache.upgradeSpendingsDb,
		);
		const objectStores = idb.getObjectStores();
		return objectStores;
	}
}
