export default class GDrive {
	/** @type {GDrive} */
	static #instance = undefined;

	/** @type {boolean} */
	#rememberLogin = undefined;

	static ROOT_DIRECTORY_NAME = 'root';

	/**
	 * Constructs and initializes an instance of GDrive connector
	 * @returns {GDrive}
	 */
	static async get() {
		// TODO put secret environment variables
		const CLIENT_ID = '48008571695-vjj7lrnm4dv8i49ioi3a4tq3pbl1j67h.apps.googleusercontent.com';
		const CLIENT_SECRET = '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';
		const FILES_API = 'https://www.googleapis.com/drive/v3/files';
		const redirectUri = window.location.href;
		GDrive.#instance = new GDrive(CLIENT_ID, CLIENT_SECRET, FILES_API, redirectUri);
		await GDrive.#instance.init();
		return GDrive.#instance;
	}

	constructor(clientId, clientSecret, accessType, redirectUri) {
		this.clientId = clientId;
		this.clientSecret = clientSecret;
		this.accessType = accessType;
		this.redirectUri = redirectUri;

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
		console.log(`Processing OAuth2 offline flow ${locationString}`);
		const paramString = new RegExp('(.*)[?](.*)').exec(locationString);
		if (paramString == null && this.loggedIn()) {
			console.log('No parameters found. Returning...');
			return;
		}

		// Parse query string to see if page request is coming from OAuth 2.0 server.
		const params = {};
		const regex = /([^&=]+)=([^&]*)/g; let
			match;
		this.redirectUri = paramString[1];
		while (match = regex.exec(paramString[2])) {
			params[decodeURIComponent(match[1])] = decodeURIComponent(match[2]);
		}
		if (Object.keys(params).length > 0) {
			if (params.state && params.state === this.oauth2.state) {
				if (localStorage.getItem(this.oauth2.refreshToken) === null) {
					await this.getRefreshToken(params);
				} else {
					await this.tryRefreshAccessToken();
				}
			}
		}
	}

	processOAuth2OnlineFlow() {
		const fragmentString = location.hash.substring(1);
		// Parse query string to see if page request is coming from OAuth 2.0 server.
		const params = {};
		const regex = /([^&=]+)=([^&]*)/g; let
			m;
		while (m = regex.exec(fragmentString)) {
			params[decodeURIComponent(m[1])] = decodeURIComponent(m[2]);
		}
		if (Object.keys(params).length > 0) {
			if (params.state && params.state == this.oauth2.state) {
				params.refreshed_at = new Date().getTime();
				params.expires_at = params.refreshed_at + params.expires_in * 1000;
				localStorage.setItem(this.oauth2.token, JSON.stringify(params));
			}
		} else if (!localStorage.getItem(this.oauth2.token)) {
			this.oauth2OnlineSignIn();
		}
	}

	async getRefreshToken(authorizationCode) {
		// console.log("Getting refresh token. Redirect URI ",window.location.href);
		const data = {
			code: authorizationCode.code,
			client_id: this.CLIENT_ID,
			client_secret: this.CLIENT_SECRET,
			redirect_uri: this.redirectUri,
			grant_type: 'authorization_code',
		};
		// console.log("Data:" , data)
		const url = new URL('https://oauth2.googleapis.com/token');
		const jsonheaders = {
			'Content-Type': 'application/json',
		};
		const request = {
			method: 'POST',
			headers: {
				'Content-Type': 'application/json',
			},
			body: JSON.stringify(data),
		};

		// console.log(JSON.stringify(request));

		const json = await fetch(url, request)
			.then((response) => response.json())
			.then((json) => json)
			.catch((error) => {
				if (typeof error.json === 'function') {
					error.json().then((jsonError) => {
						console.log('Json error from API');
						console.log(jsonError);
					}).catch((genericError) => {
						console.log('Generic error from API');
						console.log(error.statusText);
					});
				} else {
					console.log('Fetch error');
					console.log(error);
				}
			});

		// console.log("Received token", json);
		if (json.refresh_token) {
			localStorage.setItem(this.oauth2.refreshToken, json.refresh_token);
			delete json.refresh_token;
		}
		json.refreshed_at = new Date().getTime();
		json.expires_at = json.refreshed_at + json.expires_in * 1000;

		localStorage.setItem(this.oauth2.token, JSON.stringify(json));
	}

	async getAccessToken() {
		// console.log("Getting Access token")
		if (await this.loggedIn()) {
			const params = JSON.parse(localStorage.getItem(this.oauth2.token));
			if (!params) { return false; }
			const access_token = params[this.oauth2.accessToken];
			return access_token;
		}
	}

	async loggedIn() {
		// console.log("Checking login")
		if (gdriveKeepLoggedin) {
			if (localStorage.getItem(this.oauth2.token) === null) {
				console.log('No token found. Requesting one from server');
				return await this.tryRefreshAccessToken();
			}
			const token = JSON.parse(localStorage.getItem(this.oauth2.token));
			if (this.tokenExpired(token)) {
				console.log('Token expired');
				if (!await this.tryRefreshAccessToken()) {
					// Refreshing did not succeed. Refresh token expired or revoked.
					localStorage.removeItem(this.oauth2.refreshToken);
					localStorage.removeItem(this.oauth2.token);
					this.#processOAuth2Flow();
				}
			}
		} else {
			const token = localStorage.getItem(this.oauth2.token);
			if (!token || this.tokenExpired(JSON.parse(token))) {
				this.oauth2OnlineSignIn();
			}
		}
		return true;
	}

	tokenExpired(token) {
		const now = new Date().getTime();
		if (token.expires_at === undefined || token.expires_at < now) {
			console.log('Token expired', token.expires_at, now);
			return true;
		}
		return false;
	}

	async tryRefreshAccessToken() {
		console.log('Refreshing access token');
		// If there is no refresh token, we cannot get an access token.
		if (localStorage.getItem(this.oauth2.refreshToken) === null) {
			console.log('No refresh token on local storage. Doing offline sign in');
			this.oauth2OfflineSignIn();
			return false;
		}
		const refresh_token = localStorage.getItem(this.oauth2.refreshToken);
		const data = {
			client_id: this.CLIENT_ID,
			client_secret: this.CLIENT_SECRET,
			refresh_token: refresh_token,
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
		// console.log(response);
		if (!response.ok) {
			return false;
		}

		const json = await response.json();
		if (json) {
			json.refreshed_at = new Date().getTime();
			json.expires_at = json.refreshed_at + json.expires_in * 1000;
		} else {
			console.error('Refreshing token did not succeed', json);
			return false;
		}

		localStorage.setItem(this.oauth2.token, JSON.stringify(json));
		return true;
	}

	oauth2OfflineSignIn() {
		console.log('OAuth 2.0 offline sign in');
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
			response_type: 'code',
			access_type: 'offline',
			// Needed to get a refresh token every time
			prompt: 'consent',
		};

		// Add form parameters as hidden input values.
		for (const p in params) {
			const input = document.createElement('input');
			input.setAttribute('type', 'hidden');
			input.setAttribute('name', p);
			input.setAttribute('value', params[p]);
			form.appendChild(input);
		}

		// Add form to page and submit it to open the OAuth 2.0 endpoint.
		console.log('Sumbitting form: ', params);
		document.body.appendChild(form);
		/* console.trace();
		alert(this.redirectUri) */
		form.submit();
	}

	oauth2OnlineSignIn() {
		console.log('OAuth 2.0 sign in');
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
		for (const p in params) {
			const input = document.createElement('input');
			input.setAttribute('type', 'hidden');
			input.setAttribute('name', p);
			input.setAttribute('value', params[p]);
			form.appendChild(input);
		}

		// Add form to page and submit it to open the OAuth 2.0 endpoint.
		document.body.appendChild(form);
		form.submit();
	}

	async writeFile(parent, fileName, data, overwrite) {
		let fileId = localStorage.getItem(fileName);
		if (!fileId) fileId = await this.findFile(fileName, parent);
		if (!fileId) {
			fileId = await this.write(fileName, parent, data);
		} else if (overwrite) {
			fileId = await this.update(fileId, data);
		}
		return fileId;
	}

	async getHeader() {
		const token = await this.getAccessToken();
		if (token) {
			return new Headers({
				Authorization: `Bearer ${token}`,
				Accept: 'application/json',
				'Content-Type': 'application/json',
			});
		}
	}

	async find(name, parent, type) {
		const token = await this.getAccessToken();
		if (token) {
			parent = parent || this.ROOT;

			let q = `name='${name}' and trashed=false and '${parent}' in parents`;
			if (type) {
				q += ` and mimeType='${type}'`;
			}
			// console.log(q)

			const header = await this.getHeader();
			const url = new URL(this.FILES_API);
			url.searchParams.append('q', q);

			const id = await fetch(url, {
				method: 'GET',
				headers: header,
			})
				.then((response) => response.json())
				.then((json) => {
					if (json && json.files && json.files.length > 0) {
					// console.log(json);
						return json.files[0].id;
					}
				})
				.catch((err) => console.log(err));

			// console.log("Found ", name, " under ", parent, " with id ", id)
			return id;
		}
	}

	async findChangeAppFolder() {
		const APP_FOLDER = 'Change!';
		const fileId = await this.find(APP_FOLDER);

		const fileType = await this.readFileMetadata(fileId, 'shortcutDetails, mimeType');
		if (fileType.mimeType === 'application/vnd.google-apps.folder') {
			return fileId;
		} if (fileType.mimeType === 'application/vnd.google-apps.shortcut') {
			if (fileType.shortcutDetails?.targetMimeType === 'application/vnd.google-apps.folder') {
				return fileType.shortcutDetails.targetId;
			}
		}
		return undefined;
	}

	async findFolder(name, parent) {
		return await this.find(name, parent, 'application/vnd.google-apps.folder');
	}

	async findFile(name, parent) {
		return await this.find(name, parent);
	}

	async getChildren(folderId) {
		const token = await this.getAccessToken();
		if (token) {
			folderId = folderId || this.ROOT;

			const q = `trashed=false and '${folderId}' in parents`;
			// console.log(q);

			const header = await this.getHeader();
			const url = new URL(this.FILES_API);
			url.searchParams.append('q', q);

			// console.log(url);
			const j = await fetch(url, {
				method: 'GET',
				headers: header,
			})
				.then((response) => response.json())
				.then((json) => {
					if (json && json.files && json.files.length > 0) {
					// console.log(json);
						return json;
					}
				})
				.catch((err) => console.log(err));

			// console.log("Found ", name, " under ", parent, " with id ", id)
			return j;
		}
	}

	async createFolder(name, parent) {
		const token = await this.getAccessToken();
		if (token) {
			const metadata = {
				name: name,
				mimeType: 'application/vnd.google-apps.folder',
				parents: [parent || this.ROOT],
			};

			const headers = await this.getHeader();
			const url = new URL(this.FILES_API);

			const id = await fetch(url, {
				method: 'POST',
				headers: headers,
				body: JSON.stringify(metadata),
			}).then((res) => res.json()).then((json) => json.id);

			// console.log("Created folder", name," with id", id)
			return id;
		}
	}

	async update(fileId, data) {
		const token = await this.getAccessToken();
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
	}

	async write(name, parent, data) {
		const token = await this.getAccessToken();
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
	}

	async readFileMetadata(fileId, fields) {
		const token = await this.getAccessToken();
		if (token) {
			if (!fileId) {
				console.error('No file id provided: ');
			}

			const header = await this.getHeader();
			const url = new URL(`${this.FILES_API}/${fileId}`);
			url.searchParams.append('fields', fields);

			const response = await fetch(url, {
				method: 'GET',
				headers: header,
			});

			if (!response.ok) {
				console.log(fileId, fields);
				console.trace();
				return;
			}

			const json = await response.json();
			return json;
		}
	}

	async readFile(fileId) {
		const token = await this.getAccessToken();
		if (token) {
			if (!fileId) {
				console.error('No file id provided: ');
				console.trace();
			}

			const header = await this.getHeader();
			const url = new URL(`${this.FILES_API}/${fileId}`);
			url.searchParams.append('alt', 'media');

			const response = await fetch(url, {
				method: 'GET',
				headers: header,
			});

			if (!response.ok) {
				return;
			}

			// const json = await response.json();
			// return json;
			const text = await response.text();
			// console.log(text);
			return JSON.parse(text);
		}
	}
}
