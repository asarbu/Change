import RoutingController from '../../common/controller/routingController.js';
import Alert from '../../common/gui/alert.js';
import Utils from '../../common/utils/utils.js';
import Planning, { Statement } from '../model/planningModel.js';
import PlanningPersistence from '../persistence/planningPersistence.js';
import PlanningScreen from '../view/planningScreen.js';
import PlanningMissingScreen from '../view/planningMissingScreen.js';
import SettingsController from '../../settings/controller/settingsController.js';
import PlanningCreateModal from '../view/planningCreateModal.js';

export default class PlanningController {
	/** @type {PlanningScreen} */
	#defaultScreen = undefined;

	/** @type {Planning} */
	#planning = undefined;

	/** @type {number} */
	#defaultYear = undefined;

	/** @type {number} */
	#defaultMonth = undefined;

	/** @type {string} */
	#defaultStatementName = undefined;

	/** @type {PlanningPersistence} */
	#planningPersistence = undefined;

	/** @type {RoutingController} */
	#routingController = undefined;

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
			this.#defaultStatementName = urlStatement;
		} else if (forStatement != null) {
			this.#defaultStatementName = forStatement;
		} else {
			this.#defaultStatementName = '';
		}

		this.#routingController = new RoutingController();
	}

	/**
	 * @param {boolean} fetchDefaultPlanning
	 * @returns {Promise<PlanningScreen>}
	 */
	async init() {
		this.#planningPersistence = new PlanningPersistence(this.#defaultYear);
		let screen = await this.initScreenFromCache();

		const gDriveSettings = new SettingsController().currentSettings().gDriveSettings();
		if (gDriveSettings.isEnabled()) {
			this.#planningPersistence.enableGDrive(gDriveSettings.canRememberLogin());
			screen = await this.initScreenFromGDrive();
		}

		if (!screen) {
			screen = this.initPlanningMissingScreen();
		}

		if (this.#defaultStatementName !== '') {
			const statement = this.#planning.statements
				.find((stmt) => stmt.name === this.#defaultStatementName);
			screen.onSelectedStatement(statement);
		}

		return screen;
	}

	async initScreenFromCache() {
		const planning = await this.#planningPersistence.readFromCache(this.#defaultMonth);
		if (planning) {
			const screen = await this.initPlanningScreen(planning);

			const cachedYears = await this.#planningPersistence.cachedYears();
			cachedYears.forEach((year) => screen.appendYear(year));

			const cachedMonths = await this.#planningPersistence.cachedMonths();
			cachedMonths.forEach((month) => screen.appendMonth(month));

			return screen;
		}
		return undefined;
	}

	async initScreenFromGDrive() {
		Alert.show('Google Drive', 'Started synchronization with Google Drive...');
		const gDrivePlanning = await this.#planningPersistence.readFromGDrive(this.#defaultMonth);
		if (gDrivePlanning) {
			const screen = this.initPlanningScreen(gDrivePlanning);

			const gDriveYears = await this.#planningPersistence.gDriveYears();
			gDriveYears.forEach((year) => {	screen.appendYear(year); });

			const gDriveMonths = await this.#planningPersistence.gDriveMonths();
			gDriveMonths.forEach((month) => { screen.appendMonth(month); });

			return screen;
		}

		Alert.show('Google Drive', 'Finished synchronization with Google Drive');
		return undefined;
	}

	initPlanningMissingScreen() {
		const planningMissingScreen = new PlanningMissingScreen().init();
		planningMissingScreen.onClickFetchDefault(this.#onClickedFetchDefaultPlanning.bind(this));
		planningMissingScreen.onClickGoToSettings(this.#onClickedGoToSettings.bind(this));
		planningMissingScreen.onClickCreateNewPlan(this.#onClickedCreateNewPlan.bind(this));
		planningMissingScreen.init();
		return planningMissingScreen;
	}

	/**
	 * @param {Planning} cache
	 * @returns {Promise<PlanningScreen>}
	 */
	async initPlanningScreen(planning) {
		this.#planning = planning;
		this.#defaultScreen = new PlanningScreen(planning);
		this.#defaultScreen.onClickSavePlanning(this.onClickSavePlanning.bind(this));
		this.#defaultScreen.onInsertStatement(this.onInsertedStatement.bind(this));
		this.#defaultScreen.onEditStatement(this.onEditedStatement.bind(this));
		this.#defaultScreen.onDeletePlanning(this.onDeletedPlanning.bind(this));
		this.#defaultScreen.init();
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
	async onDeletedPlanning(planning) {
		this.#planningPersistence.delete(planning)
			.then(this.initPlanningMissingScreen());
	}

	/**
	 * @param {Statement} statement
	 */
	onInsertedStatement(statement) {
		const duplicatedStatement = this.#planning.statements
			.find((stmt) => stmt.name === statement.name);

		if (duplicatedStatement) {
			Alert.show('Statement already exists', 'You can edit it below');
			this.#defaultScreen.onSelectedStatement(statement);
			return this.#planning;
		}

		this.#planning.statements.push(statement);
		this.#defaultScreen.refresh(this.#planning);
		this.#defaultScreen.onSelectedStatement(statement);
		return this.#planning;
	}

	/**
	 * @param {Statement} newStatement
	 */
	onEditedStatement(newStatement) {
		// TODO remove ID and identify statement by names
		const editedStatement = this.#planning.statements
			.find((oldStatement) => oldStatement.id === newStatement.id);
		if (!editedStatement) {
			Alert.show(`No statement found to edit with name ${newStatement.name}`);
			return undefined;
		}

		editedStatement.name = newStatement.name;
		editedStatement.type = newStatement.type;
		this.#defaultScreen.refreshStatement(editedStatement);
		return this.#planning;
	}

	#onClickedFetchDefaultPlanning() {
		const storePlanning = this.#planningPersistence.store.bind(this.#planningPersistence);
		const initPlanningScreen = this.initPlanningScreen.bind(this);

		this.#routingController
			.fetchDefaultPlanning()
			.then(storePlanning)
			.then(initPlanningScreen)
			.catch((e) => {
				Alert.show('Error', `Error at fetching default planning. ${e}`);
			});
	}

	#onClickedGoToSettings() {
		this.#routingController.redirectToSettings();
	}

	#onClickedCreateNewPlan() {
		const planningCreateModal = new PlanningCreateModal();
		planningCreateModal.onCreatePlanning(this.#onCreatedPlanning.bind(this));
		planningCreateModal.open();
	}

	#onCreatedPlanning(planning) {
		const initPlanningScreen = this.initPlanningScreen.bind(this);

		this.#planningPersistence
			.store(planning)
			.then(initPlanningScreen);
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
			const statement = this.#planning.statements.find((stmt) => stmt.name === statementName);
			this.#defaultScreen.onSelectedStatement(statement);
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
