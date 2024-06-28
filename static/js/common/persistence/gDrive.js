export default class GDrive {
	/** @type {GDrive} */
	static #instance = undefined;

	/** @type {boolean} */
	#rememberLogin = undefined;

	static APP_FOLDER = 'Change!';

	static MODIFIED_TIME_FIELD = 'modifiedTime';

	static #ROOT_DIRECTORY_NAME = 'root';

	static #GDRIVE_MIME_TYPE_FOLDER = 'application/vnd.google-apps.folder';

	static #FILES_API = 'https://www.googleapis.com/drive/v3/files';

	/**
	 * Constructs and initializes an instance of GDrive connector
	 * TODO gtoup client data together
	 * @returns {Promise<GDrive>}
	 */
	static async get(rememberLogin) {
		// TODO put secret environment variables
		const CLIENT_ID = '48008571695-vjj7lrnm4dv8i49ioi3a4tq3pbl1j67h.apps.googleusercontent.com';
		const CLIENT_SECRET = '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';
		const redirectUri = window.location.href;
		GDrive.#instance = new GDrive(CLIENT_ID, CLIENT_SECRET, redirectUri, rememberLogin);
		await GDrive.#instance.init();
		return GDrive.#instance;
	}

	constructor(clientId, clientSecret, redirectUri, rememberLogin) {
		this.clientId = clientId;
		this.clientSecret = clientSecret;
		this.redirectUri = redirectUri;
		this.#rememberLogin = rememberLogin;

		this.oauth2 = {
			name: 'oauth2',
			token: 'oauth2_token',
			accessToken: 'access_token',
			refreshToken: 'oauth2_refresh_token',
			state: 'change-application-nonce',
		};
	}

	async init() {
		if (this.initialized) return;
		await this.#processOAuth2Flow();
		this.initialized = true;
	}

	// TODO remove this ?
	rememberLogin() {
		this.#rememberLogin = true;
	}

	async #processOAuth2Flow() {
		if (this.#rememberLogin) {
			await this.processOAuth2OfflineFlow();
		} else {
			this.processOAuth2OnlineFlow();
		}
	}

	async processOAuth2OfflineFlow() {
		const locationString = window.location.href;
		const paramString = /(.*)[?](.*)/.exec(locationString);
		if (paramString === null) return;

		// Parse query string to see if page request is coming from OAuth 2.0 server.
		const params = {};
		const regex = /([^&=]+)=([^&]*)/g;

		[, this.redirectUri] = paramString;
		let match = regex.exec(paramString[2]);
		while (match) {
			params[decodeURIComponent(match[1])] = decodeURIComponent(match[2]);
			match = regex.exec(paramString[2]);
		}
		if (Object.keys(params).length > 0) {
			if (params.state && params.state === this.oauth2.state) {
				await this.getRefreshToken(params);
				await this.#refreshAccessToken();
			}
		}
	}

	processOAuth2OnlineFlow() {
		const fragmentString = window.location.hash.substring(1);
		// Parse query string to see if page request is coming from OAuth 2.0 server.
		const params = {};
		const regex = /([^&=]+)=([^&]*)/g;
		let	m = regex.exec(fragmentString);
		while (m) {
			params[decodeURIComponent(m[1])] = decodeURIComponent(m[2]);
			m = regex.exec(fragmentString);
		}
		if (Object.keys(params).length > 0) {
			if (params.state && params.state === this.oauth2.state) {
				params.refreshed_at = new Date().getTime();
				params.expires_at = params.refreshed_at + params.expires_in * 1000;
				localStorage.setItem(this.oauth2.token, JSON.stringify(params));
			}
		} else if (!localStorage.getItem(this.oauth2.token)) {
			this.#oauth2OnlineSignIn();
		}
	}

	async getRefreshToken(authorizationCode) {
		// console.log("Getting refresh token. Redirect URI ",window.location.href);
		const data = {
			code: authorizationCode.code,
			client_id: this.clientId,
			client_secret: this.clientSecret,
			redirect_uri: this.redirectUri,
			grant_type: 'authorization_code',
		};
		const url = new URL('https://oauth2.googleapis.com/token');
		const request = {
			method: 'POST',
			headers: {
				'Content-Type': 'application/json',
			},
			body: JSON.stringify(data),
		};

		// TODO handle error messages
		const json = await fetch(url, request)
			.then((response) => response.json())
			.then((responseJson) => responseJson);

		if (json.refresh_token) {
			localStorage.setItem(this.oauth2.refreshToken, json.refresh_token);
			delete json.refresh_token;
		}
		json.refreshed_at = new Date().getTime();
		json.expires_at = json.refreshed_at + json.expires_in * 1000;

		localStorage.setItem(this.oauth2.token, JSON.stringify(json));
	}

	async #getAccessToken() {
		const params = JSON.parse(localStorage.getItem(this.oauth2.token));
		if (!params) return this.login();

		const token = params[this.oauth2.accessToken];
		if (!token) return this.login();

		const now = new Date().getTime();
		const tokenExpired = params.expires_at === undefined || params.expires_at < now;
		if (tokenExpired) {
			if (this.#rememberLogin) {
				const refreshedToken = await this.#refreshAccessToken();
				if (refreshedToken) {
					return refreshedToken.access_token;
				}
			}
			await this.login();
		}

		return token;
	}

	/**
	 * Handles the logic of automatic login or redirects to login screen, if necessary
	 * @returns {Promise<boolean>} logged in successfully
	 */
	async login() {
		if (this.#rememberLogin) {
			this.#oauth2OfflineSignIn();
			// Stop the application from creating additional requests
			throw new Error('Login required');
		}

		this.#oauth2OnlineSignIn();
		throw new Error('Login required');
	}

	/**
	 * Handles refresh logic of offline authentication
	 * @returns {Promise<string>} True if token was refreshed
	 */
	async #refreshAccessToken() {
		const refreshToken = localStorage.getItem(this.oauth2.refreshToken);
		if (!refreshToken) {
			return undefined;
		}

		const data = {
			client_id: this.clientId,
			client_secret: this.clientSecret,
			refresh_token: refreshToken,
			grant_type: 'refresh_token',
		};
		const url = new URL('https://oauth2.googleapis.com/token');
		const headers = new Headers({
			Accept: 'application/json',
			'Content-Type': 'application/json',
		});
		const response = await fetch(url, {
			method: 'POST',
			headers: headers,
			body: JSON.stringify(data),
		});
		if (!response.ok) {
			return undefined;
		}

		const json = await response.json();
		if (json) {
			json.refreshed_at = new Date().getTime();
			json.expires_at = json.refreshed_at + json.expires_in * 1000;
		} else {
			throw Error('Refreshing token did not succeed', json);
		}

		localStorage.setItem(this.oauth2.token, JSON.stringify(json));
		return json;
	}

	#oauth2OfflineSignIn() {
		// Google's OAuth 2.0 endpoint for requesting an access token
		const oauth2Endpoint = 'https://accounts.google.com/o/oauth2/v2/auth';

		// Create element to open OAuth 2.0 endpoint in new window.
		const form = document.createElement('form');
		form.setAttribute('method', 'GET'); // Send as a GET request.
		form.setAttribute('action', oauth2Endpoint);

		// Parameters to pass to OAuth 2.0 endpoint.
		const params = {
			client_id: this.clientId,
			redirect_uri: this.redirectUri,
			scope: 'https://www.googleapis.com/auth/drive',
			state: 'change-application-nonce',
			include_granted_scopes: 'true',
			response_type: 'code',
			access_type: 'offline',
			// Needed to get a refresh token every time
			prompt: 'consent',
		};

		// Add form parameters as hidden input values.
		Object.entries(params).forEach(([key, value]) => {
			const input = document.createElement('input');
			input.setAttribute('type', 'hidden');
			input.setAttribute('name', key);
			input.setAttribute('value', value);
			form.appendChild(input);
		});

		// Add form to page and submit it to open the OAuth 2.0 endpoint.
		document.body.appendChild(form);
		form.submit();
	}

	#oauth2OnlineSignIn() {
		// Google's OAuth 2.0 endpoint for requesting an access token
		const oauth2Endpoint = 'https://accounts.google.com/o/oauth2/v2/auth';

		// Create element to open OAuth 2.0 endpoint in new window.
		const form = document.createElement('form');
		form.setAttribute('method', 'GET'); // Send as a GET request.
		form.setAttribute('action', oauth2Endpoint);

		// Parameters to pass to OAuth 2.0 endpoint.
		const params = {
			client_id: this.CLIENT_ID,
			redirect_uri: this.redirectUri,
			scope: 'https://www.googleapis.com/auth/drive',
			state: 'change-application-nonce',
			include_granted_scopes: 'true',
			response_type: 'token',
		};

		// Add form parameters as hidden input values.
		Object.entries(params).forEach(([name, value]) => {
			const input = document.createElement('input');
			input.setAttribute('type', 'hidden');
			input.setAttribute('name', name);
			input.setAttribute('value', value);
			form.appendChild(input);
		});

		// Add form to page and submit it to open the OAuth 2.0 endpoint.
		document.body.appendChild(form);
		form.submit();
	}

	async #getHeader() {
		const token = await this.#getAccessToken();
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
	 * @param {boolean} overwrite true if the file should be overwritten
	 * @returns {Promise<String>} id of the file where data was written
	 */
	async writeFile(parent, fileName, data, overwrite) {
		const fileId = await this.findFile(fileName, parent);
		if (!fileId) {
			return this.write(fileName, parent, data);
		}
		if (overwrite) {
			return this.update(fileId, data);
		}
		return undefined;
	}

	async deleteFile(fileId) {
		// TODO implement
	}

	/**
	 * Find a file with a name under a folder
	 * @param {string} name Name of file to search
	 * @param {string} parentId Parent under which to search
	 * @param {string} mimeType Type of file to search (file, folder or shortcut)
	 * @returns {Promise<string>} File id if the fle was found or undefined
	 */
	async find(name, parentId, mimeType) {
		const token = await this.#getAccessToken();
		if (token) {
			const parent = parentId || GDrive.#ROOT_DIRECTORY_NAME;

			let q = `name='${name}' and trashed=false and '${parent}' in parents`;
			if (mimeType) {
				q += ` and mimeType='${mimeType}'`;
			}

			const header = await this.#getHeader();
			const url = new URL(GDrive.#FILES_API);
			url.searchParams.append('q', q);

			// TODO do proper error handling
			const id = await fetch(url, {
				method: 'GET',
				headers: header,
			})
				.then((response) => response.json())
				.then((json) => {
					if (json && json.files && json.files.length > 0) {
						return json.files[0].id;
					}
					return undefined;
				});

			return id;
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
		if (fileType.mimeType === GDrive.#GDRIVE_MIME_TYPE_FOLDER) {
			return fileId;
		} if (fileType.mimeType === 'application/vnd.google-apps.shortcut') {
			if (fileType.shortcutDetails?.targetMimeType === GDrive.#GDRIVE_MIME_TYPE_FOLDER) {
				return fileType.shortcutDetails.targetId;
			}
		}
		return undefined;
	}

	async findFolder(name, parent) {
		return this.find(name, parent, GDrive.#GDRIVE_MIME_TYPE_FOLDER);
	}

	async findFile(name, parent) {
		return this.find(name, parent);
	}

	/**
	 * @param {string} folderId
	 * @returns {Promise<Array<Object>>}
	 */
	async getChildren(folderId) {
		const token = await this.#getAccessToken();
		if (token) {
			const folder = folderId || GDrive.#ROOT_DIRECTORY_NAME;

			const q = `trashed=false and '${folder}' in parents`;

			const header = await this.#getHeader();
			const url = new URL(GDrive.#FILES_API);
			url.searchParams.append('q', q);

			const children = await fetch(url, {
				method: 'GET',
				headers: header,
			})
				.then((response) => response.json())
				.then((json) => {
					if (json && json.files && json.files.length > 0) {
						return json;
					}
					return undefined;
				});
			return children;
		}
		return undefined;
	}

	/**
	 * Create folder under a GDrive parent folder
	 * @param {String} name FOlder name that will be created
	 * @param {String} parent Fodler ID of the parent
	 * @returns {Promise<String>} ID of the created folder
	 */
	async createFolder(name, parent) {
		const token = await this.#getAccessToken();
		if (token) {
			const metadata = {
				name: name,
				mimeType: 'application/vnd.google-apps.folder',
				parents: [parent || GDrive.#ROOT_DIRECTORY_NAME],
			};

			const headers = await this.#getHeader();
			const url = new URL(GDrive.#FILES_API);

			const id = await fetch(url, {
				method: 'POST',
				headers: headers,
				body: JSON.stringify(metadata),
			}).then((res) => res.json()).then((json) => json.id);

			return id;
		}
		return undefined;
	}

	async update(fileId, data) {
		const token = await this.#getAccessToken();
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
			const updatedFileId = await fetch(url, {
				method: 'PATCH',
				headers: header,
				body: form,
			}).then((res) => res.json()).then((json) => json.id);

			return updatedFileId;
		}
		return undefined;
	}

	async write(name, parent, data) {
		const token = await this.#getAccessToken();
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

			const fileId = fetch(url, {
				method: 'POST',
				headers: header,
				body: form,
			}).then((res) => res.json()).then((json) => json.id);
			return fileId;
		}
		return undefined;
	}

	async readFileMetadata(fileId, fields) {
		const token = await this.#getAccessToken();
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
				throw Error(`Fetch error while reading metadata ${fileId}, ${fields}`);
			}

			const json = await response.json();
			return json;
		}
		return undefined;
	}

	async readFile(fileId) {
		const token = await this.#getAccessToken();
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
