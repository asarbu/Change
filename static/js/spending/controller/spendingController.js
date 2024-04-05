import SpendingScreen from '../view/spendingScreen.js';
import SpendingCache from '../persistence/spendingCache.js';
import PlanningCache from '../../planning/persistence/planningCache.js';
import Spending from '../model/spending.js';
import SpendingReport from '../model/spendingReport.js';

export default class SpendingController {
	/** @type {Array<SpendingCache>} */
	#spendingCaches = [];

	/** @type {SpendingCache} */
	#spendingCache = undefined;

	/**
	 * Used to quickly access already created tabs
	 * @type {Map<string, SpendingScreen>}
	 */
	#tabs = undefined;

	/**
	 * Used to quickly access already created tabs
	 * @type {Array<PlanningCache>}
	 */
	#planningCaches = undefined;

	/**
	 * Used to quickly access already created tabs
	 * @type {PlanningCache}
	 */
	#planningCache = undefined;

	/**
	 * Construct controller that will handle requests between GUI and Backend
	 * @param {number} forYear Year for which to initialize the controller
	 */
	constructor(forYear) {
		this.year = forYear;
		/* if (gdriveSync) {
			// this.spendingGDrive = new SpendingGDrive(this.#spendingCache);
			// this.planningGDrive = new PlanningGDrive(this.#planningCache);
		} */
	}

	async init(forYear) {
		/* this.#spendingCaches = await SpendingCache.getAll();
		this.#planningCaches = await PlanningCache.getAll();
		const year = forYear || new Date().getFullYear();

		for (let i = 0; i < this.#spendingCaches.length; i += 1) {
			if (this.#spendingCaches[i].year === year) {
				this.#spendingCache = this.#spendingCaches[i];
				this.#planningCache = this.#planningCaches
					.find((planningCache) => planningCache.year === year);
			}
		}

		await this.#planningCache?.init(); */

		const year = forYear || new Date().getFullYear();
		this.#planningCache = await PlanningCache.get(year);
		this.#spendingCache = await SpendingCache.get(year);

		const expenseCategories = await this.#planningCache.readExpenseCategories();
		const spendings = await this.#spendingCache.readAll();

		const currentMonth = new Date().getMonth();
		/** @type {Map<number, SpendingReport>} */
		const spendingReports = new Map();
		spendingReports.set(currentMonth, new SpendingReport(year, currentMonth));

		spendings.forEach((spending) => {
			const spendingMonth = spending.boughtOn.getMonth();
			if (!spendingReports.has(spendingMonth)) {
				spendingReports.set(spendingMonth, new SpendingReport(year, spendingMonth));
			}
			spendingReports.get(spendingMonth).appendSpending(spending);
		});

		/** @type {SpendingScreen} */
		const spendingScreen = new SpendingScreen(
			year,
			spendingReports.get(currentMonth),
			expenseCategories,
		);
		spendingScreen.init();
		spendingScreen.updateMonth(spendingReports.get(currentMonth));
		spendingScreen.onCreateSpendingCallback = this.onCreateSpending.bind(this);
		spendingScreen.onSaveReportCallback = this.onSaveReport.bind(this);
		spendingScreen.onDeleteReportCallback = this.onDeleteReport.bind(this);

		this.#spendingCaches.forEach((spendingCache) => {
			spendingScreen.updateYear(spendingCache.year);
		});

		for (let pastMonth = currentMonth - 1; pastMonth >= 0; pastMonth -= 1) {
			if (spendingReports.has(pastMonth)) {
				spendingScreen.updateMonth(spendingReports.get(pastMonth));
			}
		}

		for (let futureMonth = currentMonth + 1; futureMonth < 12; futureMonth += 1) {
			if (spendingReports.has(futureMonth)) {
				spendingScreen.updateMonth(spendingReports.get(futureMonth));
			}
		}

		this.spendingScreen = spendingScreen;

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
			if (this.#tabs.has(monthName)) {
				this.refreshTab(monthName);
				// M.toast({ html: 'Updated from GDrive', classes: 'rounded' });
			}
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
