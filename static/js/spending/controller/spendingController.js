import SpendingScreen from '../view/spendingScreen.js';
import SpendingCache from '../persistence/spendingCache.js';
import SpendingGDrive from '../persistence/spendingGdrive.js';
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
		for (let index = 0; index < spendingReports.length; index += 1) {
			const spendingReport = this.#spendingReports[index];
			const planning = cachedPlannings[index];
			if (spendingReport && planning) {
				spendingReport.updatePlanning(planning);
			}
		}

		/** @type {SpendingScreen} */
		this.#screen = new SpendingScreen(this.#defaultYear, this.#defaultMonth,	spendingReports);
		this.#screen.init();
		this.#screen.onCreateSpendingCallback = this.onCreateSpending.bind(this);
		this.#screen.onSaveReportCallback = this.onSaveReport.bind(this);
		this.#screen.onDeleteReportCallback = this.onDeleteReport.bind(this);

		this.#screen.jumpToMonth(this.#defaultMonth);

		const availableCaches = await SpendingCache.readYears();
		availableCaches.forEach((spendingCache) => {
			this.#screen.updateYear(spendingCache.year);
		});

		const gDriveSettings = new Settings().gDriveSettings();
		if (!gDriveSettings || !gDriveSettings.enabled) return;

		Alert.show('Google Drive', 'Started synchronization with Google Drive...');
		const gDrivePlannings = await this.#planningPersistence.readAllFromGDrive();
		const gDriveReports = await this.#spendingPersistence.readAllFromGDrive();

		for (let month = 0; month < 12; month += 1) {
			let report = gDriveReports[month];
			let planning = gDrivePlannings[month];

			// TODO rework below logic
			if (planning || report) {
				if (!planning) {
					planning = cachedPlannings[month];
				}
				if (!report) {
					report = this.#spendingReports[month];
				}
				report.updatePlanning(planning);
				this.#screen.refreshMonth(report);
			}
		}

		Alert.show('Google Drive', 'Finished synchronization with Google Drive');
	}

	async fetchAllfromGDrive(gDrive) {
		const promises = [];
		for (let month = 0; month < 12; month += 1) {
			promises.push(this.fetchFromGDrive(gDrive, month));
		}
		await Promise.all(promises);
		Alert.show('Google Drive', 'Finished synchronization with Google Drive');
	}

	/**
	 * @param {Promise<Spending>} spending
	 */
	async onCreateSpending(spending) {
		const spendingReport = this.#spendingReports.find((spendingReport) => 
			spendingReport.year === spending.spentOn.getFullYear() &&
			spendingReport.month === spending.spentOn.getMonth());
		
		if(spendingReport) {
			spendingReport.appendSpending(spending);
			this.#screen.refreshMonth(spendingReport);
		}

		return this.#spendingPersistence.store(spending);
	}

	/**
	 * Sets deleted flag in cache for all spendings in a month
	 * @param {SpendingReport} spendingReport
	 */
	async onDeleteReport(spendingReport) {
		// We can only select delete for current year, so send only month
		this.#spendingPersistence.deleteAll(spendingReport);
	}

	/**
	 * Handler
	 * @param {Promise<Array<Spending>>} spendings Spendings to be persisted
	 */
	async onSaveReport(spendings) {
		spendings
			.filter((spending) => spending.edited)
			.forEach((spending) => {
				const spendingCopy = { ...spending };
				delete spendingCopy.edited;
				this.#spendingCache.store(spendingCopy);
			});

		spendings
			.filter((spending) => spending.deleted)
			.forEach((spending) => this.#spendingCache.delete(spending));

		const month = spendings ? spendings[0].spentOn.getMonth() : undefined;
		const year = spendings ? spendings[0].spentOn.getFullYear() : undefined;
		const spendingReport = await this.buildSpendingReport(year, month);

		if (month !== undefined && year !== undefined) {
			this.#screen.refreshMonth(spendingReport);
		}

		if (this.#spendingGdrive) {
			await this.fetchFromGDrive(this.#spendingGdrive, month);
			const gDriveSpendings = await this.#spendingCache.readAllForMonth(month);
			return this.#spendingGdrive.storeSpendings(gDriveSpendings, month);
		}
		return spendingReport.spendings();
	}
}
