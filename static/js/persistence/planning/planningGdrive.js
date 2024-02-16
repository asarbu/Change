class PlanningGDrive {
	/**
	 * #planningCache used during sync process
	 * @type {PlanningCache}
	 * @public
	 */
	#planningCache = undefined;

	/**
	 * 
	 * @param {PlanningCache} planningCache - Cache to use during sync process
	 */
    constructor(planningCache) {
		this.#planningCache = planningCache;
		this.gdrive = new GDrive();
    }

    async init() {
        await this.gdrive.init();
    }
	//#region Network operations
	async syncToNetwork() {
		await this.mergeLocalPlanningToNetwork(false);
	}


	areEqual(networkEntry, localEntry) {
		if(networkEntry === undefined || localEntry === undefined) 
			return false;
		return 	networkEntry.name === localEntry.name && 
				networkEntry.daily === localEntry.daily &&
				networkEntry.monthly === localEntry.monthly &&
				networkEntry.yearly === localEntry.yearly;
	}


	//#endregion
	
	//#region CRUD operations
	async write(planningCollections) {
		await this.gdrive.writeFile(APP_FOLDER, PLANNING_FILE_NAME, planningCollections, true);
	}

	async readAll() {
		let	networkFileId = await this.getGdriveFileId();
		if(!networkFileId)
			return;

		return await this.gdrive.readFile(networkFileId);		
	}

	async updateAll(planningCollections) {
		await this.write(planningCollections);
	}

	/**
	 * Synchronizes the local planning cache to GDrive
	 * @returns {bool} Needs GUI refresh
	 */
	async syncGDrive() {
		console.log("Syncing GDrive");
		const networkCollections = await this.readAll();
		//console.log("Network collections", networkCollections)
		if(!networkCollections) {
			//We don't know if the collections are not present because the file is empty or because it does not exist
			const localCollections = await this.#planningCache.readAll();
			await this.write(localCollections);
		} else {
			const cacheModifiedTime = localStorage.getItem(GDrive.MODIFIED_TIME_FIELD);
			const gDriveModifiedTime = await this.getGdriveModifiedTime();
			//console.log(cacheModifiedTime, gDriveModifiedTime)

			if(!cacheModifiedTime || cacheModifiedTime < gDriveModifiedTime) {
				console.log("Updating local with data from GDrive")
				await this.#planningCache.updateAll(Object.entries(networkCollections));
				localStorage.setItem(GDrive.MODIFIED_TIME_FIELD, gDriveModifiedTime);
				return true;
			} else if(cacheModifiedTime > gDriveModifiedTime) {
				console.log("Updating GDrive with data from local")
				const localCollections = await this.#planningCache.readAll();
				await this.updateAll(localCollections);
				//console.log("Updated gdrive with", localCollections);
				localStorage.setItem(GDrive.MODIFIED_TIME_FIELD, await this.getGdriveModifiedTime());
			}
		}
		return false;
	}

	async getGdriveModifiedTime() {
		const networkFileId = await this.getGdriveFileId();
		const metadata = await this.gdrive.readFileMetadata(networkFileId, GDrive.MODIFIED_TIME_FIELD);
		return metadata[GDrive.MODIFIED_TIME_FIELD];
	}

	//#endregion

	async getGdriveFileId() {
		const networkFileId = localStorage.getItem(PLANNING_FILE_NAME);
		if(networkFileId) 
			return networkFileId;

		var topFolder = await this.gdrive.findChangeAppFolder();
		if (!topFolder) {
			topFolder = await this.gdrive.createFolder(APP_FOLDER);
			if(!topFolder) return;
		}

		let fileId = await this.gdrive.findFile(PLANNING_FILE_NAME, topFolder);
		if(!fileId) {
			fileId = await this.gdrive.writeFile(topFolder, PLANNING_FILE_NAME, '', true);
			if(!fileId)	return;
		}

		//Store file id for fast retrieval
		localStorage.setItem(PLANNING_FILE_NAME, fileId);
		return fileId;
	}
}