import Settings from '../../settings/settings.js';
import PlanningCache from './planningCache.js';
import Alert from '../../common/gui/alert.js';
import Planning from '../model/planningModel.js';
import PlanningGDrive from './planningGdrive.js';

export default class PlanningPersistence {
	/** @type {PlanningCache} */
	#planningIdb = undefined;

	/** @type {PlanningGDrive} */
	#planningGdrive = undefined;

	/** @type {number} */
	#year = undefined;

	constructor(forYear) {
		this.#year = forYear;
		this.#planningIdb = new PlanningCache(forYear);
	}

	static async get(forYear) {
		const planningPersistence = new PlanningPersistence(forYear);
		await planningPersistence.init();
		return planningPersistence;
	}

	async init() {
		this.#planningIdb = await PlanningCache.get(this.#year);
		const gDriveSettings = new Settings().gDriveSettings();
		if (!gDriveSettings || !gDriveSettings.enabled) return undefined;
		this.#planningGdrive = await PlanningGDrive.get(this.#year,	gDriveSettings.rememberLogin);
		const syncPromises = [];
		for (let month = 0; month < 12; month += 1) {
			syncPromises.push(this.syncGdriveWithIdb(month));
		}
		return Promise.all(syncPromises);
	}

	async syncGdriveWithIdb(forMonth) {
		const cachedPlanning = await this.#planningIdb.readForMonth(forMonth);
		if (cachedPlanning && !await this.#planningGdrive.fileExists(forMonth)) {
			this.#planningGdrive.store(cachedPlanning);
			return;
		}
		if (await this.#planningGdrive.fileChanged(forMonth)) {
			Alert.show('Google Drive', 'Started synchronization with Google Drive...');
			if (cachedPlanning) {
				await this.#planningIdb.delete(cachedPlanning.id);
			}
			const gDrivePlanning = await this.#planningGdrive.read(forMonth);
			await this.#planningIdb.store(gDrivePlanning);
			Alert.show('Google Drive', 'Finished synchronization with Google Drive');
		}
	}

	/**
	 * Returns the planning for the provided month or the most recent planning available
	 * @param {number} forMonth
	 * @returns {Promise<Planning>}
	 */
	async read(forMonth) {
		const cachedPlanning = await this.#planningIdb.readForMonth(forMonth);
		if (cachedPlanning) return cachedPlanning;

		if (this.#planningGdrive) {
			const gDrivePlanning = await this.#planningGdrive.read(forMonth);
			if (gDrivePlanning) return gDrivePlanning;
		}

		const pastPlanning = await this.#fetchPastPlannigFromPersistence(forMonth);
		if (pastPlanning) {
			pastPlanning.month = forMonth;
			this.#planningIdb.store(pastPlanning);
			if (this.#planningGdrive) this.#planningGdrive.store(pastPlanning);
			return pastPlanning;
		}

		return PlanningPersistence.#fetchDefaultPlanningFromServer();
	}

	static async #fetchDefaultPlanningFromServer() {
		const response = await fetch(PlanningCache.PLANNING_TEMPLATE_URI);
		if (response.ok) {
			const planning = await response.json();
			const now = new Date();
			const time = now.getTime();
			const year = now.getFullYear();
			const month = now.getMonth();
			return new Planning(time, year, month, planning);
		}
		return undefined;
	}

	async #fetchPastPlannigFromPersistence(currentMonth) {
		for (let pastMonth = currentMonth - 1; pastMonth >= 0; pastMonth -= 1) {
			// eslint-disable-next-line no-await-in-loop
			const pastPlanning = await this.#readPlanningIfExists(pastMonth);
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
	async availableYears() {
		const availableYears = await PlanningCache.availableStores();
		if (this.#planningGdrive) availableYears.push(await this.#planningGdrive.availableFolders());

		return availableYears;
	}
}
