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

	/** @type {PlanningCache} */
	#cache = undefined;

	/** @type {boolean} */
	#gDriveEnabled = false;

	/** @type {PlanningGDrive} */
	#planningGDrive = undefined;

	constructor(forYear = undefined, forMonth = undefined, forStatement = undefined, gDriveEnabled) {
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

		this.#gDriveEnabled = gDriveEnabled;
	}

	/**
	 * @param {boolean} fetchDefaultPlanning
	 * @returns {Promise<PlanningScreen>}
	 */
	async init(fetchDefaultPlanning = false) {
		this.#caches = await PlanningCache.getAll();
		this.#cache = await PlanningCache.get(this.#defaultYear);
		// TODO ask user if he wants to fetch defaults from server
		if (fetchDefaultPlanning) {
			const emptyCache = (await this.#cache.count()) === 0;
			if (emptyCache) {
				await fetch(PlanningCache.PLANNING_TEMPLATE_URI)
					.then((response) => response.json())
					.then((planningFile) => {
						const now = new Date();
						const time = now.getTime();
						const year = now.getFullYear();
						const month = now.getMonth();
						this.#cache.storePlanning(new Planning(time, year, month, planningFile), time);
					});
			}
		}
		const planning = (await this.#cache.readForMonth(this.#defaultMonth));
		const screen = await this.initPlanningScreen(planning);

		this.#caches.forEach((cache) => {
			screen.appendYear(cache.year);
		});
		const planningsPerMonths = await this.#cache.readAll();
		planningsPerMonths.forEach((plan) => {
			screen.appendMonth(plan.month);
		});

		if (this.#gDriveEnabled) {
			this.#planningGDrive = await PlanningGDrive.get(this.#defaultYear);
			this.fetchFromGDrive();
		}

		return screen;
	}

	async fetchFromGDrive() {
		if (await this.#planningGDrive.fileChanged(this.#defaultMonth)) {
			const planning = (await this.#cache.readForMonth(this.#defaultMonth));
			if (planning) {
				await this.#cache.delete(planning.id);
			}

			const gDrivePlanning = await this.#planningGDrive.read(this.#defaultMonth);
			await this.#cache.storePlanning(gDrivePlanning);
			this.#defaultScreen.refresh(gDrivePlanning);
		}
	}

	/**
	 * @param {Planning} cache
	 * @returns {Promise<PlanningScreen>}
	 */
	async initPlanningScreen(planning) {
		this.#defaultScreen = new PlanningScreen(planning);
		// TODO replace this with methods
		this.#defaultScreen.onClickUpdate = this.onClickUpdate.bind(this);
		this.#defaultScreen.onStatementAdded = this.onClickAddStatement.bind(this);
		this.#defaultScreen.onClickDeletePlanning(this.onClickedDeletePlanning.bind(this));
		this.#defaultScreen.onClickedShowStatement(this.#defaultStatement);
		this.#defaultScreen.init();
		return this.#defaultScreen;
	}

	/**
	 * @param {Promise<Planning>} planning
	 */
	async onClickUpdate(planning) {
		await this.#cache.storePlanning(planning);
		if (this.#gDriveEnabled) {
			const success = this.#planningGDrive.store(planning);
			if (!success) this.#planningGDrive.markDirty(planning);
		}
	}

	/**
	 * @param {Planning} planning
	 */
	async onClickedDeletePlanning(planning) {
		await this.#cache.delete(planning.id);
		if (this.#gDriveEnabled) {
			this.#planningGDrive.delete(planning);
		}
	}

	/**
	 * @param {Statement} statement
	 */
	async onClickAddStatement(statement) {
		const date = new Date(statement.id);
		const planningCache = await PlanningCache.get(date.getFullYear());
		if (planningCache) {
			let planning = (await planningCache.readForMonth(date.getMonth()));
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
