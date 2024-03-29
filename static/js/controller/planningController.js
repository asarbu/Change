import PlanningCache from '../persistence/planning/planningCache.js';
import PlanningScreen from '../gui/planningScreen.js';

export default class PlanningController {
	/**
	 * Used for fast retreival of local caches.
	 * @type {Array<PlanningCache>}
	 * @private
	 */
	#caches = undefined;

	async init(forYear) {
		const year = forYear || new Date().getFullYear();
		this.#caches = await PlanningCache.getAll();

		let defaultYearCache;
		for (let i = 0; i < this.#caches.length; i += 1) {
			if (this.#caches[i].year === `${year}`) {
				defaultYearCache = this.#caches[i];
			}
		}

		const currentYearScreen = await this.initPlanningScreen(defaultYearCache);
		currentYearScreen.init();
		currentYearScreen.activate();

		/* if(gdriveSync) {
			this.initGDrive();
		} */
	}

	/**
	 *
	 * @param {PlanningCache} cache
	 */
	async initPlanningScreen(cache) {
		const planningCache = cache;
		const localCollections = await planningCache.readAll();
		const planningScreen = new PlanningScreen(planningCache.year, localCollections);
		planningScreen.onClickUpdate = this.onClickUpdate.bind(this);
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
