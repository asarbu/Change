class SpendingCache {
	static SPENDINGS_DATABASE_NAME = 'Spendings';
	/**
	 * @type {Idb}
	 */
	idb = undefined;
    constructor() {
		this.year = new Date().getFullYear();
		this.idb = new Idb(SpendingCache.SPENDINGS_DATABASE_NAME, this.year, this.upgradeSpendingsDb);
    }

    async init() {
		await this.idb.init();
    }

	async read(key) {
		return await this.idb.get(this.year, key);
	}

	async readAll(year, month) {
		//Hack from https://stackoverflow.com/questions/9791219/indexeddb-search-using-wildcards
		const keyRange = IDBKeyRange.bound(month, month + '\uffff');
		return await this.idb.getAllByIndex(year, 'byBoughtDate', keyRange)
	}

	async readAllDeleted() {
		//We have to use integer here because idnexedbb does not allow boolean indeces
		const keyRange = IDBKeyRange.only(1);
		return await this.idb.getAllByIndex(this.year, 'byDeleteStatus', keyRange);
	}

	async updateAll(year, spendings) {
		// for(const [key, spending] of spendings) {
		// 	await this.insert(year, key, spending);
		// }
		await this.idb.updateAll(year, spendings);
	}

	async insert(year, creationDateTime, spending) {
		await this.idb.put(this.year, spending, creationDateTime);
		this.setLastUpdatedTime(this.year, spending.month);
	}

	async delete(spending) {
		await this.idb.delete(this.year, spending.key);		
		this.setLastUpdatedTime(this.year, spending.value.month);
	}

	getLastUpdatedTime(year, month) {
		if(localStorage.getItem("Cache_modified_" + year + month)) {
			return localStorage.getItem("Cache_modified_" + year + month);
		}
		return new Date(0).toISOString();
	}

	setLastUpdatedTime(year, month, time) {
		if(!year || !month) {
			console.error("Illegal arguments!", year, month, time);
			return;
		}
		if(time) {	
			localStorage.setItem("Cache_modified_" + year + month, time);
			return;
		}
		localStorage.setItem("Cache_modified_" + year + month, new Date().toISOString());
	}

	upgradeSpendingsDb(db, oldVersion, newVersion) {
		console.log("Upgrading to version", new Date().getFullYear());

		if (oldVersion < newVersion) {
			let store = db.createObjectStore(newVersion + "", { autoIncrement: true });
			store.createIndex('byBoughtDate', 'boughtDate', { unique: false });
			store.createIndex('byCategory', 'category', { unique: false });
			store.createIndex('byDeleteStatus', 'isDeleted', { unique: false });
			store.createIndex('byMonth', 'month', { unique: false });
			store.createIndex('byMonthAndCategory', ['month', 'category'], { unique: false });
		}
	}
}