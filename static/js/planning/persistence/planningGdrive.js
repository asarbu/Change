import GDrive from '../../common/persistence/gDrive.js';
import GDriveFileInfo from '../../common/persistence/gDriveFileInfo.js';
import LocalStorage from '../../common/persistence/localStorage.js';
import Utils from '../../common/utils/utils.js';
import GDriveSettings from '../../settings/model/gDriveSettings.js';
import Planning from '../model/planningModel.js';

export default class PlanningGDrive {
	/** @type {boolean} */
	#initialized = false;

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

	/**
	 * @param {number} forYear
	 * @param {GDriveSettings} gDriveSettings
	 */
	constructor(forYear, gDriveSettings) {
		this.#year = forYear;
		this.#gDrive = new GDrive(gDriveSettings);
		this.#localStorage = new LocalStorage(LocalStorage.GDRIVE_FILES_KEY);
	}

	async init() {
		const changeAppFolder =  this.#initializeGdriveFileById(GDrive.APP_FOLDER);
		if (!changeAppFolder.gDriveId) {
			changeAppFolder.gDriveId = await this.#gDrive.findChangeAppFolder();
			if (!changeAppFolder.gDriveId) {
				changeAppFolder.gDriveId = await this.#gDrive.createFolder(GDrive.APP_FOLDER);
			}
			if (!changeAppFolder.gDriveId) throw Error('Could not create "Change" folder in GDrive');
			this.#localStorage.store(changeAppFolder);
		}

		const planningFolder = this.#initializeGdriveFileById('Planning');
		if (!planningFolder.gDriveId) {
			planningFolder.gDriveId = await this.#gDrive.findFolder('Planning', changeAppFolder.gDriveId);
			if (!planningFolder.gDriveId) {
				planningFolder.gDriveId = await this.#gDrive.createFolder('Planning', changeAppFolder.gDriveId);
			}
			if (!planningFolder.gDriveId) throw Error('Could not create "Planning" folder in GDrive');
			this.#localStorage.store(planningFolder);
		}
		this.#planningFolderId = planningFolder.gDriveId;

		const yearLocalStorageId = `Planning_${this.#year}`;
		const yearFolder = this.#initializeGdriveFileById(yearLocalStorageId);
		if (!yearFolder.gDriveId) {
			yearFolder.gDriveId = await this.#gDrive.findFolder(`${this.#year}`, planningFolder.gDriveId);
			if (!yearFolder.gDriveId) {
				yearFolder.gDriveId = await this.#gDrive.createFolder(`${this.#year}`, planningFolder.gDriveId);
			}
			if (!yearFolder.gDriveId) throw Error(`Could not create Planning folder for ${this.#year} in GDrive`);
			this.#localStorage.store(yearFolder);
		}

		this.#yearFolderId = yearFolder.gDriveId;
		this.#initialized = true;

		// TODO sync dirty plannings
	}

	// #region CRUD operations
	/**
	 * @param {Planning} planning
	 */
	async store(planning) {
		if (!this.#initialized) await this.init();
		const gdriveFile = await this.#initializeGDriveFile(planning.month);
		this.#markDirty(gdriveFile);
		const { fileName } = gdriveFile;
		const fileId = await this.#gDrive.writeFile(this.#yearFolderId, fileName, planning);
		if (!fileId) return undefined;
		const gDriveMetadata = await this.#gDrive.readFileMetadata(fileId, GDrive.MODIFIED_TIME_FIELD);
		const modifiedTime = new Date(gDriveMetadata[GDrive.MODIFIED_TIME_FIELD]).getTime();
		gdriveFile.modified = modifiedTime;
		gdriveFile.gDriveId = fileId;
		this.#markClean(gdriveFile);
		return fileId;
	}

	async delete(planning) {
		if (!this.#initialized) await this.init();
		const localStorageFile = await this.#initializeGDriveFile(planning.month);
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
		const localStorageFile = await this.#initializeGDriveFile(forMonth);
		if (!localStorageFile.gDriveId) {
			return undefined;
		}
		this.#updateLocalStorageModifiedField(localStorageFile.id);
		const gDriveFile = await this.#gDrive.readFile(localStorageFile.gDriveId);
		if (!gDriveFile) return undefined;
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
		const localStorageFile = await this.#initializeGDriveFile(forMonth);
		let { gDriveId } = localStorageFile;
		if (!gDriveId) {
			gDriveId = await this.#gDrive.findFile(localStorageFile.fileName, this.#yearFolderId);
			if (gDriveId) {
				localStorageFile.gDriveId = gDriveId;
				this.#localStorage.store(localStorageFile);
			}
		}
		if (!gDriveId) return false;

		const metadata = await this.#gDrive.readFileMetadata(gDriveId, GDrive.MODIFIED_TIME_FIELD);
		const modifiedTime = new Date(metadata[GDrive.MODIFIED_TIME_FIELD]).getTime();
		if (localStorageFile.modified < modifiedTime) {
			localStorageFile.modified = modifiedTime;
			this.#localStorage.store(localStorageFile);
			return true;
		}
		return false;
	}

	async fileExists(forMonth) {
		if (!this.#initialized) await this.init();
		const fileName = this.#buildFileName(forMonth);
		const gDriveId = await this.#gDrive.findFile(fileName, this.#yearFolderId);
		const localStorageFile = await this.#initializeGDriveFile(forMonth);
		localStorageFile.gDriveId = gDriveId;
		this.#localStorage.store(localStorageFile);
		return localStorageFile.gDriveId !== undefined;
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
		if (monthFiles.length === 0) return [];
		const regex = /.*_(.*).json/;
		return monthFiles.files.map((monthFile) => Utils.monthForName(monthFile.name.match(regex)[1]));
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
	async #initializeGDriveFile(forMonth) {
		// TODO merge together finding of file, reading modified date, and data.
		// This will merge together multiple requests
		if (!this.#initialized) await this.init();
		const fileName = this.#buildFileName(forMonth);
		return this.#initializeGdriveFileById(fileName);
	}

	/**
	 * @param {string} fileName
	 * @returns {Promise<GDriveFileInfo>}
	 */
	#initializeGdriveFileById(fileName) {
		let localStorageFile = this.#localStorage.readById(fileName);
		if (!localStorageFile) {
			localStorageFile = new GDriveFileInfo(fileName, undefined, 0);
			this.#localStorage.store(localStorageFile);
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
