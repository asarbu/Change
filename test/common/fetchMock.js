import GDrive from '../../static/js/common/persistence/gDrive';
import crypto from 'crypto';

export default class GDriveBackendMock {
	/** @type {Map<string, Object>} */
	#filesById = undefined;

	/** @type {number} */
	#maxId = undefined;

	constructor(rootFile, failFlags) {
		this.#filesById = new Map();
		this.#mapFiles(rootFile);
	}

	#mapFiles(rootFile) {
		this.#filesById.set(`${rootFile.id}`, rootFile);
		this.#mapFilesRecursively(rootFile.files);
	}

	/**
	 * @param {Array<Object} filesArray
	 */
	#mapFilesRecursively(filesArray) {
		if (!filesArray) return;

		for (let index = 0; index < filesArray.length; index += 1) {
			const file = filesArray[index];
			this.#filesById.set(`${file.id}`, file);
			this.#mapFilesRecursively(file.files);
		}
	}

	fetch(url, config) {
		if (url.pathname.startsWith('/drive/v3/files')) {
			switch (config.method) {
			case 'GET':
				return this.#processGetFiles(url);
			case 'POST':
				return this.#processPostFiles(url, config);
			default:
				throw Error(`Method not supported ${config.method} for ${url}`);
			}
		}
		if (url.pathname.startsWith('/upload/drive/v3/files')) {
			switch (config.method) {
			case 'POST':
				return this.#processPostUpload(url, config);
			case 'PATCH':
				return this.#processPatchUpload(url, config);
			default:
				throw Error(`Method not supported ${config.method} for ${url}`);
			}
		}

		throw new Error(`Unhandled request: ${url}, ${JSON.stringify(config)}`);
	}

	#processPostFiles(url, config) {
		const body = JSON.parse(config.body);
		const { name } = body;
		const { mimeType } = body;
		const parentId = body.parents[0];
		const newFile = { id: crypto.randomUUID(), name: name, mimeType: mimeType };
		if (mimeType === GDrive.GDRIVE_MIME_TYPE_FOLDER) {
			newFile.files = [];
		} else if (mimeType === GDrive.GDRIVE_MIME_TYPE_SHORTCUT) {
			// TODO Handle edge case
		}

		this.#filesById.get(parentId).files.push(newFile);
		this.#filesById.set(newFile.id, newFile);

		return new Promise((resolve) => {
			resolve({
				ok: true,
				status: 200,
				json: async () => ({ id: newFile.id }),
			});
		});
	}

	#processGetFiles(url) {
		const { searchParams } = url;
		const q = searchParams.get('q');
		const fields = searchParams.get('fields');
		const alt = searchParams.get('alt');
		if (q) {
			const nameMatch = q.match(/name=["'](.*?)['"]/);
			const name = nameMatch ? nameMatch[1] : undefined;
			const parentIdMatch = q.match(/.*["'](.*?)['"] in parents/);
			const parentId = parentIdMatch ? parentIdMatch[1] : undefined;
			const parent = this.#filesById.get(parentId);

			const result = [];
			if (name) result.push(...parent.files.filter((file) => file.name === name));
			else result.push(...parent.files.map((file) => file.id));

			if (result) {
				return new Promise((resolve) => {
					resolve({ ok: true, status: 200, json: async () => ({ files: result }) });
				});
			}
		}

		if (fields) {
			const fieldValues = fields.split(',').map((field) => field.trim());
			const fileId = url.pathname.substring(url.pathname.lastIndexOf('/') + 1);
			const file = this.#filesById.get(fileId);

			const result = fieldValues.reduce((a, v) => ({ ...a, [v]: file[v] }), {});
			return new Promise((resolve) => {
				resolve({ ok: true, status: 200, json: async () => (result)	});
			});
		}

		if (alt) {
			const fileId = url.pathname.substring(url.pathname.lastIndexOf('/') + 1);
			const file = this.#filesById.get(fileId);
			return new Promise((resolve) => {
				resolve({ ok: true, status: 200, text: async () => (file.data)	});
			});
		}

		return new Promise((resolve) => {
			resolve({ ok: false, status: 401, json: async () => ({ success: true }) });
		});
	}

	async #processPostUpload(url, config) {
		const metadata = JSON.parse(await this.readBlob(config.body.get('metadata')));
		const file = (await this.readBlob(config.body.get('file')));

		const newFile = {};
		newFile.id = crypto.randomUUID();
		newFile.name = metadata.name;
		newFile.mimeType = metadata.mimeType;
		newFile.data = file;
		const parentId = metadata.parents[0];
		this.#filesById.set(newFile.id, newFile);
		this.#filesById.get(parentId).files.push(newFile);

		return { ok: true, status: 200, json: async () => ({ id: newFile.id }) };
	}

	async #processPatchUpload(url, config) {
		const file = (await this.readBlob(config.body.get('file')));
		const fileId = url.pathname.substring(url.pathname.lastIndexOf('/') + 1);
		this.#filesById.get(fileId).data = file;

		return { ok: true, status: 200, json: async () => ({ id: fileId }) };
	}

	readBlob(blob) {
		return new Promise((resolve) => {
			const reader = new FileReader();
			reader.onload = () => { resolve(reader.result);	};
			reader.readAsText(blob);
		});
	}
}
