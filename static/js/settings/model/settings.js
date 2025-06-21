import GDriveSettings from './gDriveSettings.js';
import Theme from './theme.js';

export default class Settings {
	/** @type {GDriveSettings} */
	#gDriveSettings = undefined;

	/** @type {Theme}} */
	#theme = undefined;

	/**
	 * @param {GDriveSettings} gDriveSettings
	 * @param {Theme} theme
	 */
	constructor(gDriveSettings, theme) {
		this.#gDriveSettings = gDriveSettings || new GDriveSettings(false, false);
		this.#theme = theme || Theme.GREEN;
	}

	/**
	 * @returns {GDriveSettings}
	 */
	gDriveSettings() {
		return this.#gDriveSettings;
	}

	/**
	 * @param {Theme} theme
	 */
	changeTheme(theme) {
		this.#theme = theme;
	}

	themeName() {
		return this.#theme.name();
	}

	static fromJson({ gDriveSettings, theme } = {}) {
		return new Settings(GDriveSettings.fromJson(gDriveSettings), Theme.fromJson(theme));
	}

	toJson() {
		return { gDriveSettings: this.#gDriveSettings.toJson(), theme: this.#theme.toJson() };
	}
}
