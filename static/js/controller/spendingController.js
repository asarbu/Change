import SpendingScreen from '../gui/spendingScreen.js';
import SpendingCache from '../persistence/spending/spendingCache.js';
import PlanningCache from '../persistence/planning/planningCache.js';
import Spending, { SpendingReport } from '../persistence/spending/spendingModel.js';

export default class SpendingController {
	#MONTH_NAMES = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];

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
		spendingScreen.updateSpendingReport(spendingReports.get(currentMonth));
		spendingScreen.onClickCreateCallback = this.onClickCreateSpending.bind(this);
		spendingScreen.onClickDeleteCallback = this.onClickDeleteSpending.bind(this);
		spendingScreen.onClickSaveCallback = this.onClickSaveSpendings.bind(this);

		let pastMonth = currentMonth - 1;
		while (pastMonth >= 0 && spendingReports.has(pastMonth)) {
			spendingScreen.updateSpendingReport(spendingReports.get(pastMonth));
			pastMonth -= 1;
		}

		let futureMonth = currentMonth + 1;
		while (futureMonth < 12 && spendingReports.has(futureMonth)) {
			spendingScreen.updateSpendingReport(spendingReports.get(futureMonth));
			futureMonth += 1;
		}

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
			console.log('Found newer information on GDrive. Updating local cache', gdriveLastUpdatedTime, cacheLastUpdatedTime);
			await this.spendingGDrive.fetchGDriveToCache(this.currentYear, monthName);
			this.#spendingCache.setLastUpdatedTime(this.currentYear, monthName, gdriveLastUpdatedTime);
			if (this.#tabs.has(monthName)) {
				this.refreshTab(monthName);
				// M.toast({ html: 'Updated from GDrive', classes: 'rounded' });
			}
		} else if (cacheLastUpdatedTime > gdriveLastUpdatedTime) {
			console.log('Found newer information on local cache. Updating GDrive', cacheLastUpdatedTime, gdriveLastUpdatedTime);
			const spendings = await this.#spendingCache.readAll(this.currentYear, monthName);
			this.spendingGDrive.fetchCacheToGDrive(this.currentYear, monthName, spendings);
		}
	}

	async onClickCreateSpending(spending) {
		await this.#spendingCache.insert(spending);

		/* if(gdriveSync) {
			this.syncGDrive(spending.month);
		} */
	}

	async onClickDeleteSpending(key) {
		const localSpending = await this.#spendingCache.read(key);
		localSpending.isDeleted = 1;
		this.#spendingCache.insert(undefined, key, localSpending);
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
			.filter((spending) => spending.edited || spending.created)
			.forEach((spending) => this.#spendingCache.insert(spending));

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
