import LocalStorageFile from './localStorageFile.js';

export default class LocalStorage {
	static #GDRIVE_FILES_KEY = 'gDrive_files';

	/**
	 * @param {string} id
	 * @param {number} year
	 * @param {number} month
	 * @param {string} gDriveId
	 * @param {number} modified
	 * @param {boolean} dirty
	 */
	static storeFileMetadata(id, year, month, gDriveId, modified, dirty) {
		const files = localStorage.getItem(`${LocalStorage.#GDRIVE_FILES_KEY}`);
		/** @type {LocalStorageFile} */
		const localStorageFile = files[id] || new LocalStorageFile(id, year, month, gDriveId);

		localStorageFile.year = year;
		localStorageFile.month = month;
		localStorageFile.gDriveId = gDriveId;
		localStorageFile.modified = modified;
		localStorageFile.dirty = dirty;
		files[id] = localStorageFile;
		localStorage.setItem(`${LocalStorage.#GDRIVE_FILES_KEY}`, files);
	}

	/**
	 * @param {LocalStorageFile} localStorageFile
	 */
	static storeFile(localStorageFile) {
		const files = localStorage.getItem(`${LocalStorage.#GDRIVE_FILES_KEY}`);
		files[localStorageFile.id] = localStorageFile;
		localStorage.setItem(`${LocalStorage.#GDRIVE_FILES_KEY}`, files);
	}

	/**
	 * @param {string} fileId
	 * @returns {LocalStorageFile}
	 */
	static readGDriveFileById(fileId) {
		const files = localStorage.getItem(`${LocalStorage.#GDRIVE_FILES_KEY}`) || [];
		const gDriveFile = files.find((file) => file.id === fileId);
		return gDriveFile;
	}

	/**
	 * @param {number} forYear
	 * @param {number} forMonth
	 * @returns {LocalStorageFile}
	 */
	static readStorageFile(forYear, forMonth) {
		/** @type {Array<LocalStorageFile>} */
		const files = localStorage.getItem(`${LocalStorage.#GDRIVE_FILES_KEY}`) || [];
		const gDriveFile = files.find((file) => file.year === forYear && file.month === forMonth);
		return gDriveFile;
	}
}
