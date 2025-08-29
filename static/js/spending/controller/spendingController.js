import SpendingScreen from '../view/spendingScreen.js';
import Spending from '../model/spending.js';
import SpendingReport from '../model/spendingReport.js';
import Utils from '../../common/utils/utils.js';
import SettingsController from '../../settings/controller/settingsController.js';
import Alert from '../../common/gui/alert.js';
import PlanningPersistence from '../../planning/persistence/planningPersistence.js';
import SpendingPersistence from '../persistence/spendingPersistence.js';
import PlanningMissingScreen from '../view/planningMissingScreen.js';
import RoutingController from '../../common/controller/routingController.js';

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

	/** @type { Array<SpendingReport> } */
	#cachedReports = undefined;

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
		this.#cachedReports = [];
		this.#settings = settings;
	}

	/**
	 * @returns {Promise<SpendingScreen>}
	 */
	async init() {
		const screenFromCache = await this.initScreenFromCache();
		const screenFromGDrive = await this.initScreenFromGDrive();

		if (!screenFromCache && !screenFromGDrive) {
			const planningMissingScreen = new PlanningMissingScreen();
			planningMissingScreen.onClickFetchDefault(this.onClickedFetchDefaultPlanning.bind(this));
			planningMissingScreen.onClickGoToSettings(this.onClickedGoToSettings.bind(this));
			planningMissingScreen.onClickGoToPlanning(this.onClickedGoToPlanning.bind(this));
			planningMissingScreen.init();
			return planningMissingScreen;
		}

		const availableYears = await this.#spendingPersistence.availableYears();
		availableYears.forEach((availableYear) => this.#screen.updateYear(+availableYear));

		return this.#screen;
	}

	async initScreenFromCache() {
		const defaultPlanning = await this.#planningPersistence
			.readFromCache(this.#defaultMonth);

		if (!defaultPlanning) {
			return undefined;
		}

		this.#cachedReports = await this.#spendingPersistence.readAllFromCache() || [];
		if (this.#cachedReports.length === 0 || !this.#cachedReports[this.#defaultMonth]) {
			this.#cachedReports[this.#defaultMonth] = new SpendingReport(
				this.#defaultYear,
				this.#defaultMonth,
				defaultPlanning,
			);
		}

		// TODO Remove planning dependency from spending report. Use the goals from spendings directly
		const cachedPlannings = await this.#planningPersistence.readAllFromCache();
		for (let month = 0; month < this.#cachedReports.length; month += 1) {
			const report = this.#cachedReports[month];
			if (report) {
				const planning = cachedPlannings[month] || defaultPlanning;
				report.updatePlanning(planning);
			}
		}

		this.initSpendingScreen(this.#cachedReports);
		return this.#screen;
	}

	// TODO: Move this to a sepparate file and load it in init(?)
	// only if the user has gdrive enabled in settings
	async initScreenFromGDrive() {
		const gDriveSettings = this.#settings.gDriveSettings();
		if (!gDriveSettings.isEnabled()) {
			return undefined;
		}

		Alert.show('Google Drive', 'Started synchronization with Google Drive...');
		this.#spendingPersistence.enableGdrive(gDriveSettings);
		const gDriveReports = await this.#spendingPersistence.readAllFromGDrive();
		if (gDriveReports.length === 0) {
			return undefined;
		}

		// TODO Remove planning dependency from this class
		this.#planningPersistence.enableGDrive(gDriveSettings);
		const gDrivePlannings = await this.#planningPersistence.readAllFromGDrive();
		gDriveReports.filter((item) => item).forEach((gDriveReport) => {
			const month = gDriveReport.month();
			const planning = gDrivePlannings[month];
			if (planning) {
				gDriveReport.updatePlanning(planning);
			}
			this.#cachedReports[month] = gDriveReport;
		});

		this.initSpendingScreen(this.#cachedReports);

		Alert.show('Google Drive', 'Finished synchronization with Google Drive');
		return this.#screen;
	}

	/**
	 * 
	 * @param {Array<SpendingReport>} reports 
	 * @returns 
	 */
	initSpendingScreen(reports) {
		const spendings = reports.map((report) => report.spendings());
		const availableCategories = reports.map((report) => report.plannedCategories());
		this.#screen = new SpendingScreen(this.#defaultYear, this.#defaultMonth, spendings, availableCategories)
			.onClickSave(this.onSavedReport)
			.onCreateSpending(this.onCreatedSpending)
			.init()
			.jumpToMonth(this.#defaultMonth);
		return this.#screen;
	}

	/**
	 * @param {Spending} spending
	 */
	onCreatedSpending = async (spending) => {
		return this.#spendingPersistence.store(spending);
	}

	/**
	 * @param {SpendingReport} spendingReport
	 */
	onSavedReport = async (spendingReport) => {
		await this.#spendingPersistence.updateAll(spendingReport);
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
