export default class Idb {
	static #READ_ONLY = 'readonly';

	static #READ_WRITE = 'readwrite';

	/** @type {IDBDatabase} */
	#db = undefined;

	/** @type {upgradeCallback} */
	#upgradeCallback = undefined;

	/**
	 * Avoid opening multiple IDBDatabases to be able to easily close the on update.
	 * @type {Array<Idb>}
	 * */
	static #connectedIdbs = [];

	/**
	 * Constructs, opens and initializes an instance of Idb objects
	 * @param {string} dbName Name of the database to open
	 * @param {upgradeDbCallback} upgradeCallback function to call when updating db
	 * @returns {Promise<Idb>}
	 */
	static async of(dbName, upgradeCallback) {
		const connectedIdb = Idb.#connectedIdbs.find((idb) => idb.#db.name === dbName);
		if (connectedIdb) return connectedIdb;

		const db = await Idb.#open(dbName, undefined, upgradeCallback);
		const newIdb = new Idb(db, upgradeCallback);
		Idb.#connectedIdbs.push(newIdb);
		return newIdb;
	}

	/**
	 * Recoomendation is to not construct Idb objects directly.
	 * Use Idb.of() to initialize more efficient instances
	 * @constructor
	 * @param {IDBDatabase} db Database instance
	 * @param {upgradeDbCallback} upgradeCallback function to call when creating new object stores
	 */
	constructor(db, upgradeCallback) {
		this.#db = db;
		this.#upgradeCallback = upgradeCallback;
	}

	/**
	 * @typedef {function(db:db, number, number, Array<string>)} upgradeCallback
	 * @callback upgradeDbCallback
	 * @param {db} db Database to be upgraded.
	 * @param {number} oldVersion Version from which to upgrade
	 * @param {number} newVersion Version to which to upgrade.
	 * @param {Array<string>} storeNames Store names to create on upgrade.
	 * @returns {void}
	 */

	/**
	 * Opens an IndexedDb Database
	 * @param {string} dbName Database name
	 * @param {upgradeDbCallback} upgradeCallback called in case the database needs upgrage
	 * @returns {Promise<IDBDatabase>}
	 */
	static #open(dbName, version, upgradeCallback) {
		return new Promise((resolve, reject) => {
			const request = indexedDB.open(dbName, version);

			request.onsuccess = (event) => {
				const db = event.target.result;
				resolve(db);
			};

			request.onerror = (event) => {
				reject(new Error(`Database error: ${event.target.error}`));
			};

			request.onupgradeneeded = (event) => {
				const db = event.target.result;
				if (upgradeCallback) {
					const defaultStore = new Date().getFullYear();
					upgradeCallback(db, event.oldVersion, event.newVersion, [`${defaultStore}`]);
				}
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
			if (key !== undefined) {
				query = store.put(value, key);
			} else {
				query = store.put(value);
			}

			query.onsuccess = (event) => {
				resolve([event.target.result, value]);
			};

			query.onerror = (event) => {
				reject(new Error(event.target.errorCode));
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
					reject(new Error(`The value with key ${key} not found in store ${storeName}. ${this}`));
				} else {
					const value = event.target.result;
					resolve(value);
				}
			};
		});
	}

	/**
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

			const values = [];
			store.index(indexName).openCursor(iDbKey).onsuccess = (event) => {
				const cursor = event.target.result;
				if (cursor) {
					cursor.value.id = cursor.primaryKey;
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
	 * @param {string} storeName Object store to look up
	 * @param {IDBKeyRange} iDbKey Criteria to filter results
	 * @returns {Promise<Array<Object>>}
	 */
	readAll(storeName, iDbKey = undefined) {
		return new Promise((resolve) => {
			const st = this.getStoreTransaction(storeName, Idb.#READ_ONLY);
			const store = st[0];
			const txn = st[1];

			let values = [];
			const request = store.getAll(iDbKey);
			request.onsuccess = () => {
				values = request.result;
			};

			txn.oncomplete = () => {
				resolve(values);
			};
		});
	}

	/**
	 * Returns all the values from an object store
	 * @param {string} storeName Store from which to get the data
	 * @returns {Promise<Array<Object>>}
	 */
	getAll(storeName) {
		return new Promise((resolve) => {
			const st = this.getStoreTransaction(storeName, Idb.#READ_ONLY);
			const store = st[0];
			const txn = st[1];

			let values = [];
			const request = store.getAll();
			request.onsuccess = () => {
				values = request.result;
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
				if (key !== undefined) {
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
	 * Check if object store exists in the current database instance
	 * @param {string} storeName Object store to look up
	 * @returns {Boolean}
	 */
	hasObjectStore(storeName) {
		if (this.#db.objectStoreNames.contains(storeName)) {
			return true;
		}
		return false;
	}

	/**
	 * Get an array with the names of all object stores
	 * @returns {Array<string>}
	 */
	getObjectStores() {
		/** @type {Array<string>} */
		const objectStoreNames = [];
		/** @type {DOMStringList} */

		const domStringList = this.#db.objectStoreNames;
		for (let index = 0; index < domStringList.length; index += 1) {
			objectStoreNames.push(domStringList.item(index));
		}
		return objectStoreNames;
	}

	/**
	 * !! This increments the database version !!
	 * @param {Array<string>} storeNames
	 * @returns {Promise<IDBDatabase>}
	 */
	createObjectStores(storeNames) {
		return new Promise((resolve, reject) => {
			const { name, version } = this.#db;
			this.#db.close();
			const request = indexedDB.open(name, version + 1);

			request.onsuccess = (event) => {
				const db = event.target.result;
				this.#db = db;
				resolve(db);
			};

			request.onerror = (event) => {
				reject(new Error(`Database error: ${event.target.error}`));
			};

			request.onupgradeneeded = (event) => {
				const db = event.target.result;
				if (this.#upgradeCallback) {
					this.#upgradeCallback(db, event.oldVersion, event.newVersion, storeNames);
				}
			};

			request.onblocked = (event) => {
				throw Error(`Request was blocked: ${event.newVersion}`);
			};
		});
	}

	/**
	 *
	 * @param {string} storeName Object store to look up
	 * @param {string} mode #READ_ONLY or #READ_WRITE
	 * @returns {[IDBObjectStore, IDBTransaction]}
	 */
	getStoreTransaction(storeName, mode) {
		if (!this.#db.objectStoreNames.contains(storeName)) {
			return undefined;
		}

		const txn = this.#db.transaction(storeName, mode);
		const store = txn.objectStore(storeName);

		return [store, txn];
	}
}
