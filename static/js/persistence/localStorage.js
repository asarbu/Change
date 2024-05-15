/**
 * Wrapper over local storage functionality.
 * Groups objects functionally by local storage key (e.g GDRIVE_FILES_KEY, GDRIVE_OAUTH_KEY).
 * This is similar to IndexedDb object store names.
 * Each object can then be retrieved by a unique ID in each store.
 */
export default class LocalStorage {
	static GDRIVE_FILES_KEY = 'gDrive_files';

	static GDRIVE_OAUTH_KEY = 'gDrive_files';

	#key = undefined;

	constructor(localStorageKey) {
		this.#key = localStorageKey;
	}

	/**
	 * @param {Object} object
	 * @param {number} object.id ID of the object to identify in store
	 */
	store(object) {
		const objectId = object.id;
		if (!objectId) throw Error('No object id provided');
		const objectClone = object;
		const files = JSON.parse(localStorage.getItem(this.#key)) || {};
		// Do not waste space by storing ID twice (in main object and in stored object)
		delete objectClone.id;
		files[objectId] = objectClone;
		localStorage.setItem(this.#key, JSON.stringify(files));
	}

	/**
	 * @param {string} objectId
	 * @returns {Object}
	 */
	readById(objectId) {
		const objects = JSON.parse(localStorage.getItem(this.#key)) || {};
		const object = objects[objectId];
		if (!object) return undefined;
		// put the ID back because we removed it to save space
		object.id = objectId;
		return object;
	}
}
