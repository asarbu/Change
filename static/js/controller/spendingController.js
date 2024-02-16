async function initSpending() {
	if (!window.indexedDB) {
		console.error(`Your browser doesn't support IndexedDB`);
		return;
	}
	
	const spending = new SpendingController();
	await spending.init();
}

class SpendingController {
	#MONTH_NAMES = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
	#spendingCache = undefined;
	/**
	 * Used to quickly access already created tabs
	 * @type {Map<string, SpendingTab>}
	 */
	#tabs = undefined;

	/**
	 * Used to quickly access already created tabs
	 * @type {PlanningCache}
	 */
	#planningCache = undefined;
	constructor() {
		this.#spendingCache = new SpendingCache();
		this.#planningCache = new PlanningCache();
		
		if(gdriveSync) {
			this.spendingGDrive = new SpendingGDrive(this.#spendingCache);
			this.planningGDrive = new PlanningGDrive(this.#planningCache);
		}

		this.#tabs = new Map();
		
		const now = new Date();
		this.currentYear =  now.toLocaleString("en-US", {year: "numeric"});
		this.currentMonth = now.toLocaleString("en-US", {month: "short"});
	}

	async init() {
		//console.log("Init spending");
		await this.#spendingCache.init();
		await this.#planningCache.init();
		
		const planningCollections = await this.#planningCache.getExpenses();
		const expenseBudgets = new Map();
		const categories = new Map();
		for(const [_, planningCollection] of planningCollections.entries()) {
			for(const [groupName, group] of Object.entries(planningCollection.value.groups)) {
				const categoryArray = [];
				for(const [_, item] of Object.entries(group.items)) {
					expenseBudgets.set(item.itemName, item.monthly);
					categoryArray.push(item.itemName);
				}
				categories.set(groupName, categoryArray);
			}
		}
		
		let monthIndex = this.#MONTH_NAMES.indexOf(this.currentMonth);
		let monthCount = 0;
		while (monthIndex >= 0 && monthCount < 4){
			const monthName = this.#MONTH_NAMES[monthIndex];
			const spendings = await this.#spendingCache.readAll(this.currentYear, monthName);
			
			if(spendings.length > 0 || monthName === this.currentMonth) {
				const tab = new SpendingTab(monthName, spendings, expenseBudgets, categories);
				tab.init();
				tab.onClickCreateSpending = this.onClickCreateSpending.bind(this);
				tab.onClickDeleteSpending = this.onClickDeleteSpending.bind(this);
				tab.onClickSaveSpendings = this.onClickSaveSpendings.bind(this);
				this.#tabs.set(monthName, tab);
				monthCount++;
			}

			if(gdriveSync) {
				this.initGDrive(monthName);
			}
			
			monthIndex--;
		}
		
		M.AutoInit();
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
			console.log("Found newer information on GDrive. Updating local cache", gdriveLastUpdatedTime, cacheLastUpdatedTime);
			await this.spendingGDrive.fetchGDriveToCache(this.currentYear, monthName);
			this.#spendingCache.setLastUpdatedTime(this.currentYear, monthName, gdriveLastUpdatedTime);
			if(this.#tabs.has(monthName)) {
				this.refreshTab(monthName);
				M.toast({html: 'Updated from GDrive', classes: 'rounded'});
			}
		} else if(cacheLastUpdatedTime > gdriveLastUpdatedTime) {
			console.log("Found newer information on local cache. Updating GDrive", cacheLastUpdatedTime, gdriveLastUpdatedTime);
			const spendings = await this.#spendingCache.readAll(this.currentYear, monthName);
			this.spendingGDrive.fetchCacheToGDrive(this.currentYear, monthName, spendings);
		}
	}

	async onClickCreateSpending(spending, creationDateTime) {
		//console.log("Creating spending", spending);
		//TODO split bought date into month, day, year. Store only month and day in object on caller to avoid processing here
		const boughtDate = spending.boughtDate;
		const month = boughtDate.substring(0, 3);
		const year = boughtDate.substring(boughtDate.length-4, boughtDate.length);
		spending.boughtDate = spending.boughtDate.split(',')[0];
		await this.#spendingCache.insert(year, creationDateTime, spending);
		if(this.currentYear === year)
			this.refreshTab(spending.month);

		if(gdriveSync) {
			this.syncGDrive(spending.month);
		}
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

		if(gdriveSync) {
			await this.syncGDrive(month);
		}
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

document.addEventListener("DOMContentLoaded", initSpending);