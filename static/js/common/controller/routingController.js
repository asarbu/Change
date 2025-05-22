import Planning, { Statement } from '../../planning/model/planningModel.js';
import Utils from '../utils/utils.js';

export default class RoutingController {
	#PLANNING_TEMPLATE_URI = '/planning.json';

	#SETTINGS_URI = '/settings';

	#PLANNING_URI = '/planning';

	#fetchingFromServer = false;

	#defaultPlanning = undefined;

	redirectToSettings() {
		window.location.href = this.#SETTINGS_URI;
	}

	redirectToPlanning() {
		window.location.href = this.#PLANNING_URI;
	}

	/**
	 * Fetch Planning with most common statements from the server.
	 * @returns {Promise<Planning>}
	 */
	async fetchDefaultPlanning() {
		if (this.#defaultPlanning) return this.#defaultPlanning;
		if (!this.#fetchingFromServer) {
			this.#fetchingFromServer = true;
		} else {
			while (!this.#defaultPlanning) {
				await Utils.sleep(10);
			}
			return this.#defaultPlanning;
		}

		const now = new Date();
		let statements = [];
		const response = await fetch(this.#PLANNING_TEMPLATE_URI);
		if (response.ok) {
			statements = await response.json();
		} else {
			// Use a default statement to fail gracefully if URL is not available in the future.
			statements.push(new Statement('default_statement', 'default_statement', Statement.TYPE_EXPENSE, []));
		}

		const planning = {
			id: now.getTime(),
			year: now.getFullYear(),
			month: now.getMonth(),
			statements: statements,
		};

		this.#defaultPlanning = Planning.fromJavascriptObject(planning);
		this.#fetchingFromServer = false;
		return this.#defaultPlanning;
	}
}
