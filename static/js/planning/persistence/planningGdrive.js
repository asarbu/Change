import GDrive from '../../common/persistence/gDrive.js';
import GDriveFileInfo from '../../common/persistence/gDriveFileInfo.js';
import LocalStorage from '../../common/persistence/localStorage.js';
import Utils from '../../common/utils/utils.js';
import Planning from '../model/planningModel.js';

export default class PlanningGDrive {
	/** @type {number} */
	#year = undefined;

	/** @type {string} */
	#yearFolderId = undefined;

	/** @type {string} */
	#planningFolderId = undefined;

	/** @type {LocalStorage} */
	#localStorage = undefined;

	/** @type {GDrive} */
	#gDrive = undefined;

	/** @type {boolean} */
	#rememberLogin = false;

	/** @type {boolean} */
	#initialized = false;

	/**
	 * @param {number} forYear
	 * @param {boolean} rememberLogin
	 * @returns {Promise<PlanningGDrive>}
	 */
	static async get(forYear, rememberLogin) {
		const planningDrive = new PlanningGDrive(forYear, rememberLogin);
		await planningDrive.init();
		return planningDrive;
	}

	/**
	 * @param {number} forYear
	 * @param {boolean} rememberLogin
	 */
	constructor(forYear, rememberLogin = false) {
		this.#year = forYear;
		this.#rememberLogin = rememberLogin;
	}

	async init() {
		this.#gDrive = await GDrive.get(this.#rememberLogin);
		this.#localStorage = new LocalStorage(LocalStorage.GDRIVE_FILES_KEY);

		let changeAppFolderId = await this.#gDrive.findChangeAppFolder();
		if (!changeAppFolderId) {
			changeAppFolderId = await this.#gDrive.createFolder(GDrive.APP_FOLDER);
		}
		if (!changeAppFolderId) throw Error('Could not create "Change" folder in GDrive');

		let planningFolderId = await this.#gDrive.findFolder('Planning', changeAppFolderId);
		if (!planningFolderId) {
			planningFolderId = await this.#gDrive.createFolder('Planning', changeAppFolderId);
		}
		if (!planningFolderId) throw Error('Could not create "Planning" folder in GDrive');
		this.#planningFolderId = planningFolderId;

		let yearFolderId = await this.#gDrive.findFolder(`${this.#year}`, planningFolderId);
		if (!yearFolderId) {
			yearFolderId = await this.#gDrive.createFolder(`${this.#year}`, planningFolderId);
		}
		if (!yearFolderId) throw Error(`Could not create Planning folder ${this.#year} in GDrive`);

		this.#yearFolderId = yearFolderId;
		this.#initialized = true;
	}

	// #region CRUD operations
	/**
	 * @param {Planning} planning
	 */
	async store(planning) {
		if (!this.#initialized) await this.init();
		const gdriveFile = await this.#initializeLocalStorageFile(planning.month);
		this.#markDirty(gdriveFile);
		const fileName = this.#buildFileName(planning.month);
		const fileId = await this.#gDrive.writeFile(this.#yearFolderId, fileName, planning, true);
		const gDriveMetadata = await this.#gDrive.readFileMetadata(fileId, GDrive.MODIFIED_TIME_FIELD);
		const modifiedTime = new Date(gDriveMetadata[GDrive.MODIFIED_TIME_FIELD]).getTime();
		gdriveFile.modified = modifiedTime;
		gdriveFile.gDriveId = fileId;
		this.#markClean(gdriveFile);
	}

	async delete(planning) {
		if (!this.#initialized) await this.init();
		const localStorageFile = await this.#initializeLocalStorageFile(planning.month);
		return this.#gDrive.delete(localStorageFile.gDriveId);
	}

	/**
	 * Returns stored Planning or undefined.
	 * Updates the modified date in local storage
	 * @param {number} forMonth
	 * @returns {Promise<Planning>}
	 */
	async read(forMonth) {
		if (!this.#initialized) await this.init();
		const localStorageFile = await this.#initializeLocalStorageFile(forMonth);
		if (!localStorageFile.gDriveId) {
			return undefined;
		}
		this.#updateLocalStorageModifiedField(localStorageFile.id);
		const gDriveFile = await this.#gDrive.readFile(localStorageFile.gDriveId);
		return Planning.fromJavascriptObject(gDriveFile);
	}

	async readAll() {
		if (!this.#initialized) await this.init();
		const children = await this.#gDrive.getChildren(this.#yearFolderId);
		return children;
	}

	async updateAll(planningCollections) {
		if (!this.#initialized) await this.init();
		await this.store(planningCollections);
	}

	// #endregion

	// #region file handling
	/**
	 * Returns true if file has been modified since last reading of the file.
	 * @param {number} forMonth
	 * @returns {Promise<boolean>}
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
				return true;
			}
		}
		return false;
	}

	async fileExists(forMonth) {
		if (!this.#initialized) await this.init();
		const localStorageFile = await this.#initializeLocalStorageFile(forMonth);
		return localStorageFile.gDriveId === undefined;
	}

	async availableYears() {
		if (!this.#initialized) await this.init();
		if (!this.#planningFolderId) return [];
		const yearFolders = await this.#gDrive.getChildren(this.#planningFolderId);
		if (!yearFolders) return [];
		return yearFolders.files.map((yearFolder) => yearFolder.name);
	}

	async availableMonths() {
		if (!this.#initialized) await this.init();
		if (!this.#yearFolderId) return [];
		const monthFiles = await this.#gDrive.getChildren(this.#yearFolderId);
		if (!monthFiles) return [];
		return monthFiles.files.map((monthFile) => monthFile.name);
	}

	// #region GDrive LocalStorage operations
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

	/**
	 * Reads file metadata from localStorage and GDrive.
	 * Initializes an empty one in case none is found
	 * @param {number} forMonth
	 * @returns {Promise<GDriveFileInfo>}
	 */
	async #initializeLocalStorageFile(forMonth) {
		if (!this.#initialized) await this.init();
		const fileName = this.#buildFileName(forMonth);
		let localStorageFile = this.#localStorage.readById(fileName);
		if (!localStorageFile || !localStorageFile.gDriveId) {
			const gDriveId = await this.#gDrive.findFile(fileName, this.#yearFolderId);
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
		return `Planning_${this.#year}_${Utils.nameForMonth(forMonth)}.json`;
	}
	// #endregion
}
