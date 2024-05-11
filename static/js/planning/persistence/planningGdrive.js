import GDrive from '../../persistence/gDrive.js';
import LocalStorage from '../../persistence/localStorage.js';
import LocalStorageFile from '../../persistence/localStorageFile.js';
import Utils from '../../utils/utils.js';
import Planning from '../model/planningModel.js';

export default class PlanningGDrive {
	/** @type {number} */
	#year = undefined;

	/** @type {string} */
	#yearFolderId = undefined;

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
		this.gdrive = await GDrive.get(true);
		let changeAppFolderId = await this.gdrive.findChangeAppFolder();
		if (!changeAppFolderId) {
			changeAppFolderId = await this.gdrive.createFolder(GDrive.APP_FOLDER);
		}
		if (!changeAppFolderId) throw Error('Could not create "Change" folder in GDrive');

		let planningFolderId = await this.gdrive.findFolder('Planning', changeAppFolderId);
		if (!planningFolderId) {
			planningFolderId = await this.gdrive.createFolder('Planning', changeAppFolderId);
		}
		if (!planningFolderId) throw Error('Could not create "Planning" folder in GDrive');

		const yearFolderId = await this.gdrive.findFolder(`${this.#year}`, planningFolderId);
		if (!yearFolderId) {
			await this.gdrive.createFolder(`${this.#year}`, planningFolderId);
		}
		if (!yearFolderId) throw Error(`Could not create Planning folder ${this.#year} in GDrive`);

		this.#yearFolderId = yearFolderId;
	}

	// #region CRUD operations
	/**
	 * @param {Planning} planning
	 */
	async write(planning) {
		const localStorageFile = await this.initializeLocalStorageFile(planning.month);
		localStorageFile.dirty = true;
		LocalStorage.storeFile(localStorageFile);
		const fileName = this.buildFileName(planning.month);
		const fileId = await this.gdrive.writeFile(this.#yearFolderId, fileName, planning, true);
		const gDriveMetadata = await this.gdrive.readFileMetadata(fileId, GDrive.MODIFIED_TIME_FIELD);
		const modifiedTime = new Date(gDriveMetadata[GDrive.MODIFIED_TIME_FIELD]).getTime();
		localStorageFile.dirty = false;
		localStorageFile.modified = modifiedTime;
		localStorageFile.gDriveId = fileId;
		LocalStorage.storeFile(localStorageFile);
	}

	/**
	 * Returns stored Planning or undefined
	 * @param {number} forMonth
	 * @returns {Promise<Planning>}
	 */
	async read(forMonth) {
		const { gDriveId: fileId } = await this.initializeLocalStorageFile(forMonth);
		if (!fileId) {
			return undefined;
		}
		return this.gdrive.readFile(fileId);
	}

	async readAll() {
		if (!this.#yearFolderId) throw new Error('Planning Gdrivenot properly initialized');
		const children = await this.gdrive.getChildren(this.#yearFolderId);
		return children;
	}

	async updateAll(planningCollections) {
		await this.write(planningCollections);
	}

	// #endregion

	// #region file handling
	/**
	 * Returns true if file has been modified since last call of this method.
	 * @param {number} forMonth
	 * @returns {Promise<boolean>}
	 */
	async fileChanged(forMonth) {
		const localStorageFile = await this.initializeLocalStorageFile(forMonth);
		const gDriveFileId = localStorageFile.gDriveId;
		if (gDriveFileId) {
			const metadata = await this.gdrive.readFileMetadata(gDriveFileId, GDrive.MODIFIED_TIME_FIELD);
			const modifiedTime = new Date(metadata[GDrive.MODIFIED_TIME_FIELD]).getTime();
			if (localStorageFile.modified < modifiedTime) {
				return true;
			}
		}
		return false;
	}

	/**
	 * Reads file metadata from localStorage and GDrive.
	 * Initializes an empty one in case none is found
	 * @param {number} forMonth
	 * @returns {Promise<LocalStorageFile>}
	 */
	async initializeLocalStorageFile(forMonth) {
		if (!this.#yearFolderId) throw new Error('Planning Gdrivenot properly initialized');
		let localStorageFile = LocalStorage.readStorageFile(this.#year, forMonth);
		if (!localStorageFile || !localStorageFile.gDriveId) {
			const fileName = this.buildFileName(forMonth);
			const gDriveId = await this.gdrive.findFile(fileName, this.#yearFolderId);
			if (gDriveId) {
				const metadata = await this.gdrive.readFileMetadata(gDriveId, GDrive.MODIFIED_TIME_FIELD);
				const modifiedTime = new Date(metadata[GDrive.MODIFIED_TIME_FIELD]).getTime();
				LocalStorage.storeFileMetadata(
					fileName,
					this.#year,
					forMonth,
					gDriveId,
					modifiedTime,
				);
			} else {
				localStorageFile = new LocalStorageFile(fileName, this.#year, forMonth, undefined, 0, true);
			}
		}
		return localStorageFile;
	}

	buildFileName(forMonth) {
		return `Planning_${this.#year}_${Utils.nameForMonth(forMonth)}.json`;
	}
	// #endregion
}
