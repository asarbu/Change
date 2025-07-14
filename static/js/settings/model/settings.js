import GDriveSettings from './gDriveSettings.js';
import PlanningTableSettings from './planiningTableSettings.js';
import Theme from './theme.js';

export default class Settings {
	/** @type {GDriveSettings} */
	#gDriveSettings = undefined;

	/** @type {Theme}} */
	#theme = undefined;

	/** @type {PlanningTableSettings} */
	#planningTableSettings = undefined;

	/**
	 * @param {GDriveSettings} gDriveSettings
	 * @param {Theme} theme
	 * @param {PlanningTableSettings} planningTableSettings
	 */
	constructor(gDriveSettings, theme, planningTableSettings) {
		this.#gDriveSettings = gDriveSettings || new GDriveSettings(false, false);
		this.#theme = theme || Theme.GREEN;
		this.#planningTableSettings = planningTableSettings;
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

	/**
	 * @returns {Theme}
	 */
	currentTheme() {
		return this.#theme;
	}

	planningTableSettings() {
		return this.#planningTableSettings;
	}

	themeName() {
		return this.#theme.name();
	}

	static fromJson({ gDriveSettings, theme, planningTableSettings } = {}) {
		return new Settings(
			GDriveSettings.fromJson(gDriveSettings),
			Theme.fromJson(theme),
			PlanningTableSettings.fromJson(planningTableSettings),
		);
	}

	toJson() {
		return {
			gDriveSettings: this.#gDriveSettings.toJson(),
			theme: this.#theme.toJson(),
			planningTableSettings: this.#planningTableSettings.toJson(),
		};
	}
}
