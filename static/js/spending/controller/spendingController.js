import SpendingScreen from '../view/spendingScreen.js';
import Spending from '../model/spending.js';
import Utils from '../../common/utils/utils.js';
import SettingsController from '../../settings/controller/settingsController.js';
import Alert from '../../common/gui/alert.js';
import PlanningPersistence from '../../planning/persistence/planningPersistence.js';
import SpendingPersistence from '../persistence/spendingPersistence.js';
import PlanningMissingScreen from '../view/planningMissingScreen.js';
import RoutingController from '../../common/controller/routingController.js';
import Planning from '../../planning/model/planningModel.js';

export default class SpendingController {
	/** @type {PlanningPersistence} */
	#planningPersistence = undefined;

	/** @type {SpendingPersistence} */
	#spendingPersistence = undefined;

	/** @type {number} */
	#defaultYear = undefined;

	/** @type {number} */
	#defaultMonth = undefined;

	/** @type {SpendingScreen} */
	#screen = undefined;

	/** @type { Array<Spending[]> } */
	#cachedSpendings = undefined;

	/** @type {RoutingController} */
	#routingController = undefined;

	#settings = undefined;

	constructor(
		dateTimeProvider = new Date(),
		settings = new SettingsController().currentSettings(),
	) {
		const now = dateTimeProvider;
		const queryString = window.location.search;
		const urlParams = new URLSearchParams(queryString);
		const year = +(urlParams.get('year'));
		const month = Utils.monthForName((urlParams.get('month')));
		this.#defaultYear = year || now.getFullYear();
		this.#defaultMonth = month || now.getMonth();
		this.#planningPersistence = new PlanningPersistence(this.#defaultYear);
		this.#spendingPersistence = new SpendingPersistence(this.#defaultYear);
		this.#routingController = new RoutingController();
		this.#cachedSpendings = [];
		this.#settings = settings;
	}

	/**
	 * @returns {Promise<SpendingScreen>}
	 */
	async init() {
		this.#screen = await this.initScreenFromCache();
		this.#screen = await this.initScreenFromGDrive() ?? this.#screen;

		if (!this.#screen) {
			const planningMissingScreen = new PlanningMissingScreen();
			planningMissingScreen.onClickFetchDefault(this.onClickedFetchDefaultPlanning.bind(this));
			planningMissingScreen.onClickGoToSettings(this.onClickedGoToSettings.bind(this));
			planningMissingScreen.onClickGoToPlanning(this.onClickedGoToPlanning.bind(this));
			planningMissingScreen.init();
			return planningMissingScreen;
		}

		const availableYears = await this.#spendingPersistence.availableYears();
		availableYears.forEach((availableYear) => this.#screen.appendYearToNavbar(+availableYear));

		return this.#screen;
	}

	async initScreenFromCache() {
		const plannings = await this.#planningPersistence.readAllFromCache();
		if (!plannings?.length) { return undefined; }

		this.#cachedSpendings = await this.#spendingPersistence.readAllFromCache() || [];
		const screen = this.initSpendingScreen(this.#cachedSpendings, plannings);
		return screen;
	}

	// TODO: Move this to a sepparate file and load it in init(?)
	// only if the user has gdrive enabled in settings
	async initScreenFromGDrive() {
		const gDriveSettings = this.#settings.gDriveSettings();
		if (!gDriveSettings.isEnabled()) {
			return undefined;
		}

		Alert.show('Google Drive', 'Started synchronization with Google Drive...');
		this.#planningPersistence.enableGDrive(gDriveSettings);
		const plannings = await this.#planningPersistence.readAllFromGDrive();
		if (!plannings?.length) { return undefined; }

		this.#spendingPersistence.enableGdrive(gDriveSettings);
		const yearlySpendings = await this.#spendingPersistence.readAllFromGDrive();

		yearlySpendings.forEach((monthlySpendings, month) => this.#screen.refreshMonth(month, monthlySpendings, plannings[month].readAllCategories()));

		Alert.show('Google Drive', 'Finished synchronization with Google Drive');
		return this.#screen;
	}

	/**
	 * 
	 * @param {Array<Spending[]>} spendings
	 * @param {Array<Planning>} plannings
	 * @returns 
	 */
	initSpendingScreen(spendings, plannings) {
		const availableCategories = plannings.map((planning) => planning.readAllCategories());
		const screen = new SpendingScreen(this.#defaultYear, this.#defaultMonth, spendings, availableCategories)
			.onClickSave(this.onSavedSpendings)
			.onCreateSpending(this.onCreatedSpending)
			.init()
			.jumpToMonth(this.#defaultMonth);
		return screen;
	}

	/**
	 * @param {Spending} spending
	 */
	onCreatedSpending = async (spending) => {
		return this.#spendingPersistence.store(spending);
	}

	/**
	 * @param {Spending[]} spendingReport
	 */
	onSavedSpendings = async (spendings) => {
		await this.#spendingPersistence.updateAll(spendings);
	};

	onClickedFetchDefaultPlanning() {
		const storePlanning = this.#planningPersistence.store.bind(this.#planningPersistence);
		const reinitializeScreen = this.init.bind(this);

		this.#routingController
			.fetchDefaultPlanning()
			.then(storePlanning)
			.then(reinitializeScreen);
	}

	onClickedGoToSettings() {
		this.#routingController.redirectToSettings();
	}

	onClickedGoToPlanning() {
		this.#routingController.redirectToPlanning();
	}
}
