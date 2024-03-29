import SpendingScreen from '../gui/spendingScreen.js';
import SpendingCache from '../persistence/spending/spendingCache.js';
import PlanningCache from '../persistence/planning/planningCache.js';
import Spending, { SpendingReport } from '../persistence/spending/spendingModel.js';

export default class SpendingController {
	/** @type {Array<SpendingCache>} */
	#spendingCaches = undefined;

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
		this.#spendingCaches = await SpendingCache.getAll();
		this.#planningCaches = await PlanningCache.getAll();
		const year = forYear || new Date().getFullYear();

		for (let i = 0; i < this.#spendingCaches.length; i += 1) {
			if (this.#spendingCaches[i].year === year) {
				this.#spendingCache = this.#spendingCaches[i];
				this.#planningCache = this.#planningCaches
					.find((planningCache) => planningCache.year === year);
			}
		}

		await this.#planningCache?.init();
		await this.#spendingCache?.init();

		const expenseCategories = await this.#planningCache.readExpenseCategories();
		const spendings = await this.#spendingCache.readAll();

		const currentMonth = new Date().getMonth();
		/** @type {Map<number, SpendingReport>} */
		const spendingReports = new Map();
		spendingReports.set(currentMonth, new SpendingReport(currentMonth));

		spendings.forEach((spending) => {
			const spendingMonth = spending.boughtOn.getMonth();
			if (!spendingReports.has(spendingMonth)) {
				spendingReports.set(spendingMonth, new SpendingReport(spendingMonth));
			}
			spendingReports.get(spendingMonth).appendSpending(spending);
		});

		const spendingScreen = new SpendingScreen(
			year,
			spendingReports.get(currentMonth),
			expenseCategories,
		);
		spendingScreen.init();
		spendingScreen.updateSlice(spendingReports.get(currentMonth));
		spendingScreen.onClickCreateCallback = this.onClickCreateSpending.bind(this);
		spendingScreen.onClickDeleteCallback = this.onClickDeleteSpending.bind(this);
		spendingScreen.onClickSaveCallback = this.onClickSaveSpendings.bind(this);
		spendingScreen.onChangeSpendingCallback = this.onChangeSpending.bind(this);

		for (let pastMonth = currentMonth - 1; pastMonth >= 0; pastMonth -= 1) {
			if (spendingReports.has(pastMonth)) {
				spendingScreen.updateSlice(spendingReports.get(pastMonth));
			}
		}

		for (let futureMonth = currentMonth + 1; futureMonth < 12; futureMonth += 1) {
			if (spendingReports.has(futureMonth)) {
				spendingScreen.updateSlice(spendingReports.get(futureMonth));
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

	async getSpendingReport(forYear, forMonth) {
		const spendingCache = this.#spendingCaches.find((cache) => cache.year === forYear);
		const spendings = await spendingCache.readAllForMonth(forMonth);
		const spendingReport = new SpendingReport(forMonth);
		spendings.filter((currentSpending) => !currentSpending.deleted && !currentSpending.edited)
			.forEach((currentSpending) => spendingReport.appendSpending(currentSpending));
		return spendingReport;
	}

	async openSpendingCache(forYear) {
		let spendingCache = this.#spendingCaches.find((spendingCache) => spendingCache.year == forYear);
		if (!spendingCache) {
			spendingCache = new SpendingCache(forYear);
			await spendingCache.init();
			this.#spendingCaches.push(spendingCache);
		}
		return spendingCache;
	}

	/**
	 * @param {Spending} spending
	 */
	async onClickCreateSpending(spending) {
		const year = spending.boughtOn.getFullYear();
		const month = spending.boughtOn.getMonth();

		const spendingCache = await this.openSpendingCache(year);
		await spendingCache.insert(spending);
		const spendingReport = await this.getSpendingReport(year, month);
		this.spendingScreen.updateSlice(spendingReport);

		/* if(gdriveSync) {
			this.syncGDrive(spending.month);
		} */
	}

	/**
	 * Sets deleted flag in cache for a spending
	 * @param {Spending} spending
	 */
	async onClickDeleteSpending(spending) {
		const year = spending.boughtOn.getFullYear();
		const cache = this.openSpendingCache(year);
		const localSpending = await cache.read(spending.id);
		localSpending.deleted = true;
		cache.insert(localSpending);
	}

	/**
	 * Sets edited flag in cache for a spending
	 * @param {Spending} spending
	 */
	async onChangeSpending(spending) {
		const spendingYear = spending.boughtOn.getFullYear();
		const cache = this.openSpendingCache(spendingYear);
		const localSpending = await cache.read(spending.id);
		localSpending.edited = true;
		cache.insert(localSpending);
	}

	/**
	 * Handler
	 * @param {Array<Spending} spendings Spendings to be persisted
	 */
	async onClickSaveSpendings(spendings) {
		spendings
			.filter((spending) => spending.deleted)
			.forEach((spending) => this.#spendingCache.delete(spending));

		spendings
			.filter((spending) => spending.edited)
			.forEach((spending) => {
				const spendingCopy = { ...spending };
				delete spendingCopy.edited;
				this.#spendingCache.insert(spendingCopy);
			});

		const month = spendings ? spendings[0].boughtOn.getMonth() : undefined;
		const year = spendings ? spendings[0].boughtOn.getFullYear() : undefined;
		const spendingReport = await this.getSpendingReport(year, month);

		if (month !== undefined && year !== undefined) {
			this.spendingScreen.updateSlice(spendingReport);
		}

		/* if(gdriveSync) {
			await this.syncGDrive(month);
		} */
	}

	async refreshTab(month) {
		const spendings = await this.#spendingCache.readAll(this.currentYear, month);
		if (this.#tabs.get(month)) {
			this.#tabs.get(month).refresh(spendings);
		} else {
			// TODO this might trigger a reload before gdrive updated
			window.location.reload();
		}
	}
}
