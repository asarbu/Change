class SpendingGDrive {
	/**
	 * Used for quick access of local data.
	 * @type {SpendingCache}
	 */
	#spendingsCache = undefined;
	/**
	 * @type {GDrive}
	 */
	#gDrive = undefined;

    constructor(spendingsCache) {
		this.#gDrive = new GDrive();
		this.#spendingsCache = spendingsCache;
    }

    async init() {
		await this.#gDrive.init();
    }

	async fetchCacheToGDrive(year, month, localSpendings) {
		const monthFileId = await this.getMonthFileId(year, month);

		if(!monthFileId) {
			await this.createFile(year, month, localSpendings);
		} else {
			await this.#gDrive.update(monthFileId, localSpendings);
		}
	}

	async fetchGDriveToCache(year, month) {
		const monthFileId = await this.getMonthFileId(year, month);
		if(!monthFileId) {
			await this.createFile(year, month, []);
			return;
		}

		const gDriveSpendings = await this.#gDrive.readFile(monthFileId);
		if(!gDriveSpendings) {
			await this.createFile(year, month, []);
			return;
		}
		
		this.#spendingsCache.updateAll(year, Object.values(gDriveSpendings));
		return true;
	} 

	async getLastUpdatedTime(year, month) {
		//console.log("spendingGdrive.getLastUpdatedTime", year, month);
		const fileId = await this.getMonthFileId(year, month);
		if(!fileId) {
			console.error("No file id provided!");
			return new Date().toISOString();
		}
		
		const metadata = await this.#gDrive.readFileMetadata(fileId, GDrive.MODIFIED_TIME_FIELD);
		if(metadata)
			return metadata[GDrive.MODIFIED_TIME_FIELD];

		return new Date().toISOString();
	}

	getGdriveFileIdFromLocalStorage(year, month) {
		return localStorage.getItem("gDrive_fileId_" + year + month);
	}

	setGdriveFileIdToLocalStorage(year, month, fileId) {
		if(!year || !month || !fileId) {
			var err = new Error();
			localStorage.setItem("Error_setGdriveFileIdToLocalStorage", year + "," + month + "," + fileId + "." + err.stack);
			console.errror("missing one parameter");
			return;
		}
		localStorage.setItem("gDrive_fileId_" + year + month, fileId);
	}

	async createFile(year, month, localSpendings) {
		const yearFolderId = await this.getYearFolderId(year);
		const fileId = await this.#gDrive.writeFile(yearFolderId, month + ".json", localSpendings);
		if(!fileId) {
			console.log("No file id generated", yearFolderId, month, localSpendings)
		}
		await this.setGdriveFileIdToLocalStorage(year, month, fileId);
	}

	async readAll(monthFileId) {
		return await this.#gDrive.readFile(monthFileId);
	}

	async getYearFolderId(year) {
		if(localStorage.getItem(year)) {
			return localStorage.getItem(year);
		}

		const APP_FOLDER = "Change!";
		var topFolder = await this.#gDrive.findChangeAppFolder();

		if (!topFolder) {
			topFolder = await this.#gDrive.createFolder(APP_FOLDER);
		}
		if(!topFolder) return;

		var yearFolder = await this.#gDrive.findFolder(year, topFolder);
		if(!yearFolder) {
			yearFolder = await this.#gDrive.createFolder(year, topFolder);
		}

		localStorage.setItem(year, yearFolder);
		return yearFolder;
	}

	async getMonthFileId(year, month) {
		let spendingGDriveData = this.getGdriveFileIdFromLocalStorage(year, month);
		
		//Not found in memory, look on drive
		if(!spendingGDriveData) {
			const monthFileName = month + ".json";
			const yearFolderId = await this.getYearFolderId(year);
			const networkFileId = await this.#gDrive.findFile(monthFileName, yearFolderId);
				
			if(!networkFileId) return;
			
			this.setGdriveFileIdToLocalStorage(year, month, networkFileId);
			return networkFileId;
		}
		return spendingGDriveData;
	}
	
	equals(thisSpending, thatSpending) {
		return thisSpending.bought_date === thatSpending.bought_date &&
			thisSpending.category === thatSpending.category &&
			thisSpending.description === thatSpending.description &&
			thisSpending.price === thatSpending.price &&
			thisSpending.type === thatSpending.type;
	}

	async insert(values, key) {
		await this.spendingsCache.insert(values, key);
		await this.mergeLocalSpendingsToNetwork();
	}
}