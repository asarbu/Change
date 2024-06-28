import GDrive from '../../common/persistence/gDrive.js';
import GDriveFileInfo from '../../common/persistence/gDriveFileInfo.js';
import LocalStorage from '../../common/persistence/localStorage.js';
import { Statement } from '../../planning/model/planningModel.js';
import Utils from '../../common/utils/utils.js';
import Spending from '../model/spending.js';

export default class SpendingGDrive {
	/**
	 * @type {GDrive}
	 */
	#gDrive = undefined;

	/** @type {number} */
	#year = undefined;

	/** @type {string} */
	#gDriveFolderId = undefined;

	/** @type {LocalStorage} */
	#localStorage = undefined;

	/** @type {boolean} */
	#rememberLogin = false;

	#initialized = false;

	static async getAll() {
		const gDrive = await GDrive.get(true);
		await gDrive.init();
		const root = await gDrive.findChangeAppFolder();
		const children = await gDrive.getChildren(root);
		return children;
	}

	static async get(forYear) {
		const spendingGDrive = new SpendingGDrive(forYear, true);
		await spendingGDrive.init();
		return spendingGDrive;
	}

	/**
	 * Use Get static factory method to instantiate this class
	 * @param {number} forYear Year folder to bind the logic to
	 */
	constructor(forYear, rememberLogin) {
		this.#year = forYear;
		this.#rememberLogin = rememberLogin;
	}

	/**
	 * @param {boolean} forceInit Forces a reinitialization of the object
	 */
	async init(forceInit) {
		if (!forceInit && this.#initialized) return true;

		this.#gDrive = await GDrive.get(this.#rememberLogin);
		this.#localStorage = new LocalStorage(LocalStorage.GDRIVE_FILES_KEY);

		const changeAppFolder = await this.#initializeGdriveFileById(GDrive.APP_FOLDER);
		if (!changeAppFolder.gDriveId) {
			changeAppFolder.gDriveId = await this.#gDrive.findChangeAppFolder();
			if (!changeAppFolder.gDriveId) {
				changeAppFolder.gDriveId = await this.#gDrive.createFolder(GDrive.APP_FOLDER);
			}
			if (!changeAppFolder.gDriveId) throw Error('Could not create "Change" folder in GDrive');
			this.#localStorage.store(changeAppFolder);
		}

		const spendingFolder = await this.#initializeGdriveFileById('Spending');
		if (!spendingFolder.gDriveId) {
			spendingFolder.gDriveId = await this.#gDrive.findFolder('Spending', changeAppFolder.gDriveId);
			if (!spendingFolder.gDriveId) {
				spendingFolder.gDriveId = await this.#gDrive.createFolder('Spending', changeAppFolder.gDriveId);
			}
			if (!spendingFolder.gDriveId) throw Error('Could not create "Spending" folder in GDrive');
			this.#localStorage.store(spendingFolder);
		}

		const yearLocalStorageId = `Spending_${this.#year}`;
		const yearFolder = await this.#initializeGdriveFileById(yearLocalStorageId);
		if (!yearFolder.gDriveId) {
			yearFolder.gDriveId = await this.#gDrive.findFolder(`${this.#year}`, spendingFolder.gDriveId);
			if (!yearFolder.gDriveId) {
				yearFolder.gDriveId = await this.#gDrive.createFolder(`${this.#year}`, spendingFolder.gDriveId);
			}
			if (!yearFolder.gDriveId) throw Error(`Could not create Spending folder for ${this.#year} in GDrive`);
			this.#localStorage.store(yearFolder);
		}

		this.#gDriveFolderId = yearFolder.gDriveId;
		this.#initialized = true;
		return true;
	}

	/**
	 * @param {string} id
	 * @returns {Promise<GDriveFileInfo>}
	 */
	async #initializeGdriveFileById(id) {
		let localStorageFile = this.#localStorage.readById(id);
		if (!localStorageFile) {
			localStorageFile = new GDriveFileInfo(id, undefined, 0);
			this.#localStorage.store(localStorageFile);
		}
		return localStorageFile;
	}

	/**
	 * @param {number} forMonth
	 * @returns {Promise<Array<Spending>>}
	 */
	async readAll(forMonth) {
		if (!this.#initialized) await this.init();
		const localStorageFile = await this.#initializeLocalStorageFile(forMonth);
		if (!localStorageFile.gDriveId) {
			return [];
		}
		this.#updateLocalStorageModifiedField(localStorageFile.id);
		/** @type {Array} */
		const array = await this.#gDrive.readFile(localStorageFile.gDriveId);
		const spendings = [];
		array.forEach((value) => {
			let date;
			// TODO remove this after migration of old version
			if (value.boughtDate) {
				date = new Date(this.#year, forMonth, value.boughtDate.split(' ')[1]);
			} else {
				date = new Date(value.spentOn);
			}
			const spending = new Spending(
				value.id,
				Statement.EXPENSE,
				date,
				value.category,
				value.description,
				+value.price,
			);
			spendings.push(spending);
		});

		return spendings;
	}

	/**
	 * @param {Spending} spending
	 */
	async store(spending) {
		if (!this.#initialized) await this.init();
		const month = spending.spentOn.getMonth();
		const gdriveFile = await this.#initializeLocalStorageFile(month);
		this.#markDirty(gdriveFile);
		const fileName = this.#buildFileName(month);
		const spendings = await this.readAll(month);
		spendings.push(spending);
		const fileId = await this.#gDrive.writeFile(this.#gDriveFolderId, fileName, spendings, true);
		const gDriveMetadata = await this.#gDrive.readFileMetadata(fileId, GDrive.MODIFIED_TIME_FIELD);
		const modifiedTime = new Date(gDriveMetadata[GDrive.MODIFIED_TIME_FIELD]).getTime();
		gdriveFile.modified = modifiedTime;
		gdriveFile.gDriveId = fileId;
		this.#markClean(gdriveFile);
	}

	/**
	 * @param {Array<Spending>} spendings
	 * @param {number} forMonth
	 */
	async storeSpendings(spendings, forMonth) {
		if (!this.#initialized) await this.init();
		const gdriveFile = await this.#initializeLocalStorageFile(forMonth);
		this.#markDirty(gdriveFile);
		const fileName = this.#buildFileName(forMonth);
		const fileId = await this.#gDrive.writeFile(this.#gDriveFolderId, fileName, spendings, true);
		const gDriveMetadata = await this.#gDrive.readFileMetadata(fileId, GDrive.MODIFIED_TIME_FIELD);
		const modifiedTime = new Date(gDriveMetadata[GDrive.MODIFIED_TIME_FIELD]).getTime();
		gdriveFile.modified = modifiedTime;
		gdriveFile.gDriveId = fileId;
		this.#markClean(gdriveFile);
	}

	/**
	 * @param {number} forMonth
	 */
	async fileChanged(forMonth) {
		if (!this.#initialized) await this.init();
		const localStorageFile = await this.#initializeLocalStorageFile(forMonth);
		const gDriveFileId = localStorageFile.gDriveId;
		if (gDriveFileId) {
			const metadata = await this.#gDrive
				.readFileMetadata(gDriveFileId, GDrive.MODIFIED_TIME_FIELD);
			const modifiedTime = new Date(metadata[GDrive.MODIFIED_TIME_FIELD]).getTime();
			if (localStorageFile.modified < modifiedTime) {
				return { oldModified: localStorageFile.modified, newModified: modifiedTime };
			}
		}
		return undefined;
	}

	async deleteFile(forMonth) {
		if (!this.#initialized) await this.init();
		const file = await this.#initializeLocalStorageFile(forMonth);
		if (file.gDriveId) this.#gDrive.deleteFile(file.gDriveId);
	}

	/**
	 * Reads file metadata from localStorage and GDrive.
	 * Initializes an empty one in case none is found
	 * @param {number} forMonth
	 * @returns {Promise<GDriveFileInfo>}
	 */
	async #initializeLocalStorageFile(forMonth) {
		if (!this.#gDriveFolderId) throw new Error('Spending Gdrive not properly initialized');
		const fileName = this.#buildFileName(forMonth);
		let localStorageFile = this.#localStorage.readById(fileName);
		if (!localStorageFile || !localStorageFile.gDriveId) {
			const gDriveId = await this.#gDrive.findFile(fileName, this.#gDriveFolderId);
			if (gDriveId) {
				// Store 0 in modified time to force load
				localStorageFile = new GDriveFileInfo(fileName, gDriveId, 0);
				this.#localStorage.store(localStorageFile);
			} else {
				localStorageFile = new GDriveFileInfo(fileName, undefined, 0, true);
			}
		}
		return localStorageFile;
	}

	async #updateLocalStorageModifiedField(fileId) {
		const localStorageFile = this.#localStorage.readById(fileId);
		const metadata = await this.#gDrive.readFileMetadata(
			localStorageFile.gDriveId,
			GDrive.MODIFIED_TIME_FIELD,
		);
		const modifiedTime = new Date(metadata[GDrive.MODIFIED_TIME_FIELD]).getTime();
		localStorageFile.modified = modifiedTime;
		this.#localStorage.store(localStorageFile);
	}

	#markDirty(gDriveFile) {
		const dirtyFile = gDriveFile;
		dirtyFile.dirty = true;
		this.#localStorage.store(dirtyFile);
	}

	#markClean(gDriveFile) {
		const cleanFile = gDriveFile;
		cleanFile.dirty = false;
		this.#localStorage.store(cleanFile);
	}

	#buildFileName(forMonth) {
		return `Spending_${this.#year}_${Utils.nameForMonth(forMonth)}.json`;
	}

	year() {
		return this.#year;
	}
}
