import Alert from '../../common/gui/alert.js';
import Utils from '../../common/utils/utils.js';
import Settings from '../../settings/settings.js';
import Planning, { Statement } from '../model/planningModel.js';
import PlanningCache from '../persistence/planningCache.js';
import PlanningGDrive from '../persistence/planningGdrive.js';
import PlanningPersistence from '../persistence/planningPersistence.js';
import PlanningScreen from '../view/planningScreen.js';

export default class PlanningController {
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

	/** @type {PlanningGDrive} */
	#planningGDrive = undefined;

	/** @type {PlanningPersistence} */
	#planningPersistence = undefined;

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
	async init() {
		this.#cache = await PlanningCache.get(this.#defaultYear);
		const gDriveSettings = new Settings().gDriveSettings();
		if (!gDriveSettings || !gDriveSettings.enabled);

		this.#planningPersistence = new PlanningPersistence(this.#defaultYear);
		let planning = await this.#planningPersistence.readFromCache(this.#defaultMonth);
		if (!planning) {
			planning = new Planning(0, this.#defaultYear, this.#defaultMonth, []);
		}
		const screen = await this.initPlanningScreen(planning);

		const cachedYears = await this.#planningPersistence.cachedYears();
		cachedYears.forEach((year) => screen.appendYear(year));
		const cachedMonths = await this.#planningPersistence.cachedMonths();
		cachedMonths.forEach((month) => screen.appendMonth(month));

		if (!gDriveSettings.enabled) return screen;
		Alert.show('Google Drive', 'Started synchronization with Google Drive...');
		const gDrivePlanning = await this.#planningPersistence.readFromGDrive(this.#defaultMonth);
		if (gDrivePlanning) screen.refresh(gDrivePlanning);

		const gDriveYears = await this.#planningPersistence.gDriveYears();
		gDriveYears.forEach((year) => {
			if (!cachedYears.find((cachedYear) => cachedYear === year)) {
				screen.appendYear(year);
			}
		});

		Alert.show('Google Drive', 'Finished synchronization with Google Drive');
		return screen;
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
		if (this.#planningGDrive) {
			const success = this.#planningGDrive.store(planning);
			if (!success) this.#planningGDrive.markDirty(planning);
		}
	}

	/**
	 * @param {Planning} planning
	 */
	async onClickedDeletePlanning(planning) {
		await this.#cache.delete(planning.id);
		if (this.#planningGDrive) {
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
