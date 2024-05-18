import SpendingScreen from '../view/spendingScreen.js';
import SpendingCache from '../persistence/spendingCache.js';
import SpendingGDrive from '../persistence/spendingGdrive.js';
import PlanningCache from '../../planning/persistence/planningCache.js';
import Spending from '../model/spending.js';
import SpendingReport from '../model/spendingReport.js';
import Utils from '../../utils/utils.js';
import { Statement } from '../../planning/model/planningModel.js';

export default class SpendingController {
	/** @type {SpendingCache} */
	#cache = undefined;

	/** @type {number} */
	#defaultYear = undefined;

	/** @type {number} */
	#defaultMonth = undefined;

	/** @type {SpendingScreen} */
	#defaultScreen = undefined;

	/** @type {boolean} */
	#gDriveEnabled = false;

	/** @type { SpendingGDrive } */
	#spendingGdrive = undefined;

	constructor(gDriveEnabled) {
		const now = new Date();
		const queryString = window.location.search;
		const urlParams = new URLSearchParams(queryString);
		const year = +(urlParams.get('year'));
		const month = Utils.monthForName((urlParams.get('month')));
		this.#defaultYear = year || now.getFullYear();
		this.#defaultMonth = month || now.getMonth();
		this.#gDriveEnabled = gDriveEnabled;
	}

	async init() {
		const planningCache = await PlanningCache.get(this.#defaultYear);
		this.#cache = await SpendingCache.get(this.#defaultYear);

		const planning = await planningCache.readForMonth(this.#defaultMonth);
		const expenseCategories = await planning.readCategories(Statement.EXPENSE);
		const spendings = await this.#cache.readAll();

		/** @type {Map<number, SpendingReport>} */
		const spendingReports = new Map();
		spendingReports.set(
			this.#defaultMonth,
			new SpendingReport(this.#defaultYear, this.#defaultMonth),
		);

		spendings.forEach((spending) => {
			const spendingMonth = spending.spentOn.getMonth();
			if (!spendingReports.has(spendingMonth)) {
				spendingReports.set(spendingMonth, new SpendingReport(this.#defaultYear, spendingMonth));
			}
			spendingReports.get(spendingMonth).appendSpending(spending);
		});

		/** @type {SpendingScreen} */
		this.#defaultScreen = new SpendingScreen(
			this.#defaultYear,
			spendingReports.get(this.#defaultMonth),
			expenseCategories,
		);
		this.#defaultScreen.init();
		this.#defaultScreen.onCreateSpendingCallback = this.onCreateSpending.bind(this);
		this.#defaultScreen.onSaveReportCallback = this.onSaveReport.bind(this);
		this.#defaultScreen.onDeleteReportCallback = this.onDeleteReport.bind(this);

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

		if (this.#gDriveEnabled) {
			this.fetchAllfromGDrive(this.#defaultYear);
		}
	}

	async fetchAllfromGDrive(forYear) {
		this.#spendingGdrive = await SpendingGDrive.get(forYear);
		for (let month = 0; month < 12; month += 1) {
			this.fetchFromGDrive(month);
		}
	}

	/**
	 * Fetch spending data from cache and build spending report from it
	 * @param {number} forMonth
	 * @returns {Promise<SpendingReport>}
	 */
	async buildSpendingReport(forMonth) {
		const spendings = await this.#cache.readAllForMonth(forMonth);
		const spendingReport = new SpendingReport(this.#defaultYear, forMonth);
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

		if (year !== this.#cache.year) {
			const cache = await SpendingCache.get(spending.spentOn.getFullYear());
			await cache.store(spending);

			if (this.#gDriveEnabled) {
				// TODO fetch info from GDrive first
				return this.#spendingGdrive.storeSpending(spending);
			}
			return spending;
		}
		await this.#cache.store(spending);
		const spendingReport = await this.buildSpendingReport(month);
		this.#defaultScreen.refreshMonth(spendingReport);

		if (this.#gDriveEnabled) {
			await this.fetchFromGDrive(month);
			const spendings = await this.#cache.readAllForMonth(month);
			return this.#spendingGdrive.storeSpendings(spendings, month);
		}
		return spending;
	}

	/**
	 * Sets deleted flag in cache for all spendings in a month
	 * @param {SpendingReport} spendingReport
	 */
	async onDeleteReport(spendingReport) {
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
	 * @param {Array<Spending} spendings Spendings to be persisted
	 */
	async onSaveReport(spendings) {
		spendings
			.filter((spending) => spending.edited)
			.forEach((spending) => {
				const spendingCopy = { ...spending };
				delete spendingCopy.edited;
				this.#cache.store(spendingCopy);
			});

		spendings
			.filter((spending) => spending.deleted)
			.forEach((spending) => this.#cache.delete(spending));

		const month = spendings ? spendings[0].spentOn.getMonth() : undefined;
		const year = spendings ? spendings[0].spentOn.getFullYear() : undefined;
		const spendingReport = await this.buildSpendingReport(year, month);

		if (month !== undefined && year !== undefined) {
			this.#defaultScreen.refreshMonth(spendingReport);
		}

		if (this.#gDriveEnabled) {
			await this.fetchFromGDrive(month);
			const gDriveSpendings = await this.#cache.readAllForMonth(month);
			return this.#spendingGdrive.storeSpendings(gDriveSpendings, month);
		}
	}

	async fetchFromGDrive(forMonth) {
		let month;
		if (forMonth === undefined) {
			month = new Date().getMonth();
		} else {
			month = forMonth;
		}

		if (await this.#spendingGdrive.fileChanged(month)) {
			const gDriveSpendings = await this.#spendingGdrive.readAll(month);
			if (gDriveSpendings) {
				await this.#cache.storeAll(gDriveSpendings);
				const monthlyReport = await this.buildSpendingReport(month);
				this.#defaultScreen.refreshMonth(monthlyReport);
			}
		}
	}
}
