import SpendingScreen from '../view/spendingScreen.js';
import Spending from '../model/spending.js';
import SpendingReport from '../model/spendingReport.js';
import Utils from '../../common/utils/utils.js';
import Settings from '../../settings/settings.js';
import Alert from '../../common/gui/alert.js';
import PlanningPersistence from '../../planning/persistence/planningPersistence.js';
import SpendingPersistence from '../persistence/spendingPersistence.js';
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

	/** @type { Array<SpendingReport> } */
	#spendingReports = undefined;

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
		this.#spendingReports = await this.#spendingPersistence.readAllFromCache();
		const cachedPlannings = await this.#planningPersistence.readAllFromCache();
		if (this.#spendingReports.length === 0) {
			this.#spendingReports[this.#defaultMonth] = new SpendingReport(
				this.#defaultYear,
				this.#defaultMonth,
			);
		}

		const updatedReports = [];
		for (let month = 0; month < this.#spendingReports.length; month += 1) {
			const report = this.#spendingReports[month];
			if (report) {
				updatedReports[month] = this.#updateReportPlanning(report, cachedPlannings[month]);
			}
		}
		await Promise.all(updatedReports);

		/** @type {SpendingScreen} */
		this.#screen = new SpendingScreen(this.#defaultYear, this.#defaultMonth, this.#spendingReports);
		this.#screen.init();
		this.#screen.onCreateSpendingCallback = this.onCreatedSpending.bind(this);
		this.#screen.onSaveReportCallback = this.onSavedReport.bind(this);
		this.#screen.onDeleteReportCallback = this.onDeletedReport.bind(this);
		this.#screen.jumpToMonth(this.#defaultMonth);

		const availableCaches = await this.#spendingPersistence.cachedYears();
		availableCaches.forEach((spendingCache) => {
			this.#screen.updateYear(spendingCache.year);
		});

		const gDriveSettings = new Settings().gDriveSettings();
		if (!gDriveSettings || !gDriveSettings.enabled) return;

		Alert.show('Google Drive', 'Started synchronization with Google Drive...');
		const gDrivePlannings = await this.#planningPersistence.readAllFromGDrive();
		const gDriveReports = await this.#spendingPersistence.readAllFromGDrive();

		const updatedGdriveReports = [];
		for (let month = 0; month < 12; month += 1) {
			let report = gDriveReports[month];
			let planning = gDrivePlannings[month];

			if (!planning && report) {
				planning = cachedPlannings[month];
			}
			if (!report && planning) {
				report = this.#spendingReports[month];
			}
			updatedGdriveReports[month] = this.#updateReportPlanning(report, planning);
		}

		(await Promise.all(updatedGdriveReports)).forEach((report) => {
			if (report) this.#screen.refreshMonth(report);
		});
		Alert.show('Google Drive', 'Finished synchronization with Google Drive');
	}

	async #updateReportPlanning(spendingReport, planning) {
		if (spendingReport) {
			let reportPlanning = planning;
			if (!planning) {
				// reportPlanning = await this.#planningPersistence.readDefaultPlanningFromServer();
				// this.#planningPersistence.store(reportPlanning);
				reportPlanning = new Planning(new Date().getTime(), this.#defaultYear, this.#defaultMonth);
			}
			spendingReport.updatePlanning(reportPlanning);
		}
		return spendingReport;
	}

	/**
	 * @param {Promise<Spending>} spending
	 */
	async onCreatedSpending(spending) {
		const report = this.#spendingReports.find(
			(spendingReport) =>	spendingReport.year === spending.spentOn.getFullYear()
				&& spendingReport.month === spending.spentOn.getMonth(),
		);

		if (report) {
			report.appendSpending(spending);
			this.#screen.refreshMonth(report);
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
		this.#spendingPersistence.updateAll(spendingReport);
	}
}
