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
			currentYearScreen.appendYear(cache.year);
		});
		const planningsPerMonths = await this.#cache.readAll();
		planningsPerMonths.forEach((planning) => {
			currentYearScreen.appendMonth(planning.month);
		})
	}

	/**
	 *
	 * @param {PlanningCache} cache
	 */
	async initPlanningScreen(cache) {
		const planning = await cache.readForMonth(this.#defaultMonth);
		const planningScreen = new PlanningScreen(planning);
		planningScreen.onClickUpdate = this.onClickUpdate.bind(this);
		planningScreen.onStatementAdded = this.onClickAddStatement.bind(this);
		planningScreen.init();
		return planningScreen;
	}

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
	}

	/**
	 * @param {Statement} statement
	 */
	async onClickAddStatement(statement) {
		const date = new Date(statement.id);
		const planningCache = await PlanningCache.get(date.getFullYear());
		if (planningCache) {
			const planning = await planningCache.readForMonth(date.getMonth());
			if (planning) {
				planning.statements.push(statement);
				planningCache.update(planning.id, planning);
			}
		}
	}
}
