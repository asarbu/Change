import GDrive from '../../persistence/gDrive.js';
import LocalStorage from '../../persistence/localStorage.js';
import GDriveFileInfo from '../../persistence/gDriveFileInfo.js';
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

		// TODO look in localStorage first
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
		const fileName = this.#buildFileName(planning.month);
		// File should be marked dirty in case write does not succeed
		const fileInfo = await this.#initializeFileInfo(planning.month);
		this.#markDirty(fileInfo);
		const gDriveId = await this.#gDrive.writeFile(this.#yearFolderId, fileName, planning, true);

		if (gDriveId) {
			fileInfo.gDriveId = gDriveId;
			this.#updateModifiedTime(fileInfo);
		}

		return gDriveId;
	}

	async delete(planning) {
		const fileInfo = await this.#initializeFileInfo(planning.month);
		return this.#gDrive.delete(fileInfo.gDriveId);
	}

	/**
	 * Returns stored Planning or undefined.
	 * Updates the modified date in local storage
	 * @param {number} forMonth
	 * @returns {Promise<Planning>}
	 */
	async read(forMonth) {
		const fileInfo = await this.#initializeFileInfo(forMonth);
		if (!fileInfo.gDriveId) {
			return undefined;
		}
		const gDriveFile = await this.#gDrive.readFile(fileInfo.gDriveId);
		if (gDriveFile) {
			// Run this asynchronously to avoid performance issues
			this.#updateModifiedTime(fileInfo);
			return Planning.fromJavascriptObject(gDriveFile);
		}
		return undefined;
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
		const fileInfo = await this.#initializeFileInfo(forMonth);
		const { gDriveId } = fileInfo;
		if (gDriveId) {
			const metadata = await this.#gDrive
				.readFileMetadata(gDriveId, GDrive.MODIFIED_TIME_FIELD);
			const modifiedTime = new Date(metadata[GDrive.MODIFIED_TIME_FIELD]).getTime();
			if (fileInfo.modified < modifiedTime) {
				return true;
			}
		}
		return false;
	}

	// #region GDrive LocalStorage operations
	/**
	 * Reads file metadata from localStorage and GDrive.
	 * Initializes an empty one in case none is found
	 * @param {number} forMonth
	 * @returns {Promise<GDriveFileInfo>}
	 */
	async #initializeFileInfo(forMonth) {
		if (!this.#yearFolderId) throw new Error('Planning GDrive not properly initialized');

		const fileName = this.#buildFileName(forMonth);
		let fileInfo = this.#localStorage.readById(fileName);
		if (!fileInfo || !fileInfo.gDriveId) {
			// File might be present remotely
			const gDriveId = await this.#gDrive.findFile(fileName, this.#yearFolderId);
			if (gDriveId) {
				const metadata = await this.#gDrive.readFileMetadata(gDriveId, GDrive.MODIFIED_TIME_FIELD);
				const modifiedTime = new Date(metadata[GDrive.MODIFIED_TIME_FIELD]).getTime();
				fileInfo = new GDriveFileInfo(fileName, this.#year, forMonth, gDriveId, modifiedTime);
				this.#localStorage.store(fileInfo);
			} else {
				fileInfo = new GDriveFileInfo(fileName, this.#year, forMonth, undefined, 0, true);
			}
		}
		return fileInfo;
	}

	#buildFileName(forMonth) {
		return `Planning_${this.#year}_${Utils.nameForMonth(forMonth)}.json`;
	}

	#markDirty(fileInfo) {
		const gDriveFileInfo = fileInfo;
		gDriveFileInfo.dirty = true;
		this.#localStorage.store(gDriveFileInfo);
	}

	/**
	 * Read modified time for the file and updates it in local storage.
	 * Clears dirty bit.
	 * @param {GDriveFileInfo} fileInfo
	 */
	async #updateModifiedTime(fileInfo) {
		const gDriveFileInfo = fileInfo;
		const gDriveMetadata = await this.#gDrive
			.readFileMetadata(gDriveFileInfo.gDriveId, GDrive.MODIFIED_TIME_FIELD);
		const modifiedTime = new Date(gDriveMetadata[GDrive.MODIFIED_TIME_FIELD]).getTime();
		gDriveFileInfo.modified = modifiedTime;
		gDriveFileInfo.dirty = false;
		this.#localStorage.store(gDriveFileInfo);
	}
	// #endregion
}
