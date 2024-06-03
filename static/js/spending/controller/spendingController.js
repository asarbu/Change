import SpendingScreen from '../view/spendingScreen.js';
import SpendingCache from '../persistence/spendingCache.js';
import SpendingGDrive from '../persistence/spendingGdrive.js';
import PlanningCache from '../../planning/persistence/planningCache.js';
import Spending from '../model/spending.js';
import SpendingReport from '../model/spendingReport.js';
import Utils from '../../common/utils/utils.js';
import { Statement } from '../../planning/model/planningModel.js';
import Settings from '../../settings/settings.js';
import Alert from '../../common/gui/alert.js';

export default class SpendingController {
	/** @type {SpendingCache} */
	#spendingCache = undefined;

	/** @type {PlanningCache} */
	#planningCache = undefined;

	/** @type {number} */
	#defaultYear = undefined;

	/** @type {number} */
	#defaultMonth = undefined;

	/** @type {SpendingScreen} */
	#defaultScreen = undefined;

	/** @type { SpendingGDrive } */
	#spendingGdrive = undefined;

	/** @type {Settings} */
	constructor() {
		const now = new Date();
		const queryString = window.location.search;
		const urlParams = new URLSearchParams(queryString);
		const year = +(urlParams.get('year'));
		const month = Utils.monthForName((urlParams.get('month')));
		this.#defaultYear = year || now.getFullYear();
		this.#defaultMonth = month || now.getMonth();
	}

	async init() {
		this.#planningCache = await PlanningCache.get(this.#defaultYear);
		this.#spendingCache = await SpendingCache.get(this.#defaultYear);

		const planning = await this.#planningCache.readForMonth(this.#defaultMonth);
		const expenseCategories = planning.readCategories(Statement.EXPENSE);
		const spendings = await this.#spendingCache.readAll();

		/** @type {Map<number, SpendingReport>} */
		const spendingReports = new Map();
		spendingReports.set(
			this.#defaultMonth,
			new SpendingReport(this.#defaultYear, this.#defaultMonth, planning.readGoals()),
		);

		for (let index = 0; index < spendings.length; index += 1) {
			const spending = spendings[index];
			const spendingMonth = spending.spentOn.getMonth();
			if (!spendingReports.has(spendingMonth)) {
				const planningInstance = await this.#planningCache.readForMonth(spendingMonth);
				spendingReports.set(
					spendingMonth,
					new SpendingReport(this.#defaultYear, spendingMonth, planningInstance.readGoals()),
				);
			}
			spendingReports.get(spendingMonth).appendSpending(spending);
		}

		/** @type {SpendingScreen} */
		this.#defaultScreen = new SpendingScreen(
			this.#defaultYear,
			spendingReports.get(this.#defaultMonth),
			expenseCategories,
		);
		this.#defaultScreen.init();
		this.#defaultScreen.onCreateSpendingCallback = this.onCreateSpending.bind(this);
		this.#defaultScreen.onSaveReportCallback = this.onSaveReport.bind(this);
		this.#defaultScreen.onDeleteReportCallback = SpendingController.onDeleteReport;

		const availableCaches = await SpendingCache.getAllCacheNames();
		availableCaches.forEach((spendingCache) => {
			this.#defaultScreen.updateYear(spendingCache.year);
		});

		for (let month = 0; month < 12; month += 1) {
			if (spendingReports.has(month)) {
				this.#defaultScreen.refreshMonth(spendingReports.get(month));
			}
		}

		this.#defaultScreen.jumpToMonth(this.#defaultMonth);

		const gDriveSettings = new Settings().gDriveSettings();
		if (!gDriveSettings || !gDriveSettings.enabled) return;

		Alert.show('Google Drive', 'Started synchronization with Google Drive...');
		this.#spendingGdrive = await SpendingGDrive.get(
			this.#defaultYear,
			gDriveSettings.rememberLogin,
		);
		this.fetchAllfromGDrive(this.#spendingGdrive);
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
	 * Fetch spending data from cache and build spending report from it
	 * @param {number} forMonth
	 * @returns {Promise<SpendingReport>}
	 */
	async buildSpendingReport(forMonth) {
		const spendings = await this.#spendingCache.readAllForMonth(forMonth);
		const planningCategories = (await this.#planningCache.readForMonth(forMonth)).readGoals();
		const spendingReport = new SpendingReport(this.#defaultYear, forMonth, planningCategories);
		spendings.filter((currentSpending) => !currentSpending.deleted && !currentSpending.edited)
			.forEach((currentSpending) => spendingReport.appendSpending(currentSpending));
		return spendingReport;
	}

	/**
	 * @param {Spending} spending
	 */
	async onCreateSpending(spending) {
		const year = spending.spentOn.getFullYear();
		const month = spending.spentOn.getMonth();

		if (year !== this.#spendingCache.year) {
			const cache = await SpendingCache.get(spending.spentOn.getFullYear());
			await cache.store(spending);

			if (this.#spendingGdrive) {
				// TODO fetch info from GDrive first
				return this.#spendingGdrive.storeSpending(spending);
			}
			return spending;
		}
		await this.#spendingCache.store(spending);
		const spendingReport = await this.buildSpendingReport(month);
		this.#defaultScreen.refreshMonth(spendingReport);

		if (this.#spendingGdrive) {
			await this.fetchFromGDrive(this.#spendingGdrive, month);
			const spendings = await this.#spendingCache.readAllForMonth(month);
			return this.#spendingGdrive.storeSpendings(spendings, month);
		}
		return spending;
	}

	/**
	 * Sets deleted flag in cache for all spendings in a month
	 * @param {SpendingReport} spendingReport
	 */
	static async onDeleteReport(spendingReport) {
		const year = spendingReport.year();
		const cache = await SpendingCache.get(year);
		const spendings = spendingReport.spendings();

		spendings.forEach(async (spending) => {
			const localSpending = await cache.read(spending.id);
			localSpending.deleted = true;
			cache.store(localSpending);
		});
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
			this.#defaultScreen.refreshMonth(spendingReport);
		}

		if (this.#spendingGdrive) {
			await this.fetchFromGDrive(this.#spendingGdrive, month);
			const gDriveSpendings = await this.#spendingCache.readAllForMonth(month);
			return this.#spendingGdrive.storeSpendings(gDriveSpendings, month);
		}
		return spendingReport.spendings();
	}

	/**
	 * @param {SpendingGDrive} gdrive
	 * @param {number} forMonth
	 */
	async fetchFromGDrive(gdrive, forMonth) {
		let month;
		if (forMonth === undefined) {
			month = new Date().getMonth();
		} else {
			month = forMonth;
		}

		const fileChanged = await gdrive.fileChanged(month);
		if (fileChanged) {
			const gDriveSpendings = await gdrive.readAll(month);
			if (gDriveSpendings) {
				const cachedSpendings = await this.#spendingCache.readAllForMonth(month);
				// Only filter for deleted spendings.
				// The added and modified ones will be handled by storeAll
				const deletedGDriveSpendings = cachedSpendings.filter(
					(cachedSpending) => cachedSpending.id < fileChanged.oldModified
					&& !gDriveSpendings.find((gDriveSpending) => cachedSpending.id === gDriveSpending.id),
				);

				if (deletedGDriveSpendings && deletedGDriveSpendings.length > 0) {
					await this.#spendingCache.deleteAll(deletedGDriveSpendings);
				}
				await this.#spendingCache.storeAll(gDriveSpendings);
				const monthlyReport = await this.buildSpendingReport(month);
				this.#defaultScreen.refreshMonth(monthlyReport);
			}
		}
	}
}
