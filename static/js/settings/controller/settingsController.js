import PlanningCache from '../../planning/persistence/planningCache.js';
import SpendingCache from '../../spending/persistence/spendingCache.js';
import LocalStorage from '../../common/persistence/localStorage.js';
import Settings from '../model/settings.js';
import SettingsScreen from '../view/settingsScreen.js';
import Theme from '../model/theme.js';

export default class SettingsController {
	static #SETTINGS_LOCALSTORAGE_KEY = 'settings';

	/** @type {SettingsScreen} */
	#settingsScreen = undefined;

	/** @type {LocalStorage} */
	#localStorage = undefined;

	constructor() {
		this.#localStorage = new LocalStorage();
		this.apply();
	}

	init = () => {
		this.#settingsScreen = new SettingsScreen(this.currentSettings()).init()
			.onClickDeleteDatabase(this.#onClickedDeleteDatabase)
			.onClickDeleteLocalStorage(this.#onClickedDeleteLocalStorage)
			.onClickSyncGdrive(this.#onClickedSyncGdrive)
			.onClickedRememberLogin(this.#onClickedRememberLogin)
			.onChangedTheme(this.#onChangedTheme);
		return this.#settingsScreen;
	};

	/**
	 * Reads and parses the user settings at the current time
	 * @returns {Settings} Current user settings
	 */
	currentSettings = () => Settings
		.fromJson(this.#localStorage.getItem(SettingsController.#SETTINGS_LOCALSTORAGE_KEY));

	apply = () => {
		const theme = this.currentSettings().currentTheme();
		document.querySelector('meta[name="theme-color"]').setAttribute('content', theme.primaryDarkColor());
		const root = document.querySelector(':root');
		root.style.setProperty('--primary-dark', theme.primaryDarkColor());
		root.style.setProperty('--primary-light', theme.primaryLightColor());
		return this;
	};

	#onClickedDeleteDatabase = () => {
		window.indexedDB.deleteDatabase(PlanningCache.DATABASE_NAME);
		window.indexedDB.deleteDatabase(SpendingCache.DATABASE_NAME);
		this.#settingsScreen.refresh(this.apply().currentSettings());
	};

	#onClickedDeleteLocalStorage = () => {
		this.#localStorage.clear();
		this.#settingsScreen.refresh(this.apply().currentSettings());
	};

	#onClickedSyncGdrive = (value) => {
		const currentSettings = this.currentSettings();
		currentSettings.gDriveSettings().enable(value);
		this.#localStorage
			.setItem(SettingsController.#SETTINGS_LOCALSTORAGE_KEY, currentSettings.toJson());
		this.#settingsScreen.refresh(this.currentSettings());
	};

	#onClickedRememberLogin = (value) => {
		const currentSettings = this.currentSettings();
		currentSettings.gDriveSettings().rememberLogin(value);
		this.#localStorage
			.setItem(SettingsController.#SETTINGS_LOCALSTORAGE_KEY, currentSettings.toJson());
		this.#settingsScreen.refresh(this.currentSettings());
	};

	#onChangedTheme = (themeName) => {
		const theme = Theme.fromName(themeName);
		const currentSettings = this.currentSettings();
		currentSettings.changeTheme(theme);
		this.#localStorage
			.setItem(SettingsController.#SETTINGS_LOCALSTORAGE_KEY, currentSettings.toJson());
		this.apply();
	};
}
