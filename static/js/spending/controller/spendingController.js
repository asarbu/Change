import SpendingScreen from '../view/spendingScreen.js';
import SpendingCache from '../persistence/spendingCache.js';
import SpendingGDrive from '../persistence/spendingGdrive.js';
import PlanningCache from '../../planning/persistence/planningCache.js';
import Spending from '../model/spending.js';
import SpendingReport from '../model/spendingReport.js';
import Utils from '../../utils/utils.js';

export default class SpendingController {
	/** @type {Array<SpendingCache>} */
	#spendingCaches = [];

	/** @type {SpendingCache} */
	#spendingCache = undefined;

	/**
	 * Default year to select in screens
	 * @type {number}
	 */
	#defaultYear = undefined;

	/**
	 * Default month to select in screens
	 * @type {number}
	 */
	#defaultMonth = undefined;

	constructor() {
		const now = new Date();
		const queryString = window.location.search;
		const urlParams = new URLSearchParams(queryString);
		const year = +(urlParams.get('year'));
		const month = Utils.monthForName((urlParams.get('month')));
		this.#defaultYear = year || now.getFullYear();
		this.#defaultMonth = month || now.getMonth();
		this.gdriveSync = true;

		/*
		if (gdriveSync) {
			// this.spendingGDrive = new SpendingGDrive(this.#spendingCache);
			// this.planningGDrive = new PlanningGDrive(this.#planningCache);
		} */
	}

	async init() {
		const planningCache = await PlanningCache.get(this.#defaultYear);
		this.#spendingCache = await SpendingCache.get(this.#defaultYear);
		this.#spendingCaches = await SpendingCache.getAll();

		const expenseCategories = [];
		const spendings = await this.#spendingCache.readAll();

		/** @type {Map<number, SpendingReport>} */
		const spendingReports = new Map();
		spendingReports.set(
			this.#defaultMonth,
			new SpendingReport(this.#defaultYear, this.#defaultMonth),
		);

		spendings.forEach((spending) => {
			const spendingMonth = spending.boughtOn.getMonth();
			if (!spendingReports.has(spendingMonth)) {
				spendingReports.set(spendingMonth, new SpendingReport(this.#defaultYear, spendingMonth));
			}
			spendingReports.get(spendingMonth).appendSpending(spending);
		});

		/** @type {SpendingScreen} */
		const spendingScreen = new SpendingScreen(
			this.#defaultYear,
			spendingReports.get(this.#defaultMonth),
			expenseCategories,
		);
		spendingScreen.init();
		spendingScreen.updateMonth(spendingReports.get(this.#defaultMonth));
		spendingScreen.onCreateSpendingCallback = this.onCreateSpending.bind(this);
		spendingScreen.onSaveReportCallback = this.onSaveReport.bind(this);
		spendingScreen.onDeleteReportCallback = this.onDeleteReport.bind(this);

		this.#spendingCaches.forEach((spendingCache) => {
			spendingScreen.updateYear(spendingCache.year);
		});

		for (let pastMonth = this.#defaultMonth - 1; pastMonth >= 0; pastMonth -= 1) {
			if (spendingReports.has(pastMonth)) {
				spendingScreen.updateMonth(spendingReports.get(pastMonth));
			}
		}

		for (let futureMonth = this.#defaultMonth + 1; futureMonth < 12; futureMonth += 1) {
			if (spendingReports.has(futureMonth)) {
				spendingScreen.updateMonth(spendingReports.get(futureMonth));
			}
		}

		this.spendingScreen = spendingScreen;

		/**
		const spendingGdrive = SpendingGDrive.get(this.#defaultYear, true);
		(await spendingGdrive).init();
		(await spendingGdrive).getAll();
		*/

		const children = await SpendingGDrive.getAll();
		console.log(children);

		/* if(gdriveSync) {
			this.initGDrive(monthName);
		} */
	}

	async initGDrive(monthName) {
		await this.planningGDrive.init();
		await this.spendingGDrive.init();

		await this.syncGDrive(monthName);
	}

	async syncGDrive(monthName) {
		const cacheLastUpdatedTime = this.#spendingCache.getLastUpdatedTime(
			this.currentYear,
			monthName,
		);
		const gdriveLastUpdatedTime = await this.spendingGDrive.getLastUpdatedTime(
			this.currentYear,
			monthName,
		);

		if (cacheLastUpdatedTime < gdriveLastUpdatedTime) {
			// console.log('Found newer information on GDrive. Updating local cache');
			await this.spendingGDrive.fetchGDriveToCache(this.currentYear, monthName);
			this.#spendingCache.setLastUpdatedTime(this.currentYear, monthName, gdriveLastUpdatedTime);
			/* if (this.#tabs.has(monthName)) {
				this.refreshTab(monthName);
				// M.toast({ html: 'Updated from GDrive', classes: 'rounded' });
			} */
		} else if (cacheLastUpdatedTime > gdriveLastUpdatedTime) {
			// console.log('Found newer information on local cache. Updating GDrive');
			const spendings = await this.#spendingCache.readAll(this.currentYear, monthName);
			this.spendingGDrive.fetchCacheToGDrive(this.currentYear, monthName, spendings);
		}
	}

	/**
	 * Fetch spending data from cache and build spending report from it
	 * @param {number} forYear
	 * @param {number} forMonth
	 * @returns {SpendingReport}
	 */
	async buildSpendingReport(forYear, forMonth) {
		const spendingCache = this.#spendingCaches.find((cache) => cache.year === forYear);
		const spendings = await spendingCache.readAllForMonth(forMonth);
		const spendingReport = new SpendingReport(forYear, forMonth);
		spendings.filter((currentSpending) => !currentSpending.deleted && !currentSpending.edited)
			.forEach((currentSpending) => spendingReport.appendSpending(currentSpending));
		return spendingReport;
	}

	/**
	 * Opens a SpendingCache instance for the specified year
	 * @param {number} forYear
	 * @returns {SpendingCache}
	 */
	async openSpendingCache(forYear) {
		let spendingCache = this.#spendingCaches.find((cache) => cache.year === forYear);
		if (!spendingCache) {
			spendingCache = await SpendingCache.get(forYear);
			this.#spendingCaches.push(spendingCache);
		}
		return spendingCache;
	}

	/**
	 * @param {Spending} spending
	 */
	async onCreateSpending(spending) {
		const year = spending.boughtOn.getFullYear();
		const month = spending.boughtOn.getMonth();

		const spendingCache = await this.openSpendingCache(year);
		await spendingCache.insert(spending);
		const spendingReport = await this.buildSpendingReport(year, month);
		this.spendingScreen.updateMonth(spendingReport);

		/* if(gdriveSync) {
			this.syncGDrive(spending.month);
		} */
	}

	/**
	 * Sets deleted flag in cache for all spendings in a month
	 * @param {SpendingReport} spendingReport
	 */
	async onDeleteReport(spendingReport) {
		const year = spendingReport.year();
		const cache = await this.openSpendingCache(year);
		const spendings = spendingReport.spendings();

		spendings.forEach(async (spending) => {
			const localSpending = await cache.read(spending.id);
			localSpending.deleted = true;
			cache.insert(localSpending);
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
				this.#spendingCache.insert(spendingCopy);
			});

		spendings
			.filter((spending) => spending.deleted)
			.forEach((spending) => this.#spendingCache.delete(spending));

		const month = spendings ? spendings[0].boughtOn.getMonth() : undefined;
		const year = spendings ? spendings[0].boughtOn.getFullYear() : undefined;
		const spendingReport = await this.buildSpendingReport(year, month);

		if (month !== undefined && year !== undefined) {
			this.spendingScreen.updateMonth(spendingReport);
		}

		/* if(gdriveSync) {
			await this.syncGDrive(month);
		} */
	}
}
