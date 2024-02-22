import SpendingScreen from '../gui/spendingScreen.js';
import SpendingCache from '../persistence/spending/spendingCache.js';
import PlanningCache from '../persistence/planning/planningCache.js';

async function initSpending() {
	if (!window.indexedDB) {
		return;
	}

	const spending = new SpendingController();
	// await spending.init();
}

export default class SpendingController {
	#MONTH_NAMES = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];

	/** @type {SpendingCache} */
	#spendingCache = undefined;

	/**
	 * Used to quickly access already created tabs
	 * @type {Map<string, SpendingScreen>}
	 */
	#tabs = undefined;

	/**
	 * Used to quickly access already created tabs
	 * @type {PlanningCache}
	 */
	#planningCache = undefined;

	constructor() {
		const currentYear = new Date().getFullYear();
		this.#spendingCache = new SpendingCache(currentYear);
		this.#planningCache = new PlanningCache('2024');

		/* if (gdriveSync) {
			// this.spendingGDrive = new SpendingGDrive(this.#spendingCache);
			// this.planningGDrive = new PlanningGDrive(this.#planningCache);
		} */

		this.#tabs = new Map();

		const now = new Date();
		this.currentYear = now.getFullYear();
		this.currentMonth = now.getMonth();
	}

	async init() {
		// console.log("Init spending");
		await this.#spendingCache.init();
		await this.#planningCache.init();

		const expenseCategories = await this.#planningCache.readExpenses();

		let monthIndex = this.currentMonth;
		let monthCount = 0;

		while (monthIndex >= 0 && monthCount < 4) {
			const monthName = this.#MONTH_NAMES[monthIndex];
			const spendings = await this.#spendingCache.readAll(monthName);

			if (spendings.length > 0 || monthIndex === this.currentMonth) {
				const spendingScreen = new SpendingScreen(monthName, spendings, expenseCategories);
				spendingScreen.init();
				spendingScreen.onClickCreateSpending = this.onClickCreateSpending.bind(this);
				spendingScreen.onClickDeleteSpending = this.onClickDeleteSpending.bind(this);
				spendingScreen.onClickSaveSpendings = this.onClickSaveSpendings.bind(this);
				this.#tabs.set(monthName, spendingScreen);
				monthCount += 1;
			}

			/* if(gdriveSync) {
				this.initGDrive(monthName);
			} */

			monthIndex -= 1;
		}
	}

	async initGDrive(monthName) {
		await this.planningGDrive.init();
		await this.spendingGDrive.init();

		await this.syncGDrive(monthName);
	}

	async syncGDrive(monthName) {
		const cacheLastUpdatedTime = this.#spendingCache.getLastUpdatedTime(this.currentYear, monthName);
		const gdriveLastUpdatedTime = await this.spendingGDrive.getLastUpdatedTime(this.currentYear, monthName);

		if(cacheLastUpdatedTime < gdriveLastUpdatedTime) {
			console.log('Found newer information on GDrive. Updating local cache', gdriveLastUpdatedTime, cacheLastUpdatedTime);
			await this.spendingGDrive.fetchGDriveToCache(this.currentYear, monthName);
			this.#spendingCache.setLastUpdatedTime(this.currentYear, monthName, gdriveLastUpdatedTime);
			if(this.#tabs.has(monthName)) {
				this.refreshTab(monthName);
				M.toast({html: 'Updated from GDrive', classes: 'rounded'});
			}
		} else if(cacheLastUpdatedTime > gdriveLastUpdatedTime) {
			console.log('Found newer information on local cache. Updating GDrive', cacheLastUpdatedTime, gdriveLastUpdatedTime);
			const spendings = await this.#spendingCache.readAll(this.currentYear, monthName);
			this.spendingGDrive.fetchCacheToGDrive(this.currentYear, monthName, spendings);
		}
	}

	async onClickCreateSpending(spending, creationDateTime) {
		// console.log("Creating spending", spending);
		// TODO split bought date into month, day, year. Store only month and day in object on caller to avoid processing here
		const boughtDate = spending.boughtDate;
		const month = boughtDate.substring(0, 3);
		const year = boughtDate.substring(boughtDate.length-4, boughtDate.length);
		spending.boughtDate = spending.boughtDate.split(',')[0];
		await this.#spendingCache.insert(year, creationDateTime, spending);
		if(this.currentYear === year)
			this.refreshTab(spending.month);

		/* if(gdriveSync) {
			this.syncGDrive(spending.month);
		} */
	}

	async onClickDeleteSpending(key) {
		//console.log("Delete spending", key);
		const localSpending = await this.#spendingCache.read(key);
		localSpending.isDeleted = 1;
		this.#spendingCache.insert(undefined, key, localSpending);
	}

	async onClickSaveSpendings(month) {
		const deletedSpendings = await this.#spendingCache.readAllDeleted(this.currentYear, month);
		for(const spending of deletedSpendings) {
			this.#spendingCache.delete(spending)
		}

		/* if(gdriveSync) {
			await this.syncGDrive(month);
		} */
	}

	async refreshTab(month) {
		const spendings = await this.#spendingCache.readAll(this.currentYear, month);
		if(this.#tabs.get(month)) {
			this.#tabs.get(month).refresh(spendings);
		} else {
			//TODO this might trigger a reload before gdrive updated
			window.location.reload();
		}
	}
}

document.addEventListener('DOMContentLoaded', initSpending);