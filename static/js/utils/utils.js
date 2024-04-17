export default class Utils {
	// TODO replace this with date constructs to parse months?
	static #MONTH_NAMES = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];

	/**
	 * Converts to integers short month names (Jan, Feb, etc.)
	 * @param {string} name Name of the month to parse
	 * @returns {number}
	 */
	static monthForName(name) {
		if (!Utils.#MONTH_NAMES.includes(name)) return undefined;
		return Utils.#MONTH_NAMES.indexOf(name);
	}

	/**
	 * Converts month integers to string names (Jan, Feb, etc.)
	 * @param {number} month Month number to parse
	 * @returns {string}
	 */
	static nameForMonth(month) {
		if (month === undefined || month === null || Number.isNaN(month)) return undefined;
		return Utils.#MONTH_NAMES.at(month);
	}
}
