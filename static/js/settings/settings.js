import Dom from '../common/gui/dom.js';
import icons from '../common/gui/icons.js';
import Sidenav from '../common/gui/sidenav.js';
import Modal from '../common/gui/modal.js';
import LocalStorage from '../common/persistence/localStorage.js';
import PlanningCache from '../planning/persistence/planningCache.js';
import SpendingCache from '../spending/persistence/spendingCache.js';

export default class Settings {
	/** @type {Dom} */
	#settongsScreen = undefined;

	/** @type {Dom} */
	#navbar = undefined;

	/** @type {LocalStorage} */
	#localStorage = undefined;

	/** @type {Sidenav} */
	#sidenav = undefined;

	static #SYNC_GDRIVE = 'sync_gdrive';

	constructor() {
		this.#localStorage = new LocalStorage(LocalStorage.SETTINGS_KEY);
		this.#sidenav = new Sidenav();
	}

	init() {
		const settingsScreen = this.buildSettingsScreen();
		const navbar = this.buildNavBar();

		const main = document.getElementById('main');
		main.appendChild(settingsScreen.toHtml());
		main.appendChild(navbar.toHtml());
	}

	buildSettingsScreen() {
		const onClickedSyncGdrive = this.onClickedSyncGdrive.bind(this);
		const onClickedRememberGdrive = this.onClickedRememberLogin.bind(this);
		const gDriveSettings = this.gDriveSettings();

		const settingsScreen = new Dom('div').append(
			new Dom('h1').text('Settings'),
			new Dom('div').cls('top-round', 'bot-round').append(
				new Dom('div').cls('accordion-secondary').append(
					new Dom('span').text('Sync to Google Drive'),
					new Dom('span').append(
						new Dom('label').cls('setting').append(
							new Dom('input').onClick(onClickedSyncGdrive)
								.cls('setting-state').type('checkbox').hide()
								.checked(gDriveSettings.enabled),
							new Dom('span').cls('setting-outline'),
							new Dom('i').cls('setting-indicator'),
						),
					),
				),
				new Dom('div').cls('accordion-secondary').append(
					new Dom('span').text('Keep me logged in'),
					new Dom('span').append(
						new Dom('label').cls('setting').append(
							new Dom('input').onClick(onClickedRememberGdrive)
								.cls('setting-state').type('checkbox').hide()
								.checked(gDriveSettings.rememberLogin),
							new Dom('span').cls('setting-outline'),
							new Dom('i').cls('setting-indicator'),
						),
					),
				),
			),
		);
		return settingsScreen;
	}

	buildNavBar() {
		const onDeleteDatabase = Settings.#onClickedDeleteDatabase.bind(this);
		const onDeleteLocalStorage = Settings.#onClickedDeleteLocalStorage.bind(this);
		const onClickOpenSidenav = this.#onClickedOpenSidenav.bind(this);

		this.#navbar = new Dom('nav').append(
			new Dom('div').cls('nav-header').append(
				new Dom('button').id('setting-del-databses').cls('nav-item').onClick(onDeleteLocalStorage)
					.append(
						new Dom('img').cls('white-fill').text('Delete Planning').attr('alt', 'Delete Planning').attr('src', icons.remove_table),
					),
				new Dom('button').id('planning-del-statement').cls('nav-item').onClick(onDeleteDatabase)
					.append(
						new Dom('img').cls('white-fill').text('Delete Statement').attr('alt', 'Delete Statement').attr('src', icons.remove_database),
					),
			),
			new Dom('div').cls('nav-footer').append(
				new Dom('button').cls('nav-item', 'nav-trigger').onClick(onClickOpenSidenav).append(
					new Dom('img').cls('white-fill').text('Menu').attr('alt', 'Menu').attr('src', icons.menu),
				),
			),
			new Dom('div').cls('dropup-content', 'top-round').hide(),
		);
		return this.#navbar;
	}

	static #onClickedDeleteDatabase() {
		const areYouSureModal = Modal.areYouSureModal(
			'delete-databases',
			'Are you sure you want to delete all local databases?',
			() => {
				window.indexedDB.deleteDatabase(PlanningCache.DATABASE_NAME);
				window.indexedDB.deleteDatabase(SpendingCache.DATABASE_NAME);
			},
		);
		areYouSureModal.open();
	}

	static #onClickedDeleteLocalStorage() {
		const areYouSureModal = Modal.areYouSureModal(
			'delete-local-storage',
			'Are you sure you want to delete all local storage?',
			() => localStorage.clear(),
		);
		areYouSureModal.open();
	}

	#onClickedOpenSidenav() {
		this.#sidenav.open();
	}

	onClickedSyncGdrive(event) {
		const value = event.currentTarget.checked;
		let syncGdrive = this.#localStorage.readById(Settings.#SYNC_GDRIVE);
		if (!syncGdrive) {
			syncGdrive = { id: Settings.#SYNC_GDRIVE };
		}
		syncGdrive.enabled = value;
		if (!value) {
			syncGdrive.rememberLogin = false;
		}
		this.#localStorage.store(syncGdrive);
	}

	onClickedRememberLogin(event) {
		const value = event.currentTarget.checked;
		const syncGdrive = this.#localStorage.readById(Settings.#SYNC_GDRIVE);
		if (!syncGdrive || !syncGdrive.enabled) {
			throw Error('Cannot store Remember login password without enabling GDrive first');
		}
		syncGdrive.rememberLogin = value;
		this.#localStorage.store(syncGdrive);
	}

	gDriveSettings() {
		const gDriveSettings = this.#localStorage.readById(Settings.#SYNC_GDRIVE);
		if (!gDriveSettings) return { enabled: false, rememberLogin: false };
		return gDriveSettings;
	}
}
