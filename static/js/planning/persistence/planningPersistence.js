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
	#planningGDrive = undefined;

	/** @type {Planning} */
	#defaultPlanning = undefined;

	/** @type {boolean} */
	#fetchingFromServer = false;

	constructor(forYear) {
		this.#defaultYear = forYear;
		this.#planningIdb = new PlanningCache(forYear);
		const gDriveSettings = new Settings().gDriveSettings();
		if (gDriveSettings && gDriveSettings.enabled) {
			this.#planningGDrive = new PlanningGDrive(forYear, gDriveSettings.rememberLogin);
		}
	}

	/**
	 * Returns changed Plannigs synchronized from GDrive
	 * @returns {Promise<Array<Planning>>}
	 */
	async readAllFromGDrive() {
		const plannings = [];
		// Force initialization beforehand to avoid race conditions in init.
		await this.#planningGDrive.init();
		for (let month = 0; month < 12; month += 1) {
			plannings[month] = this.readFromGDrive(month);
		}
		return Promise.all(plannings);
	}

	async readAllFromCache() {
		const availableMonths = await this.cachedMonths();
		const plannings = [];
		availableMonths.forEach((month) => {
			plannings[month] = this.readFromCache(month);
		});
		return Promise.all(plannings);
	}

	async readFromGDrive(forMonth) {
		const cachedPlanning = await this.#planningIdb.readForMonth(forMonth);
		if (cachedPlanning && !await this.#planningGDrive.fileExists(forMonth)) {
			this.#planningGDrive.store(cachedPlanning);
			return undefined;
		}
		if (await this.#planningGDrive.fileChanged(forMonth)) {
			if (cachedPlanning) {
				await this.#planningIdb.delete(cachedPlanning.id);
			}
			const gDrivePlanning = await this.#planningGDrive.read(forMonth);
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
			pastPlanning.id = new Date().getTime();
			pastPlanning.month = forMonth;
			this.#planningIdb.store(pastPlanning);
			return pastPlanning;
		}

		// Fetch from last years
		const lastYears = await this.cachedYears();
		// TODO replace with filter, find, map
		for (let lastYear = 0; lastYear < lastYears.length; lastYear += 1) {
			if (lastYears[lastYear] <= this.#defaultYear) {
				const planningCache = await PlanningCache.get(lastYears[lastYear]);
				const planning = await planningCache.readForMonth(forMonth);
				// TODO move impure domain logic to controller
				if (planning) {
					planning.id = new Date().getTime();
					planning.year = this.#defaultYear;
					planning.month = forMonth;
					this.#planningIdb.store(planning);
					return planning;
				}
			}
		}

		return undefined;
	}

	async store(planning) {
		const storedPlanning = await this.#planningIdb.store(planning);
		if (this.#planningGDrive) {
			const success = this.#planningGDrive.store(planning);
			if (!success) this.#planningGDrive.markDirty(planning);
		}
		return storedPlanning;
	}

	async delete(planning) {
		// TODO add edited and deleted properties to planning class to mark them dirty
		await this.#planningIdb.delete(planning.id);
		if (this.#planningGDrive) {
			await this.#planningGDrive.delete(planning);
		}
	}

	async #fetchPastPlannigFromIdb(currentMonth) {
		for (let pastMonth = currentMonth - 1; pastMonth >= 0; pastMonth -= 1) {
			const pastPlanning = await this.#planningIdb.readForMonth(pastMonth);
			if (pastPlanning) {
				return pastPlanning;
			}
		}
		return undefined;
	}

	/**
	 * @returns {Promise<Array<String>>}
	 */
	async gDriveYears() {
		if (this.#planningGDrive) return this.#planningGDrive.availableYears();
		return [];
	}

	/**
	 * @returns {Promise<Array<String>>}
	 */
	async gDriveMonths() {
		if (this.#planningGDrive) return this.#planningGDrive.availableMonths();
		return [];
	}

	// eslint-disable-next-line class-methods-use-this
	async cachedYears() {
		return PlanningCache.availableYears();
	}

	async cachedMonths() {
		return (await this.#planningIdb.readAll()).map((planning) => planning.month);
	}
}
