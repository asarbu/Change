import Dom from '../../common/gui/dom.js';
import icons from '../../common/gui/icons.js';
import Modal from '../../common/gui/modal.js';
import Sidenav from '../../common/gui/sidenav.js';
import TableDom from '../../common/gui/tableDom.js';
import PlanningTableSettings from '../model/planiningTableSettings.js';
import Settings from '../model/settings.js';

export default class SettingsScreen {
	#onClickedDeleteDatabaseHandler = undefined;

	#onClickedDeleteLocalStorageHandler = undefined;

	#onClickedSyncGDriveHandler = undefined;

	#onClickedRememberLoginHandler = undefined;

	#onChangedThemeHandler = undefined;

	#onChangedPlanningTableVisibleColumnsHandler = undefined;

	/** @type {Settings} */
	#settings = undefined;

	/** @type {Dom} */
	#navbar = undefined;

	/** @type {Dom} */
	#dom = undefined;

	/** @type {Dom} */
	#sidenav = undefined;

	/** @type {Dom} */
	#themeSelect = new Dom();

	#gDriveEnabledInput = new Dom();

	#gDriveRememberLoginInput = new Dom();

	/** @type {Modal} */
	#planningTableHeaderModal = undefined;

	constructor(settings) {
		this.#settings = settings;
	}

	init() {
		this.buildModals();
		this.buildSettingsScreen();
		this.buildNavBar();
		this.#selectThemeOption(this.#settings.themeName());
		this.#sidenav = new Sidenav();

		const main = document.getElementById('main');
		main.appendChild(this.#dom.toHtml());
		main.appendChild(this.#navbar.toHtml());

		return this;
	}

	buildModals() {
		const visibleColumns = this.#settings.planningTableSettings().visibleColumns();

		const modalContent = new Dom('div').cls('round').append(
			...PlanningTableSettings.COLUMN_NAMES.map((columnName) => new Dom('div').cls('accordion-secondary', 'no-scroll').append(
				new Dom('span').text(columnName),
				new Dom('span').append(
					new Dom('label').cls('setting').append(
						new Dom('input').cls('setting-state')
							.type('checkbox').checked(visibleColumns.includes(columnName))
							.hide(),
						new Dom('span').cls('setting-outline'),
						new Dom('i').cls('setting-indicator'),
					),
				),
			)),
		);

		this.#planningTableHeaderModal = new Modal('planning-columns-modal')
			.header(new Dom('h2').text('Planning columns'))
			.body(new Dom('div').append(modalContent))
			.addFooterWithActionButton('Save', () => {
				const checkedColumns = Array.from(modalContent.toHtml().querySelectorAll('input[type="checkbox"]'))
					.map((input, idx) => ({ input, idx }))
					.filter(({ input }) => input.checked)
					.map(({ idx }) => PlanningTableSettings.COLUMN_NAMES[idx]);
				this.#onChangedPlanningTableVisibleColumnsHandler?.(checkedColumns);
			});
	}

	buildSettingsScreen() {
		const onClickedSyncGdrive = this.#onClickedSyncGdrive.bind(this);
		const onClickedRememberGdrive = this.#onClickedRememberLogin.bind(this);
		const gDriveSettings = this.#settings.gDriveSettings();

		this.#dom = new Dom('div').append(
			new Dom('h1').text('Settings'),
			new Dom('h2').text('Google Drive Settings'),
			new Dom('div').cls('round').append(
				new Dom('div').cls('accordion-secondary').append(
					new Dom('span').text('Sync to Google Drive'),
					new Dom('span').append(
						new Dom('label').cls('setting').append(
							new Dom('input').onClick(onClickedSyncGdrive).cls('setting-state')
								.type('checkbox').checked(gDriveSettings.isEnabled()).hide()
								.cloneTo(this.#gDriveEnabledInput),
							new Dom('span').cls('setting-outline'),
							new Dom('i').cls('setting-indicator'),
						),
					),
				),
				new Dom('div').cls('accordion-secondary').append(
					new Dom('span').text('Keep me logged in'),
					new Dom('span').append(
						new Dom('label').cls('setting').append(
							new Dom('input').onClick(onClickedRememberGdrive).cls('setting-state')
								.type('checkbox').checked(gDriveSettings.canRememberLogin()).hide()
								.cloneTo(this.#gDriveRememberLoginInput),
							new Dom('span').cls('setting-outline'),
							new Dom('i').cls('setting-indicator'),
						),
					),
				),
			),
			new Dom('h2').text('Theme color'),
			new Dom('div').cls('round').append(
				new Dom('div').cls('accordion-secondary').append(
					new Dom('span').text('Pick a color theme'),
					new Dom('span').append(
						new Dom('select').id('theme').onChange(this.#onChangedTheme).cloneTo(this.#themeSelect).append(
							new Dom('option').value('green').text('Green'),
							new Dom('option').value('red').text('Red'),
							new Dom('option').value('blue').text('Blue'),
							new Dom('option').value('purple').text('Purple'),
							new Dom('option').value('black').text('Black'),
						),
					),
				),
			),
			// --- Planning Table Columns Section ---
			new Dom('h2').text('Planning Table Columns'),
			new Dom('div').cls('accordion-secondary').append(
				new Dom('span').text('Visible columns'),
				new Dom('span').text('▲'),
			).onClick(this.#planningTableHeaderModal.open.bind(this.#planningTableHeaderModal)),
		);
		return this.#dom;
	}

	#onChangedTheme = (event) => {
		this.#onChangedThemeHandler?.(event.target.value ?? '');
	};

	#selectThemeOption(value) {
		this.#themeSelect.toHtml().childNodes.forEach((node) => {
			if (node.value === value) {
				node.setAttribute('selected', true);
			}
		});
	}

	buildNavBar() {
		const onDeleteDatabase = this.#onClickedDeleteDatabase.bind(this);
		const onDeleteLocalStorage = this.#onClickedDeleteLocalStorage.bind(this);
		const onClickOpenSidenav = this.#onClickedOpenSidenav.bind(this);

		this.#navbar = new Dom('nav').append(
			new Dom('div').cls('nav-header').append(
				new Dom('button').cls('nav-item').onClick(onDeleteLocalStorage).append(
					new Dom('img').cls('white-fill').text('Delete Planning').attr('alt', 'Delete Planning').attr('src', icons.remove_table),
				),
				new Dom('button').cls('nav-item').onClick(onDeleteDatabase).append(
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

	#onClickedSyncGdrive(event) {
		this.#onClickedSyncGDriveHandler?.(event.currentTarget.checked);
	}

	#onClickedRememberLogin(event) {
		this.#onClickedRememberLoginHandler?.(event.currentTarget.checked);
	}

	#onClickedOpenSidenav() {
		this.#sidenav.open();
	}

	#onClickedDeleteDatabase() {
		return Modal.areYouSureModal(
			'delete-databases',
			'Are you sure you want to delete all local databases?',
			this.#onClickedDeleteDatabaseHandler,
		).open();
	}

	#onClickedDeleteLocalStorage() {
		return Modal.areYouSureModal(
			'delete-local-storage',
			'Are you sure you want to delete all local storage?',
			this.#onClickedDeleteLocalStorageHandler,
		).open();
	}

	onClickDeleteDatabase(handler) {
		this.#onClickedDeleteDatabaseHandler = handler;
		return this;
	}

	onClickDeleteLocalStorage(handler) {
		this.#onClickedDeleteLocalStorageHandler = handler;
		return this;
	}

	onClickSyncGdrive(handler) {
		this.#onClickedSyncGDriveHandler = handler;
		return this;
	}

	onClickedRememberLogin(handler) {
		this.#onClickedRememberLoginHandler = handler;
		return this;
	}

	onChangedTheme(handler) {
		this.#onChangedThemeHandler = handler;
		return this;
	}

	onChangedPlanningTableVisibleColumns(handler) {
		this.#onChangedPlanningTableVisibleColumnsHandler = handler;
		return this;
	}

	/**
	 * Redraw the Settings screen according to the provided settings
	 * @param {Settings} settings
	 */
	refresh(settings) {
		this.#settings = settings;
		const gDriveSettings = settings.gDriveSettings();
		this.#gDriveEnabledInput.checked(gDriveSettings.isEnabled());
		this.#gDriveRememberLoginInput.checked(gDriveSettings.canRememberLogin());
		this.#selectThemeOption(settings.currentTheme().name());
	}
}
