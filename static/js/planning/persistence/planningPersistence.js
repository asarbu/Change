import Settings from '../../settings/settings.js';
import PlanningCache from './planningCache.js';
import Planning from '../model/planningModel.js';
import PlanningGDrive from './planningGdrive.js';

export default class PlanningPersistence {
	/** @type {number} */
	#defaultYear = undefined;

	/** @type {PlanningCache} */
	#planningIdb = undefined;

	/** @type {PlanningGDrive} */
	#planningGdrive = undefined;

	/** @type {Planning} */
	#defaultPlanning = undefined;

	constructor(forYear) {
		this.#defaultYear = forYear;
		this.#planningIdb = new PlanningCache(forYear);
		const gDriveSettings = new Settings().gDriveSettings();
		if (gDriveSettings && gDriveSettings.enabled) {
			this.#planningGdrive = new PlanningGDrive(forYear, gDriveSettings.rememberLogin);
		}
	}

	/**
	 * Returns changed Plannigs synchronized from GDrive
	 * @returns {Promise<Array<Planning>>}
	 */
	async readAllFromGDrive() {
		const plannings = [];
		for (let month = 0; month < 12; month += 1) {
			plannings[month] = this.readFromGDrive(month);
		}
		return Promise.all(plannings);
	}

	async readAllFromCache() {
		const plannings = [];
		for (let month = 0; month < 12; month += 1) {
			plannings[month] = this.readFromCache(month);
		}
		return Promise.all(plannings);
	}

	async readFromGDrive(forMonth) {
		const cachedPlanning = await this.#planningIdb.readForMonth(forMonth);
		if (cachedPlanning && !await this.#planningGdrive.fileExists(forMonth)) {
			this.#planningGdrive.store(cachedPlanning);
			return undefined;
		}
		if (await this.#planningGdrive.fileChanged(forMonth)) {
			if (cachedPlanning) {
				await this.#planningIdb.delete(cachedPlanning.id);
			}
			const gDrivePlanning = await this.#planningGdrive.read(forMonth);
			await this.#planningIdb.store(gDrivePlanning);
			return gDrivePlanning;
		}
		return undefined;
	}

	async readFromCache(forMonth) {
		const cachedPlanning = await this.#planningIdb.readForMonth(forMonth);
		if (cachedPlanning) return cachedPlanning;

		const pastPlanning = await this.#fetchPastPlannigFromIdb(forMonth);
		if (pastPlanning) {
			pastPlanning.month = forMonth;
			this.#planningIdb.store(pastPlanning);
			return pastPlanning;
		}

		const defaultPlanning = await this.#readDefaultPlanningFromServer();
		defaultPlanning.month = forMonth;
		this.#planningIdb.store(defaultPlanning);
		return defaultPlanning;
	}

	async #readDefaultPlanningFromServer() {
		if (this.#defaultPlanning) return this.#defaultPlanning;

		const now = new Date();
		let statements = [];
		const response = await fetch(PlanningCache.PLANNING_TEMPLATE_URI);
		if (response.ok) {
			statements = await response.json();
		}

		const planning = {
			id: now.getTime(),
			year: now.getFullYear(),
			month: now.getMonth(),
			statements: statements,
		};

		this.#defaultPlanning = Planning.fromJavascriptObject(planning);
		return this.#defaultPlanning;
	}

	async #fetchPastPlannigFromIdb(currentMonth) {
		for (let pastMonth = currentMonth - 1; pastMonth >= 0; pastMonth -= 1) {
			// eslint-disable-next-line no-await-in-loop
			const pastPlanning = await this.#planningIdb.readForMonth(pastMonth);
			if (pastPlanning) {
				return pastPlanning;
			}
		}
		return undefined;
	}

	/**
	 * Reads the most recent planning from cache and Gdrive
	 * @param {number | undefined} forMonth
	 * @returns {Promise<Planning>}
	 */
	async #readPlanningIfExists(forMonth) {
		const cachedPlanning = await this.#planningIdb.readForMonth(forMonth);
		if (cachedPlanning) return cachedPlanning;

		if (this.#planningGdrive) {
			const gDrivePlanning = await this.#planningGdrive.read(forMonth);
			if (gDrivePlanning) return gDrivePlanning;
		}

		return undefined;
	}

	/**
	 * @returns {Promise<Array<String>>}
	 */
	async gDriveYears() {
		if (this.#planningGdrive) return this.#planningGdrive.availableYears();
		return [];
	}

	async cachedYears() {
		return PlanningCache.availableYears();
	}

	async cachedMonths() {
		return (await this.#planningIdb.readAll()).map((planning) => `${planning.month}`);
	}
}
