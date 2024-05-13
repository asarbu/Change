import GDriveFile from './gDriveFile.js';

export default class LocalStorage {
	static GDRIVE_FILES_KEY = 'gDrive_files';

	static CACHE_FILES_KEY = 'cache_files';

	#key = undefined;

	constructor(key) {
		this.#key = key;
	}

	/**
	 * @param {string} id
	 * @param {number} year
	 * @param {number} month
	 * @param {string} gDriveId
	 * @param {number} modified
	 * @param {boolean} dirty
	 */
	storeFileMetadata(id, year, month, gDriveId, modified, dirty) {
		const files = JSON.parse(localStorage.getItem(this.#key)) || {};
		/** @type {GDriveFile} */
		const localStorageFile = files[id] || new GDriveFile(id, year, month, gDriveId);

		localStorageFile.year = year;
		localStorageFile.month = month;
		localStorageFile.gDriveId = gDriveId;
		localStorageFile.modified = modified;
		localStorageFile.dirty = dirty;
		files[id] = localStorageFile;
		localStorage.setItem(this.#key, JSON.stringify(files));
	}

	/**
	 * @param {GDriveFile} localStorageFile
	 */
	storeFile(localStorageFile) {
		const files = JSON.parse(localStorage.getItem(this.#key)) || {};
		files[localStorageFile.id] = localStorageFile;
		localStorage.setItem(this.#key, JSON.stringify(files));
	}

	/**
	 * @param {string} fileId
	 * @returns {GDriveFile}
	 */
	readGDriveFileById(fileId) {
		const files = JSON.parse(localStorage.getItem(this.#key)) || {};
		const file = files[fileId];
		return file;
	}

	/**
	 * @param {number} forYear
	 * @param {number} forMonth
	 * @returns {GDriveFile}
	 */
	readStorageFile(forYear, forMonth) {
		/** @type {Array<GDriveFile>} */
		const files = JSON.parse(localStorage.getItem(this.#key)) || {};
		const gDriveFile = Object.values(files).find((f) => f.year === forYear && f.month === forMonth);
		return gDriveFile;
	}
}
