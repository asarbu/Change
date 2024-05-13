import GDrive from '../../persistence/gDrive.js';
import LocalStorage from '../../persistence/localStorage.js';
import GDriveFile from '../../persistence/gDriveFile.js';
import Utils from '../../utils/utils.js';
import Planning from '../model/planningModel.js';

export default class PlanningGDrive {
	/** @type {number} */
	#year = undefined;

	/** @type {string} */
	#yearFolderId = undefined;

	/** @type {LocalStorage} */
	#localStorage = undefined;

	/** @type {GDrive} */
	#gDrive = undefined;

	/**
	 * @param {number} forYear
	 * @returns {Promise<PlanningGDrive>}
	 */
	static async get(forYear) {
		const planningDrive = new PlanningGDrive(forYear);
		await planningDrive.init();
		return planningDrive;
	}

	/**
	 * @param {number} forYear
	 */
	constructor(forYear) {
		this.#year = forYear;
	}

	async init() {
		this.#gDrive = await GDrive.get(true);
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

		const yearFolderId = await this.#gDrive.findFolder(`${this.#year}`, planningFolderId);
		if (!yearFolderId) {
			await this.#gDrive.createFolder(`${this.#year}`, planningFolderId);
		}
		if (!yearFolderId) throw Error(`Could not create Planning folder ${this.#year} in GDrive`);

		this.#yearFolderId = yearFolderId;
	}

	// #region CRUD operations
	/**
	 * @param {Planning} planning
	 */
	async store(planning) {
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
		const localStorageFile = await this.#initializeLocalStorageFile(planning.month);
		return this.gdrive.delete(localStorageFile.gDriveId);
	}

	/**
	 * Returns stored Planning or undefined.
	 * Updates the modified date in local storage
	 * @param {number} forMonth
	 * @returns {Promise<Planning>}
	 */
	async read(forMonth) {
		const localStorageFile = await this.#initializeLocalStorageFile(forMonth);
		if (!localStorageFile.gDriveId) {
			return undefined;
		}
		this.#updateLocalStorageModifiedField(localStorageFile.id);
		const gDriveFile = await this.#gDrive.readFile(localStorageFile.gDriveId);
		return Planning.fromJavascriptObject(gDriveFile);
	}

	async readAll() {
		if (!this.#yearFolderId) throw new Error('Planning Gdrivenot properly initialized');
		const children = await this.#gDrive.getChildren(this.#yearFolderId);
		return children;
	}

	async updateAll(planningCollections) {
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

	// #region GDrive LocalStorage operations
	async #updateLocalStorageModifiedField(fileId) {
		const localStorageFile = this.#localStorage.readGDriveFileById(fileId);
		const metadata = await this.#gDrive.readFileMetadata(
			localStorageFile.gDriveId,
			GDrive.MODIFIED_TIME_FIELD,
		);
		const modifiedTime = new Date(metadata[GDrive.MODIFIED_TIME_FIELD]).getTime();
		localStorageFile.modified = modifiedTime;
		this.#localStorage.storeFile(localStorageFile);
	}

	/**
	 * Reads file metadata from localStorage and GDrive.
	 * Initializes an empty one in case none is found
	 * @param {number} forMonth
	 * @returns {Promise<GDriveFile>}
	 */
	async #initializeLocalStorageFile(forMonth) {
		if (!this.#yearFolderId) throw new Error('Planning Gdrivenot properly initialized');
		let localStorageFile = this.#localStorage.readStorageFile(this.#year, forMonth);
		if (!localStorageFile || !localStorageFile.gDriveId) {
			const fileName = this.#buildFileName(forMonth);
			const gDriveId = await this.#gDrive.findFile(fileName, this.#yearFolderId);
			if (gDriveId) {
				const metadata = await this.#gDrive.readFileMetadata(gDriveId, GDrive.MODIFIED_TIME_FIELD);
				const modifiedTime = new Date(metadata[GDrive.MODIFIED_TIME_FIELD]).getTime();
				localStorageFile = new GDriveFile(
					fileName,
					this.#year,
					forMonth,
					gDriveId,
					modifiedTime,
				);
				this.#localStorage.storeFile(localStorageFile);
			} else {
				localStorageFile = new GDriveFile(fileName, this.#year, forMonth, undefined, 0, true);
			}
		}
		return localStorageFile;
	}

	#markDirty(gDriveFile) {
		const dirtyFile = gDriveFile;
		dirtyFile.dirty = true;
		this.#localStorage.storeFile(dirtyFile);
	}

	#markClean(gDriveFile) {
		const cleanFile = gDriveFile;
		cleanFile.dirty = false;
		this.#localStorage.storeFile(cleanFile);
	}

	#buildFileName(forMonth) {
		return `Planning_${this.#year}_${Utils.nameForMonth(forMonth)}.json`;
	}
	// #endregion
}
