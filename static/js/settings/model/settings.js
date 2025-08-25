import GDriveSettings from './gDriveSettings.js';
import PlanningTableSettings from './planiningTableSettings.js';
import SpendingTableSettings from './spendingTableSettings.js';
import Theme from './theme.js';

export default class Settings {
	/** @type {GDriveSettings} */
	#gDriveSettings = undefined;

	/** @type {Theme}} */
	#theme = undefined;

	/** @type {PlanningTableSettings} */
	#planningTableSettings = undefined;

	/** @type {SpendingTableSettings} */
	#spendingTableSettings = undefined;

	/**
	 * @param {GDriveSettings} gDriveSettings
	 * @param {Theme} theme
	 * @param {PlanningTableSettings} planningTableSettings
	 * @param {SpendingTableSettings} spendingTableSettings
	 */
	constructor(gDriveSettings, theme, planningTableSettings, spendingTableSettings) {
		this.#gDriveSettings = gDriveSettings || new GDriveSettings(false, false);
		this.#theme = theme || Theme.GREEN;
		this.#planningTableSettings = planningTableSettings;
		this.#spendingTableSettings = spendingTableSettings;
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

	spendingTableSettings() {
		return this.#spendingTableSettings;
	}

	themeName() {
		return this.#theme.name();
	}

	static fromJson({ gDriveSettings, theme, planningTableSettings, spendingTableSettings } = {}) {
		return new Settings(
			GDriveSettings.fromJson(gDriveSettings),
			Theme.fromJson(theme),
			PlanningTableSettings.fromJson(planningTableSettings),
			SpendingTableSettings.fromJson(spendingTableSettings),
		);
	}

	toJson() {
		return {
			gDriveSettings: this.#gDriveSettings.toJson(),
			theme: this.#theme.toJson(),
			planningTableSettings: this.#planningTableSettings.toJson(),
			spendingTableSettings: this.#spendingTableSettings.toJson(),
		};
	}
}
