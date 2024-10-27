export default class GDriveAuth {
	// TODO put secret environment variables
	#CLIENT_ID = '48008571695-vjj7lrnm4dv8i49ioi3a4tq3pbl1j67h.apps.googleusercontent.com';

	#CLIENT_SECRET = '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';

	#redirectUri = window.location.href;

	/** @type {boolean} */
	#rememberLogin = undefined;

	oauth2Properties = {
		name: 'oauth2',
		token: 'oauth2_token',
		accessToken: 'access_token',
		refreshToken: 'oauth2_refresh_token',
		state: 'change-application-nonce',
	};

	async init() {
		await this.#processOAuth2Flow();
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

		[, this.#redirectUri] = paramString;
		let match = regex.exec(paramString[2]);
		while (match) {
			params[decodeURIComponent(match[1])] = decodeURIComponent(match[2]);
			match = regex.exec(paramString[2]);
		}
		if (Object.keys(params).length > 0) {
			if (params.state && params.state === this.oauth2Properties.state) {
				await this.#getRefreshToken(params);
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
			if (params.state && params.state === this.oauth2Properties.state) {
				params.refreshed_at = new Date().getTime();
				params.expires_at = params.refreshed_at + params.expires_in * 1000;
				localStorage.setItem(this.oauth2Properties.token, JSON.stringify(params));
			}
		} else if (!localStorage.getItem(this.oauth2Properties.token)) {
			this.#oauth2OnlineSignIn();
		}
	}

	async #getRefreshToken(authorizationCode) {
		// console.log("Getting refresh token. Redirect URI ",window.location.href);
		const data = {
			code: authorizationCode.code,
			client_id: this.#CLIENT_ID,
			client_secret: this.#CLIENT_SECRET,
			redirect_uri: this.#redirectUri,
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
			localStorage.setItem(this.oauth2Properties.refreshToken, json.refresh_token);
			delete json.refresh_token;
		}
		json.refreshed_at = new Date().getTime();
		json.expires_at = json.refreshed_at + json.expires_in * 1000;

		localStorage.setItem(this.oauth2Properties.token, JSON.stringify(json));
	}

	async getAccessToken() {
		const storedToken = localStorage.getItem(this.oauth2Properties.token);
		const params = storedToken ? JSON.parse(storedToken) : undefined;
		if (!params) return this.login();

		const token = params[this.oauth2Properties.accessToken];
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
		const refreshToken = localStorage.getItem(this.oauth2Properties.refreshToken);
		if (!refreshToken) {
			return undefined;
		}

		const data = {
			client_id: this.#CLIENT_ID,
			client_secret: this.#CLIENT_SECRET,
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
			throw Error(`Refreshing token did not succeed ${json}`);
		}

		localStorage.setItem(this.oauth2Properties.token, JSON.stringify(json));
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
			client_id: this.#CLIENT_ID,
			redirect_uri: this.#redirectUri,
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
			client_id: this.#CLIENT_ID,
			redirect_uri: this.#redirectUri,
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
}
