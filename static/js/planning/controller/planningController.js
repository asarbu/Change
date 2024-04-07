import PlanningCache from '../persistence/planningCache.js';
import PlanningScreen from '../view/planningScreen.js';

export default class PlanningController {
	/** @type {Array<PlanningCache>} */
	#caches = undefined;

	/** @type {PlanningCache} */
	#cache = undefined;

	/** @type {number} */
	#defaultYear = undefined;

	constructor() {
		const queryString = window.location.search;
		const urlParams = new URLSearchParams(queryString);
		const year = +(urlParams.get('year'));

		this.#defaultYear = year || new Date().getFullYear();
	}

	async init() {
		this.#caches = await PlanningCache.getAll();
		this.#cache = await PlanningCache.get(this.#defaultYear);

		const currentYearScreen = await this.initPlanningScreen(this.#cache);

		this.#caches.forEach((cache) => {
			currentYearScreen.updateYear(cache.year);
		});

		/* if(gdriveSync) {
			this.initGDrive();
		} */
	}

	/**
	 *
	 * @param {PlanningCache} cache
	 */
	async initPlanningScreen(cache) {
		const localCollections = await cache.readAll();
		const planningScreen = new PlanningScreen(
			cache.year,
			localCollections,
			cache.month,
		);
		planningScreen.onClickUpdate = this.onClickUpdate.bind(this);
		planningScreen.init();
		return planningScreen;
	}

	/*
	async initGDrive() {
		await this.planningGDrive.init();
		const needsUpdate = await this.planningGDrive.syncGDrive();
		if(needsUpdate) {
			const localCollections = await this.planningCache.readAll();
			for (const [id, planningCollection] of Object.entries(localCollections)) {
				this.#tabs.get(id).update(planningCollection);
			}
			M.toast({html: 'Updated from GDrive', classes: 'rounded'});
		}
	} */

	async onClickUpdate(id, statements) {
		// TODO repalce with a map
		for (let i = 0; i < this.#caches.length; i += 1) {
			if (this.#caches[i].year === id) {
				this.#caches[i].updateAll(statements);
			}
		}

		/*
		if(gdriveSync) {
			localStorage.setItem(GDrive.MODIFIED_TIME_FIELD, new Date().toISOString());
			const needsUpdate = await this.planningGDrive.syncGDrive();
			if(needsUpdate) {
				this.#tabs.get(id).update(planningCollection);
				M.toast({html: 'Updated from GDrive', classes: 'rounded'});
			}
		} */
	}
}
