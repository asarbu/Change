import SpendingScreen from '../view/spendingScreen.js';
import Spending from '../model/spending.js';
import SpendingReport from '../model/spendingReport.js';
import Utils from '../../common/utils/utils.js';
import Settings from '../../settings/settings.js';
import Alert from '../../common/gui/alert.js';
import PlanningPersistence from '../../planning/persistence/planningPersistence.js';
import SpendingPersistence from '../persistence/spendingPersistence.js';

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

	constructor() {
		const now = new Date();
		const queryString = window.location.search;
		const urlParams = new URLSearchParams(queryString);
		const year = +(urlParams.get('year'));
		const month = Utils.monthForName((urlParams.get('month')));
		this.#defaultYear = year || now.getFullYear();
		this.#defaultMonth = month || now.getMonth();
		this.#planningPersistence = new PlanningPersistence(this.#defaultYear);
		this.#spendingPersistence = new SpendingPersistence(this.#defaultYear);
	}

	async init() {
		this.#cachedReports = await this.#spendingPersistence.readAllFromCache();
		const defaultPlanning = await this.#planningPersistence
			.readFromCacheOrDefault(this.#defaultMonth);

		if (this.#cachedReports.length === 0 || !this.#cachedReports[this.#defaultMonth]) {
			this.#cachedReports[this.#defaultMonth] = new SpendingReport(
				this.#defaultYear,
				this.#defaultMonth,
				defaultPlanning,
			);
		}

		const cachedPlannings = await this.#planningPersistence.readAllFromCache();
		for (let month = 0; month < this.#cachedReports.length; month += 1) {
			const report = this.#cachedReports[month];
			if (report) {
				const planning = cachedPlannings[month] || defaultPlanning;
				report.updatePlanning(planning);
			}
		}

		/** @type {SpendingScreen} */
		this.#screen = new SpendingScreen(this.#defaultYear, this.#defaultMonth, this.#cachedReports);
		this.#screen.init();
		this.#screen.onCreateSpendingCallback = this.onCreatedSpending.bind(this);
		this.#screen.onSaveReportCallback = this.onSavedReport.bind(this);
		this.#screen.onDeleteReportCallback = this.onDeletedReport.bind(this);
		this.#screen.jumpToMonth(this.#defaultMonth);

		const availableYears = await this.#spendingPersistence.cachedYears();
		availableYears.forEach((availableYear) => this.#screen.updateYear(+availableYear));

		const gDriveSettings = new Settings().gDriveSettings();
		if (!gDriveSettings || !gDriveSettings.enabled) return this.#screen;

		Alert.show('Google Drive', 'Started synchronization with Google Drive...');
		const gDrivePlannings = await this.#planningPersistence.readAllFromGDrive();
		const gDriveReports = await this.#spendingPersistence.readAllFromGDrive();

		gDriveReports.filter((item) => item).forEach((gDriveReport) => {
			const month = gDriveReport.month();
			const planning = gDrivePlannings[month] || cachedPlannings[month] || defaultPlanning;
			gDriveReport.updatePlanning(planning);
			this.#cachedReports[month] = gDriveReport;
			this.#screen.refreshMonth(gDriveReport);
		});
		Alert.show('Google Drive', 'Finished synchronization with Google Drive');
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
}
