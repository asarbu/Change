import Utils from '../../utils/utils.js';
import Planning, { Statement } from '../model/planningModel.js';
import PlanningCache from '../persistence/planningCache.js';
import PlanningGDrive from '../persistence/planningGdrive.js';
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

	constructor(forYear = undefined, forMonth = undefined, forStatement = undefined) {
		const queryString = window.location.search;
		const urlParams = new URLSearchParams(queryString);
		const urlYear = urlParams.get('year');
		const urlMonth = urlParams.get('month');
		const urlStatement = urlParams.get('statement');

		if (urlYear != null) {
			this.#defaultYear = +urlYear;
		} else if (forYear != null) {
			this.#defaultYear = forYear;
		} else {
			this.#defaultYear = new Date().getFullYear();
		}

		if (urlMonth != null) {
			this.#defaultMonth = Utils.monthForName(urlMonth);
		} else if (forMonth != null) {
			this.#defaultMonth = forMonth;
		} else {
			this.#defaultMonth = new Date().getMonth();
		}

		if (urlStatement != null) {
			this.#defaultStatement = urlStatement;
		} else if (forStatement != null) {
			this.#defaultStatement = forStatement;
		} else {
			this.#defaultStatement = '';
		}
	}

	/**
	 * @param {boolean} fetchDefaultPlanning
	 * @returns {Promise<PlanningScreen>}
	 */
	async init(fetchDefaultPlanning = false) {
		this.#caches = await PlanningCache.getAll();
		const planningCache = await PlanningCache.get(this.#defaultYear);
		// TODO ask user if he wants to fetch defaults from server
		if (fetchDefaultPlanning) {
			const emptyCache = (await planningCache.count()) === 0;
			if (emptyCache) {
				await fetch(PlanningCache.PLANNING_TEMPLATE_URI)
					.then((response) => response.json())
					.then((planningFile) => {
						const now = new Date();
						const time = now.getTime();
						const year = now.getFullYear();
						const month = now.getMonth();
						planningCache.storePlanning(new Planning(time, year, month, planningFile), time);
					});
			}
		}
		const planning = (await planningCache.readForMonth(this.#defaultMonth))[0];
		const currentYearScreen = await this.initPlanningScreen(planning);

		this.#caches.forEach((cache) => {
			currentYearScreen.appendYear(cache.year);
		});
		const planningsPerMonths = await planningCache.readAll();
		planningsPerMonths.forEach((plan) => {
			currentYearScreen.appendMonth(plan.month);
		});

		const gDrive = await PlanningGDrive.get(this.#defaultYear);
		if (await gDrive.fileChanged(this.#defaultMonth)) {
			const gDrivePlanning = await gDrive.read(this.#defaultMonth);
			await planningCache.storePlanning(gDrivePlanning);
		} else {
			await gDrive.write(planning);
		}

		return currentYearScreen;
	}

	/**
	 * @param {Planning} cache
	 * @returns {Promise<PlanningScreen>}
	 */
	async initPlanningScreen(planning) {
		this.#defaultScreen = new PlanningScreen(planning);
		this.#defaultScreen.onClickUpdate = this.onClickUpdate.bind(this);
		this.#defaultScreen.onStatementAdded = this.onClickAddStatement.bind(this);
		this.#defaultScreen.onClickDeletePlanning(this.onClickedDeletePlanning.bind(this));
		this.#defaultScreen.init();
		this.#defaultScreen.onClickedShowStatement(this.#defaultStatement);
		return this.#defaultScreen;
	}

	/**
	 * @param {Promise<Planning>} planning
	 */
	async onClickUpdate(planning) {
		await Promise.all(
			this.#caches
				.filter((cache) => cache.year === planning.year)
				.map(async (cache) => cache.storePlanning(planning)),
		);
	}

	/**
	 * @param {Planning} planning
	 */
	async onClickedDeletePlanning(planning) {
		await Promise.all(this.#caches
			.filter((cache) => cache.year === planning.year)
			.map((cache) => cache.delete(planning.id)));
	}

	/**
	 * @param {Statement} statement
	 */
	async onClickAddStatement(statement) {
		const date = new Date(statement.id);
		const planningCache = await PlanningCache.get(date.getFullYear());
		if (planningCache) {
			let planning = (await planningCache.readForMonth(date.getMonth()))[0];
			if (planning) {
				planning.statements.push(statement);
			} else {
				planning = new Planning(date.getTime(), date.getFullYear(), date.getMonth(), [statement]);
			}
			await planningCache.storePlanning(planning);
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
		// Current year and month do not require reload
		if (year === this.#defaultYear && month === this.#defaultMonth) {
			this.#defaultScreen.onClickedShowStatement(statementName);
			return;
		}

		// TODO refresh from memory

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
