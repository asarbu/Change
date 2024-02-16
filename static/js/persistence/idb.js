export default class Idb {
	static #READ_ONLY = 'readonly';

	static #READ_WRITE = 'readwrite';

	/**
	 * @constructor
	 * @param {string} dbName Database name
	 * @param {number} dbVersion Database version
	 * @param {upgradeDbCallback} upgradeCallback Callback function to call in case upgrade is needed
	 */
	constructor(dbName, dbVersion, upgradeCallback) {
		this.dbName = dbName;
		this.dbVersion = dbVersion;
		this.upgradeCallback = upgradeCallback;
	}

	/**
	 * Initializes this object of IDB. Mandatory to be called before use.
	 * @returns An instance of this
	 */
	async init() {
		await this.open(this.dbName, this.dbVersion, this.upgradeCallback);
		return this;
	}

	/**
	 * @typedef {function(db:db, number, number)} upgradeCallback
	 * @callback upgradeDbCallback
	 * @param {db} db Database to be upgraded.
	 * @param {number} oldVersion Version from which to upgrade
	 * @param {number} newVersion Version to which to upgrade.
	 */

	/**
	 * Opens an IndexedDb Database
	 * @param {string} dbName Database name
	 * @param {number} version Version to upgrade this database
	 * @param {upgradeDbCallback} upgradeCallback called in case the database needs upgrage
	 * @returns {Promise<IndexedDb>}
	 */
	open(dbName, version, upgradeCallback) {
		return new Promise((resolve, reject) => {
			if (!window.indexedDB) {
				return;
			}
			const request = indexedDB.open(dbName, version);

			request.onsuccess = (event) => {
				const db = event.target.result;
				this.db = db;
				resolve(db);
			};

			request.onerror = (event) => {
				reject(new Error(`Database error: ${event.target.errorCode}`));
			};

			request.onupgradeneeded = (event) => {
				const db = event.target.result;
				if (upgradeCallback) {
					upgradeCallback(db, event.oldVersion, event.newVersion);
				}
			};
		});
	}

	/**
	 * @param {string} storeName Database object store name
	 * @returns {Promise<Array<PlanningContext>>}
	 */
	openCursor(storeName) {
		return new Promise((resolve) => {
			const st = this.getStoreTransaction(storeName, Idb.#READ_ONLY);
			const store = st[0];
			const txn = st[1];

			const values = [];
			store.openCursor().onsuccess = (event) => {
				const cursor = event.target.result;
				if (cursor) {
					values.push(cursor.value);
					cursor.continue();
				}
			};
			txn.oncomplete = () => {
				resolve(values);
			};
		});
	}

	/**
	 * Insert in an object store a value. The key is optional, so leave it last
	 * @param {string} storeName Object store to create the object in
	 * @param {Object} value Value to store
	 * @param {(string|number)} [key] Optional. Key at which to store the object.
	 * @returns {Promise<Array<Object>>} A pair of [key, value] objects.
	 */
	insert(storeName, value, key) {
		return new Promise((resolve, reject) => {
			const store = this.getStoreTransaction(storeName, Idb.#READ_WRITE)[0];

			let query;
			if (key) {
				query = store.put(value, key);
			} else {
				query = store.put(value);
			}

			query.onsuccess = (event) => {
				resolve([event.target.result, value]);
			};

			query.onerror = (event) => {
				reject(event.target.errorCode);
			};
		});
	}

	/**
	 * Reads an object from the database given its' key
	 * @param {string} storeName Object store from where to read the object
	 * @param {(string|number)} key The identifier of the object
	 * @returns {Promise<Object>}
	 */
	get(storeName, key) {
		return new Promise((resolve, reject) => {
			const store = this.getStoreTransaction(storeName, Idb.#READ_ONLY)[0];
			const query = store.get(key);

			query.onsuccess = (event) => {
				if (!event.target.result) {
					reject(new Error(`The value with key ${key} not found`));
				} else {
					const value = event.target.result;
					resolve(value);
				}
			};
		});
	}

	/**
	 *
	 * @param {string} storeName Object store to look up
	 * @param {string} indexName Index Name from IndexedDb
	 * @param {IDBKeyRange} iDbKey Criteria to filter results
	 * @returns {Promise<Array<Object>>}
	 */
	getAllByIndex(storeName, indexName, iDbKey) {
		return new Promise((resolve) => {
			const st = this.getStoreTransaction(storeName, Idb.#READ_ONLY);
			const store = st[0];
			const txn = st[1];

			// console.log("Getting all by index", storeName, index, key)
			const values = [];
			store.index(indexName).openCursor(iDbKey).onsuccess = (event) => {
				const cursor = event.target.result;
				if (cursor) {
					values.push({ key: cursor.primaryKey, value: cursor.value });
					cursor.continue();
				}
			};

			txn.oncomplete = () => {
				resolve(values);
			};
		});
	}

	/**
	 * Count number of objects in store
	 * @param {string} storeName Object store to look up
	 * @returns {Promise<number>}
	 */
	count(storeName) {
		return new Promise((resolve) => {
			const store = this.getStoreTransaction(storeName, Idb.#READ_ONLY)[0];

			const query = store.count();
			query.onsuccess = () => {
				resolve(query.result);
			};
		});
	}

	/**
	 * TODO Check what result contains
	 * Deletes all of the objects in the store
	 * @param {string} storeName Object store to look up
	 * @returns {Promise<number>} Result or error code
	 */
	clear(storeName) {
		return new Promise((resolve, reject) => {
			const store = this.getStoreTransaction(storeName, Idb.#READ_WRITE)[0];

			const query = store.clear();
			query.onsuccess = (event) => {
				resolve(event.target.result);
			};
			query.onerror = (event) => {
				reject(event.target.errorCode);
			};
		});
	}

	/**
	 * Delete object from store by id.
	 * @param {string} storeName Object store to look up
	 * @param {(string|number)} key The identifier of the object
	 * @returns {Promise<undefined>}
	 */
	delete(storeName, key) {
		return new Promise((resolve, reject) => {
			const store = this.getStoreTransaction(storeName, Idb.#READ_WRITE)[0];
			const query = store.delete(key);

			query.onsuccess = (event) => {
				resolve(event.target.result);
			};

			// handle the error case
			query.onerror = (event) => {
				reject(event);
			};
		});
	}

	/**
	 * Puts all of the properties of the object in the store.
	 * Function is using the property name as store key and property value as store value
	 * @param {string} storeName Object store to look up
	 * @param {Array<String, any>} data enumerator returned by Object.entries(...)
	 * @returns {Promise<number>} Result
	 */
	async putAll(storeName, data) {
		return new Promise((resolve) => {
			const [store, transaction] = this.getStoreTransaction(storeName, Idb.#READ_WRITE);

			for (let i = 0; i < data.length; i += 1) {
				const value = data[i];
				const key = data[i].id;
				if (key) {
					store.put(value, key);
				} else {
					store.put(value);
				}
			}

			transaction.oncomplete = (event) => {
				resolve([event.target.result]);
			};
		});
	}

	/**
	 * Update all of the values in the object store.
	 * @param {string} storeName Object store to look up
	 * @param {Array<Object>} data Items to update in store.
	 * @returns
	 */
	async updateAll(storeName, data) {
		// console.log("IDB put all:", storeName, data);
		return new Promise((resolve) => {
			const [store, transaction] = this.getStoreTransaction(storeName, Idb.#READ_WRITE);
			for (let i = 0; i < data.length; i += 1) {
				const item = data[i];
				store.put(item.value, item.key);
			}

			transaction.oncomplete = (event) => {
				resolve([event.target.result]);
			};
		});
	}

	/**
	 * Check if object store exists in the current database instance
	 * @param {string} storeName Object store to look up
	 * @returns {Boolean}
	 */
	hasObjectStore(storeName) {
		if (this.db.objectStoreNames.contains(storeName)) {
			return true;
		}
		return false;
	}

	/**
	 * Get an array with the names of all object stores
	 * @returns {Array<string>}
	 */
	getObjectStores() {
		return this.db.objectStoreNames;
	}

	/**
	 *
	 * @param {string} storeName Object store to look up
	 * @param {string} mode #READ_ONLY or #READ_WRITE
	 * @returns {Array<Object>}
	 */
	getStoreTransaction(storeName, mode) {
		if (!this.db.objectStoreNames.contains(storeName)) {
			return undefined;
		}

		const txn = this.db.transaction(storeName, mode);
		const store = txn.objectStore(storeName);

		return [store, txn];
	}
}
