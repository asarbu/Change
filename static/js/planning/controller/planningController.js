import Utils from '../../utils/utils.js';
import Planning, { Statement } from '../model/planningModel.js';
import PlanningCache from '../persistence/planningCache.js';
import PlanningScreen from '../view/planningScreen.js';

export default class PlanningController {
	/** @type {Array<PlanningCache>} */
	#caches = undefined;

	/** @type {PlanningCache} */
	#cache = undefined;

	/** @type {number} */
	#defaultYear = undefined;

	/** @type {number} */
	#defaultMonth = undefined;

	constructor() {
		const queryString = window.location.search;
		const urlParams = new URLSearchParams(queryString);
		const year = +(urlParams.get('year'));
		const month = Utils.monthForName((urlParams.get('month')));

		this.#defaultYear = year || new Date().getFullYear();
		this.#defaultMonth = month || new Date().getMonth();
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
		const planning = await cache.readForMonth(this.#defaultMonth);
		const planningScreen = new PlanningScreen(planning);
		planningScreen.onClickUpdate = this.onClickUpdate.bind(this);
		// planningScreen.onClickAddStatement = this.onClickAddStatement.bind(this);
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

	/**
	 * @param {Planning} planning
	 */
	onClickUpdate(planning) {
		// TODO repalce with a map
		for (let i = 0; i < this.#caches.length; i += 1) {
			if (this.#caches[i].year === planning.year) {
				this.#caches[i].updateAll([planning]);
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

	/**
	 * @param {Statement} statement
	 */
	async onClickAddStatement(statement) {
		const date = new Date(statement.id);
		const planningCache = this.#caches.find((cache) => cache.year === date.getFullYear());
		if (planningCache) {
			const planning = await planningCache.readForMonth(date.getMonth());
			if (planning) {
				planning.statements.push(statement);
				planningCache.update(planning.id, planning);
			}
		}
	}
}
