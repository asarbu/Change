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
		this.#spendingPersistence.enableGdrive(gDriveSettings.canRememberLogin());
		const gDriveReports = await this.#spendingPersistence.readAllFromGDrive();
		if (gDriveReports.length === 0) {
			return undefined;
		}

		// TODO Remove planning dependency from this class
		this.#planningPersistence.enableGDrive(gDriveSettings.canRememberLogin());
		const gDrivePlannings = await this.#planningPersistence.readAllFromGDrive();
		gDriveReports.filter((item) => item).forEach((gDriveReport) => {
			const month = gDriveReport.month();
			const planning = gDrivePlannings[month];
			if (planning) {
				gDriveReport.updatePlanning(planning);
				this.#cachedReports[month] = gDriveReport;
			} else {
				Alert.show('Google Drive', `No planning found for month ${month + 1}`);
			}
		});

		this.initSpendingScreen(this.#cachedReports);

		Alert.show('Google Drive', 'Finished synchronization with Google Drive');
		return this.#screen;
	}

	initSpendingScreen(reports) {
		this.#screen = new SpendingScreen(this.#defaultYear, this.#defaultMonth, reports);
		this.#screen.init();
		// TODO transform assignments to methods
		this.#screen.onCreateSpendingCallback = this.onCreatedSpending.bind(this);
		this.#screen.onSaveReportCallback = this.onSavedReport.bind(this);
		this.#screen.onDeleteReportCallback = this.onDeletedReport.bind(this);
		this.#screen.jumpToMonth(this.#defaultMonth);
		return this.#screen;
	}

	/**
	 * @param {Spending} spending
	 */
	async onCreatedSpending(spending) {
		const report = this.#cachedReports.filter((item) => item).find(
			(spendingReport) =>	spendingReport.year() === spending.spentOn.getFullYear()
				&& spendingReport.month() === spending.spentOn.getMonth(),
		);

		if (report) {
			// A report was found, we need to update the whole screen
			report.appendSpending(spending);
			this.#screen.refreshMonth(report);
		} else if (spending.spentOn.getFullYear() === this.#defaultYear) {
			// No report found, we need to create a new one
			const newReport = new SpendingReport(
				spending.spentOn.getFullYear(),
				spending.spentOn.getMonth(),
				spending.planning,
			);
			newReport.appendSpending(spending);
			this.#cachedReports[spending.spentOn.getMonth()] = newReport;
			this.#screen.refreshMonth(newReport);
			this.#screen.slideToMonth(spending.spentOn.getMonth());
		} else {
			// Spending is from a different year, no need to create a new report
			this.#screen.updateYear(spending.spentOn.getFullYear());
		}
		return this.#spendingPersistence.store(spending);
	}

	/**
	 * @param {SpendingReport} spendingReport
	 */
	async onDeletedReport(spendingReport) {
		// We can only select delete for current year, so send only month
		// TODO Show Are you sure? Modal
		this.#spendingPersistence.deleteAll(spendingReport);
	}

	/**
	 * @param {SpendingReport} spendingReport
	 */
	async onSavedReport(spendingReport) {
		await this.#spendingPersistence.updateAll(spendingReport);
	}

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
