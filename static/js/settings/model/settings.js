import GDriveSettings from './gDriveSettings.js';

export default class Settings {
	/** @type {GDriveSettings} */
	#gDriveSettings = undefined;

	constructor(gDriveSettings) {
		if (gDriveSettings) {
			this.#gDriveSettings = gDriveSettings;
		} else {
			this.#gDriveSettings = new GDriveSettings(false, false);
		}
	}

	/**
	 * @returns {GDriveSettings}
	 */
	gDriveSettings() {
		return this.#gDriveSettings;
	}

	static fromJson({ gDriveSettings } = {}) {
		return new Settings(GDriveSettings.fromJson(gDriveSettings));
	}

	toJson() {
		return { gDriveSettings: this.#gDriveSettings.toJson() };
	}
}
