import GDriveSettings from '../../settings/model/gDriveSettings.js';
import GDriveAuth from './gDriveAuth.js';

export default class GDrive {
	/** @type {GDrive} */
	static #instance = undefined;

	/** @type {GDriveAuth} */
	#gDriveAuth = undefined;

	static APP_FOLDER = 'Change!';

	static MODIFIED_TIME_FIELD = 'modifiedTime';

	static #ROOT_DIRECTORY_NAME = 'root';

	static GDRIVE_MIME_TYPE_FOLDER = 'application/vnd.google-apps.folder';

	static GDRIVE_MIME_TYPE_SHORTCUT = 'application/vnd.google-apps.shortcut';

	static #FILES_API = 'https://www.googleapis.com/drive/v3/files';

	/**
	 * Constructs and initializes an instance of GDrive connector
	 * @returns {Promise<GDrive>}
	 */
	static async get(rememberLogin) {
		GDrive.#instance = new GDrive(rememberLogin);
		await GDrive.#instance.init();
		return GDrive.#instance;
	}

	/**
	 * @param {GDriveSettings} gDriveSettings
	 */
	constructor(gDriveSettings) {
		this.#gDriveAuth = new GDriveAuth(gDriveSettings);
	}

	async init() {
		if (this.initialized) return;
		await this.#gDriveAuth.init();
		this.initialized = true;
	}

	async #getHeader() {
		const token = await this.#gDriveAuth.getAccessToken();
		if (token) {
			const header = new Headers({
				Authorization: `Bearer ${token}`,
				Accept: 'application/json',
				'Content-Type': 'application/json',
			});
			return header;
		}
		return undefined;
	}

	/**
	 * Write data to a file with a given parent ID
	 * @param {string} parent Parent ID where to write the file
	 * @param {string} fileName Name of the file where to write data
	 * @param {Blob} data Data to write to the file
	 * @returns {Promise<String>} id of the file where data was written
	 */
	async writeFile(parent, fileName, data) {
		const fileId = await this.findFile(fileName, parent);
		if (!fileId) {
			return this.write(fileName, parent, data);
		}
		return this.update(fileId, data);
	}

	async deleteFile(fileId) {
		const token = await this.#gDriveAuth.getAccessToken();
		if (token) {
			if (!fileId) {
				throw Error('No file id provided to delete');
			}

			const header = await this.#getHeader();
			const url = new URL(`${GDrive.#FILES_API}/${fileId}`);

			const response = await fetch(url, {
				method: 'DELETE',
				headers: header,
			});

			if (!response.ok) {
				throw Error(`Failed to delete file with id ${fileId}`);
			}

			return fileId; // Indicate successful deletion
		}
		return undefined; // Indicate failure due to missing token
	}

	/**
	 * Find a file with a name under a folder
	 * @param {string} name Name of file to search
	 * @param {string} parentId Parent under which to search
	 * @param {string} mimeType Type of file to search (file, folder or shortcut)
	 * @returns {Promise<string>} File id if the fle was found or undefined
	 */
	async find(name, parentId, mimeType) {
		const token = await this.#gDriveAuth.getAccessToken();
		if (token) {
			const parent = parentId || GDrive.#ROOT_DIRECTORY_NAME;

			let q = `name='${name}' and trashed=false and '${parent}' in parents`;
			if (mimeType) {
				q += ` and mimeType='${mimeType}'`;
			}

			const header = await this.#getHeader();
			const url = new URL(GDrive.#FILES_API);
			url.searchParams.append('q', q);

			const response = await fetch(url, {
				method: 'GET',
				headers: header,
			});

			if (!response.ok) return undefined;

			const json = await response.json();
			if (json && json.files && json.files.length > 0) {
				return json.files[0].id;
			}
		}
		return undefined;
	}

	/**
	 * @returns { Promise<String> | undefined } folder ID
	 */
	async findChangeAppFolder() {
		const fileId = await this.find(GDrive.APP_FOLDER);
		if (!fileId) return undefined;

		const fileType = await this.readFileMetadata(fileId, 'shortcutDetails, mimeType');
		if (fileType.mimeType === GDrive.GDRIVE_MIME_TYPE_FOLDER) {
			return fileId;
		} if (fileType.mimeType === GDrive.GDRIVE_MIME_TYPE_SHORTCUT) {
			if (fileType.shortcutDetails?.targetMimeType === GDrive.GDRIVE_MIME_TYPE_FOLDER) {
				return fileType.shortcutDetails.targetId;
			}
		}
		return undefined;
	}

	async findFolder(name, parent) {
		return this.find(name, parent, GDrive.GDRIVE_MIME_TYPE_FOLDER);
	}

	async findFile(name, parent) {
		return this.find(name, parent);
	}

	/**
	 * @param {string} folderId
	 * @returns {Promise<Array<Object>>}
	 */
	async getChildren(folderId) {
		const token = await this.#gDriveAuth.getAccessToken();
		if (token) {
			const folder = folderId || GDrive.#ROOT_DIRECTORY_NAME;

			const q = `trashed=false and '${folder}' in parents`;

			const header = await this.#getHeader();
			const url = new URL(GDrive.#FILES_API);
			url.searchParams.append('q', q);

			const response = await fetch(url, {
				method: 'GET',
				headers: header,
			});

			if (!response.ok) return [];

			const json = await response.json();
			if (json && json.files && json.files.length > 0) {
				return json;
			}
			return [];
		}
		return [];
	}

	/**
	 * Create folder under a GDrive parent folder
	 * @param {String} name FOlder name that will be created
	 * @param {String} parent Fodler ID of the parent
	 * @returns {Promise<String>} ID of the created folder
	 */
	async createFolder(name, parent) {
		const token = await this.#gDriveAuth.getAccessToken();
		if (token) {
			const metadata = {
				name: name,
				mimeType: GDrive.GDRIVE_MIME_TYPE_FOLDER,
				parents: [parent || GDrive.#ROOT_DIRECTORY_NAME],
			};

			const headers = await this.#getHeader();
			const url = new URL(GDrive.#FILES_API);

			const response = await fetch(url, {
				method: 'POST',
				headers: headers,
				body: JSON.stringify(metadata),
			});

			if (!response.ok) return undefined;
			const json = await response.json();
			if (json) return json.id;
		}
		return undefined;
	}

	async update(fileId, data) {
		const token = await this.#gDriveAuth.getAccessToken();
		if (token) {
			const fileContent = JSON.stringify(data);
			const file = new Blob([fileContent], { type: 'text/plain' });
			const metadata = {
				mimeType: 'text/plain',
			};

			const url = new URL(`https://www.googleapis.com/upload/drive/v3/files/${fileId}`);
			url.searchParams.append('uploadType', 'multipart');
			url.searchParams.append('fields', 'id');

			const header = new Headers({ Authorization: `Bearer ${token}` });

			const form = new FormData();
			form.append('metadata', new Blob([JSON.stringify(metadata)], { type: 'application/json' }));
			form.append('file', file);
			const response = await fetch(url, {
				method: 'PATCH',
				headers: header,
				body: form,
			});
			if (!response.ok) return undefined;

			const json = await response.json();
			if (json) return json.id;
		}
		return undefined;
	}

	async write(name, parent, data) {
		const token = await this.#gDriveAuth.getAccessToken();
		if (token) {
			const fileContent = JSON.stringify(data);
			const file = new Blob([fileContent], { type: 'text/plain' });
			const metadata = {
				name: name,
				mimeType: 'text/plain',
				parents: [parent],
			};

			const url = new URL('https://www.googleapis.com/upload/drive/v3/files');
			url.searchParams.append('uploadType', 'multipart');
			url.searchParams.append('fields', 'id');

			const header = new Headers({ Authorization: `Bearer ${token}` });

			const form = new FormData();
			form.append('metadata', new Blob([JSON.stringify(metadata)], { type: 'application/json' }));
			form.append('file', file);

			const response = await fetch(url, {
				method: 'POST',
				headers: header,
				body: form,
			});

			if (!response.ok) return undefined;
			const json = await response.json();
			if (json) return json.id;
		}
		return undefined;
	}

	async readFileMetadata(fileId, fields) {
		const token = await this.#gDriveAuth.getAccessToken();
		if (token) {
			if (!fileId) {
				throw Error('No file id provided: ');
			}

			const header = await this.#getHeader();
			const url = new URL(`${GDrive.#FILES_API}/${fileId}`);
			url.searchParams.append('fields', fields);

			const response = await fetch(url, {
				method: 'GET',
				headers: header,
			});

			if (!response.ok) {
				return undefined;
			}

			const json = await response.json();
			return json;
		}
		return undefined;
	}

	async readFile(fileId) {
		const token = await this.#gDriveAuth.getAccessToken();
		if (token) {
			if (!fileId) {
				throw Error('No file id provided to read');
			}

			const header = await this.#getHeader();
			const url = new URL(`${GDrive.#FILES_API}/${fileId}`);
			url.searchParams.append('alt', 'media');

			const response = await fetch(url, {
				method: 'GET',
				headers: header,
			});

			if (!response.ok) {
				throw Error(`Fetch error while reading file ${fileId}`);
			}

			const text = await response.text();
			return JSON.parse(text);
		}
		return undefined;
	}
}
