import GDrive from '../../persistence/gDrive.js';
import SpendingCache from './spendingCache.js';

export default class SpendingGDrive {
	/**
	 * Used for quick access of local data.
	 * @type {SpendingCache}
	 */
	#spendingsCache = undefined;

	/**
	 * @type {GDrive}
	 */
	#gDrive = undefined;

	#year = undefined;

	/** @type {Array<SpendingGDrive>} */
	static #initializedGDrives = [];

	static async getAll() {
		const rememberLogin = true;
		const gDrive = await GDrive.get(rememberLogin);
		await gDrive.init();
		const root = await gDrive.findChangeAppFolder();
		const children = await gDrive.getChildren(root);
		return children;
	}

	static async get(forYear) {
		const rememberLogin = true;
		const initializedSpending = this.#initializedGDrives.find((init) => init.#year === forYear);
		if (initializedSpending) return initializedSpending;

		const gDrive = await GDrive.get(rememberLogin);
		gDrive.init();
		const spendingGDrive = new SpendingGDrive(forYear, gDrive);
		this.#initializedGDrives.push(spendingGDrive);
		return spendingGDrive;
	}

	/**
	 * Use Get static factory method to instantiate this class
	 * @param {GDrive} gDrive Gdrive associated with this object
	 * @param {number} forYear Year folder to bind the logic to
	 */
	constructor(forYear, gDrive) {
		this.#gDrive = gDrive;
		this.#year = forYear;
	}

	async init() {
		await this.#gDrive.init();
	}

	async fetchCacheToGDrive(month, localSpendings) {
		const monthFileId = await this.getMonthFileId(this.#year, month);

		if (!monthFileId) {
			await this.createFile(this.#year, month, localSpendings);
		} else {
			await this.#gDrive.update(monthFileId, localSpendings);
		}
	}

	async fetchGDriveToCache(month) {
		const monthFileId = await this.getMonthFileId(this.#year, month);
		if (!monthFileId) {
			await this.createFile(this.#year, month, []);
			return;
		}

		const gDriveSpendings = await this.#gDrive.readFile(monthFileId);
		if (!gDriveSpendings) {
			await this.createFile(this.#year, month, []);
			return;
		}

		this.#spendingsCache.updateAll(this.#year, Object.values(gDriveSpendings));
	}

	async lastUpdatedTime(forMonth) {
		const fileId = await this.getMonthFileId(forMonth);
		if (!fileId) {
			// Not updated before. Return 1970 to force update
			return new Date(0).toISOString();
		}

		const metadata = await this.#gDrive.readFileMetadata(fileId, GDrive.MODIFIED_TIME_FIELD);
		if (metadata) return metadata[GDrive.MODIFIED_TIME_FIELD];

		return new Date().toISOString();
	}

	storeGDriveFileId(year, month, fileId) {
		if (!year || !month || !fileId) {
			throw new Error(`StoreGdriveFileId ${year},${month},${fileId}`);
		}
		localStorage.setItem(`gDrive_fileId_${year}${month}`, fileId);
	}

	async createFile(year, month, localSpendings) {
		const yearFolderId = await this.getYearFolderId(year);
		const fileId = await this.#gDrive.writeFile(yearFolderId, `${month}.json`, localSpendings);
		if (!fileId) {
			throw Error(`No file id generated, ${yearFolderId}, ${month}, ${localSpendings}`);
		}
		await this.storeGDriveFileId(year, month, fileId);
	}

	async readAll(monthFileId) {
		return this.#gDrive.readFile(monthFileId);
	}

	async getYearFolderId(year) {
		if (localStorage.getItem(year)) {
			return localStorage.getItem(year);
		}

		const APP_FOLDER = 'Change!';
		let topFolder = await this.#gDrive.findChangeAppFolder();

		if (!topFolder) {
			topFolder = await this.#gDrive.createFolder(APP_FOLDER);
		}
		if (!topFolder) return undefined;

		let yearFolder = await this.#gDrive.findFolder(year, topFolder);
		if (!yearFolder) {
			yearFolder = await this.#gDrive.createFolder(year, topFolder);
		}
		if (!yearFolder) return undefined;

		localStorage.setItem(year, yearFolder);
		return yearFolder;
	}

	async getMonthFileId(year, month) {
		const fileId = localStorage.getItem(`gDrive_fileId_${year}${month}`);

		// Not found in memory, look on drive
		if (!fileId) {
			const monthFileName = `${month}.json`;
			const yearFolderId = await this.getYearFolderId(year);
			const networkFileId = await this.#gDrive.findFile(monthFileName, yearFolderId);

			if (!networkFileId) return undefined;

			this.storeGDriveFileId(year, month, networkFileId);
			return networkFileId;
		}
		return fileId;
	}

	async insert(values, key) {
		await this.spendingsCache.insert(values, key);
		await this.mergeLocalSpendingsToNetwork();
	}
}
