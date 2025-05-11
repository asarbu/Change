export default class GDriveSettings {
	#enabled = undefined;

	#rememberLogin = undefined;

	// TODO replace the booleans with an object that describes them
	constructor(enabled, remberLogin) {
		this.#enabled = enabled;
		this.#rememberLogin = remberLogin;
	}

	enable(value = true) {
		if (!value) this.#rememberLogin = false;
		this.#enabled = value;
	}

	rememberLogin(value = true) {
		this.#rememberLogin = value;
	}

	/**
	 * @returns {boolean}
	 */
	isEnabled() {
		return this.#enabled;
	}

	/**
	 * @returns {boolean}
	 */
	canRememberLogin() {
		if (!this.#enabled) return false;
		return this.#rememberLogin;
	}

	toJson() {
		return { enabled: this.#enabled, rememberLogin: this.#rememberLogin };
	}

	static fromJson({ enabled, rememberLogin } = { enabled: false, rememberLogin: false }) {
		return new GDriveSettings(enabled, rememberLogin);
	}
}
