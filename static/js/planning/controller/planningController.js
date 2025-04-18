import Alert from '../../common/gui/alert.js';
import Utils from '../../common/utils/utils.js';
import Settings from '../../settings/settings.js';
import Planning, { Statement } from '../model/planningModel.js';
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
			this.#defaultYear = +forYear ?? new Date().getFullYear();
		} else {
			this.#defaultYear = new Date().getFullYear();
		}

		if (urlMonth != null) {
			this.#defaultMonth = Utils.monthForName(urlMonth) ?? new Date().getMonth();
		} else if (forMonth != null) {
			this.#defaultMonth = +forMonth ?? new Date().getMonth();
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
		this.#planningPersistence = new PlanningPersistence(this.#defaultYear);
		let planning = await this.#planningPersistence.readFromCache(this.#defaultMonth);
		if (!planning) {
			// TODO prompt user do create his own planning, fetch default or activate gDrive
			planning = new Planning(0, this.#defaultYear, this.#defaultMonth, []);
		}
		const screen = await this.initPlanningScreen(planning);

		const cachedYears = await this.#planningPersistence.cachedYears();
		cachedYears.forEach((year) => screen.appendYear(year));
		const cachedMonths = await this.#planningPersistence.cachedMonths();
		cachedMonths.forEach((month) => screen.appendMonth(month));

		const gDriveSettings = new Settings().gDriveSettings();
		if (!gDriveSettings || !gDriveSettings.enabled) return screen;

		Alert.show('Google Drive', 'Started synchronization with Google Drive...');
		const gDrivePlanning = await this.#planningPersistence.readFromGDrive(this.#defaultMonth);
		if (gDrivePlanning) screen.refresh(gDrivePlanning);

		const gDriveYears = await this.#planningPersistence.gDriveYears();
		gDriveYears.forEach((year) => {	screen.appendYear(year); });

		const gDriveMonths = await this.#planningPersistence.gDriveMonths();
		gDriveMonths.forEach((month) => { screen.appendMonth(month); });

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
		this.#defaultScreen.onClickSavePlanning(this.onClickSavePlanning.bind(this));
		this.#defaultScreen.onClickSaveStatement(this.onClickedSaveStatement.bind(this));
		this.#defaultScreen.onClickDeletePlanning(this.onClickedDeletePlanning.bind(this));
		this.#defaultScreen.init();
		if(this.#defaultStatement) {
			this.#defaultScreen.selectStatement(this.#defaultStatement);
		}
		return this.#defaultScreen;
	}

	/**
	 * @param {Promise<Planning>} planning
	 */
	async onClickSavePlanning(planning) {
		await this.#planningPersistence.store(planning);
	}

	/**
	 * @param {Planning} planning
	 */
	async onClickedDeletePlanning(planning) {
		await this.#planningPersistence.delete(planning);
	}

	/**
	 * @param {Statement} statement
	 */
	async onClickedSaveStatement(statement) {
		const date = new Date(statement.id);
		let planningPersistence = this.#planningPersistence;
		if (date.getFullYear() !== this.#defaultYear) {
			planningPersistence = new PlanningPersistence(date.getFullYear());
		}
		let planning = await planningPersistence.readFromCache(date.getMonth());
		if (planning) {
			planning.statements.push(statement);
		} else {
			planning = new Planning(date.getTime(), date.getFullYear(), date.getMonth(), [statement]);
		}
		const storedPlanning = await planningPersistence.store(planning);
		// Store is successful if the id is set
		if (storedPlanning.id && date.getFullYear() === this.#defaultYear) {
			this.#defaultScreen.refresh(storedPlanning);
		}
		this.navigateTo(date.getFullYear(), date.getMonth(), statement.name);
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
			this.#defaultScreen.selectStatement(statementName);
			return;
		}

		// TODO refresh from memory

		if (!year) return;
		let url = `${window.location.pathname}`;
		url += `?year=${year}`;

		if (!month) window.location.href = url;
		url += `&month=${Utils.nameForMonth(month)}`;

		if (!statementName) window.location.href = url;
		url += `&statement=${statementName}`;
		window.location.href = url;
	}
}
