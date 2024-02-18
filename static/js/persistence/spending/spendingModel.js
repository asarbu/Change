export default class Spending {
	/**
	 * @param {id} id Unique identifier of this spending
	 * @param {string} type Spending type (Expense, Saving)
	 * @param {string} category Spending category (Taken from planning)
	 * @param {Date} spentOn Date when this spending was created.
	 * @param {string} description Spending description
	 * @param {number} price Amount spent on this spending
	 */
	constructor(id, type, category, spentOn, description, price) {
		this.id = id;
		this.type = type;
		this.category = category;
		this.boughtOn = spentOn;
		this.description = description;
		this.price = price;
	}

	/**
	 * Function to convert string data to properly initialized objects
	 * @param {string} key Key that identifies property to revive
	 * @param {Object} value Parsed (!!) value from JSON
	 * @returns {Object} Transformed value must be returned, otherwise property is deleted from object
	 */
	static revive(key, value) {
		if (key === 'spentOn') {
			return new Date(value);
		}
		return value;
	}
}
