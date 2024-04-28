import Utils from '../../utils/utils.js';
import Planning, { Statement } from '../model/planningModel.js';
import PlanningCache from '../persistence/planningCache.js';
import PlanningScreen from '../view/planningScreen.js';

export default class PlanningController {
	/** @type {Array<PlanningCache>} */
	#caches = undefined;

	/** @type {PlanningScreen} */
	#defaultScreen = undefined;

	/** @type {number} */
	#defaultYear = undefined;

	/** @type {number} */
	#defaultMonth = undefined;

	/** @type {string} */
	#defaultStatement = undefined;

	constructor() {
		const queryString = window.location.search;
		const urlParams = new URLSearchParams(queryString);
		const year = +(urlParams.get('year'));
		const month = Utils.monthForName((urlParams.get('month')));
		const statement = urlParams.get('statement');

		this.#defaultYear = year || new Date().getFullYear();
		this.#defaultMonth = month || new Date().getMonth();
		this.#defaultStatement = statement;
	}

	async init() {
		this.#caches = await PlanningCache.getAll();
		const planningCache = await PlanningCache.get(this.#defaultYear);
		const emptyCache = (await planningCache.count()) === 0;
		// TODO ask user if he wants to fetch defaults from server
		if (emptyCache) {
			await fetch(PlanningCache.PLANNING_TEMPLATE_URI)
				.then((response) => response.json())
				.then((planningFile) => {
					const now = new Date();
					const time = now.getTime();
					const year = now.getFullYear();
					const month = now.getMonth();
					planningCache.insert(new Planning(time, year, month, planningFile), time);
				});
		}

		const currentYearScreen = await this.initPlanningScreen(planningCache);

		this.#caches.forEach((cache) => {
			currentYearScreen.appendYear(cache.year);
		});
		const planningsPerMonths = await planningCache.readAll();
		planningsPerMonths.forEach((planning) => {
			currentYearScreen.appendMonth(planning.month);
		});
	}

	/**
	 * @param {PlanningCache} cache
	 * @returns {Promise<PlanningScreen>}
	 */
	async initPlanningScreen(cache) {
		// TODO handle multiple months. Keep only the most recent one
		const planning = (await cache.readForMonth(this.#defaultMonth))[0];
		const planningScreen = new PlanningScreen(planning);
		planningScreen.onClickUpdate = this.onClickUpdate.bind(this);
		planningScreen.onStatementAdded = this.onClickAddStatement.bind(this);
		planningScreen.init();
		planningScreen.onClickShowStatement(this.#defaultStatement);
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
			let planning = await planningCache.readForMonth(date.getMonth())[0];
			if (planning) {
				planning.statements.push(statement);
			} else {
				planning = new Planning(date.getTime(), date.getFullYear(), date.getMonth(), [statement]);
			}
			planningCache.storePlanning(planning);
			this.navigateTo(date.getFullYear(), date.getMonth(), statement.name);
		}
	}

	/**
	 * Navigates to the planning statement of the provided parameters
	 * @param {number} year
	 * @param {number} month
	 * @param {string} statementName
	 */
	navigateTo(year, month, statementName) {
		if (year === this.#defaultYear && month === this.#defaultMonth) {
			this.#defaultScreen.onClickShowStatement(statementName);
			return;
		}

		if (!year) return;
		let url = `${window.location.pathname}`;
		url += `?${year}`;

		if (!month) window.location.href = url;
		url += `&${month}`;

		if (!statementName) window.location.href = url;
		url += `&${statementName}`;
		window.location.href = url;
	}
}
