import Settings from '../../settings/settings.js';
import PlanningCache from './planningCache.js';
import PlanningGDrive from './planningGdrive.js';
import Alert from '../../common/gui/alert.js';

export default class PlanningPersistence {
	/** @type {PlanningCache} */
	#planningIdb = undefined;

	/** @type {PlanningGDrive} */
	#planningGdrive = undefined;

	/** @type {number} */
	#year = undefined;

	constructor(forYear) {
		this.#year = forYear;
	}

	static async get(forYear) {
		const planningPersistence = PlanningPersistence(forYear);
		await planningPersistence.init();
	}

	async init() {
		this.#planningIdb = await PlanningCache.get(this.#year);
		const gDriveSettings = new Settings().gDriveSettings();
		if (!gDriveSettings || !gDriveSettings.enabled) return;
		this.#planningGdrive = await PlanningGDrive.get(this.#year,	gDriveSettings.rememberLogin);
		for (let month = 0; month < 12; month += 1) {
			const cachedPlanning = await this.#planningIdb.readForMonth(month);
			if (!await this.#planningGdrive.fileExists(month) && cachedPlanning) {
				this.#planningGdrive.store(cachedPlanning);
				return;
			}
			if (await planningGDrive.fileChanged(month)) {
				Alert.show('Google Drive', 'Started synchronization with Google Drive...');
				if (cachedPlanning) {
					await this.#planningIdb.delete(cachedPlanning.id);
				}
				const gDrivePlanning = await this.#planningGdrive.read(month);
				await this.#planningIdb.storePlanning(gDrivePlanning);
				Alert.show('Google Drive', 'Finished synchronization with Google Drive');
			}
		}
	}
}
