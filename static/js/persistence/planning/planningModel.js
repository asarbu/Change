// Too much overhead to split the planning model into individual files
// eslint-disable-next-line max-classes-per-file
export default class Planning {
	/**
	 * @constructs Planning
	 * @param {number} year
	 */
	constructor(year) {
		this.year = year;
		/**
		 * @type{Array<Statement>}
		 */
		this.statements = [];
	}
}

/**
 * @class
 */
export class Statement {
	static INCOME = 'Income';

	static EXPENSE = 'Expense';

	static SAVING = 'Saving';

	/**
	 *
	 * @param {string} id Unique identifier of the statement
	 * @param {string} name User friendly name of statement
	 * @param {String} type Statically defined statement type
	 */
	constructor(id, name, type) {
		/**
		 * @type{number}
		 */
		this.id = id;
		/**
		 * @type{string}
		 */
		this.name = name;
		/**
		 * @type{string}
		 */
		this.type = type;
		/**
		 * @type{Array<PlanningCategory>}
		 */
		this.categories = [];
	}
}

export class Category {
	/**
	 *
	 * @param {string} id
	 * @param {string} name
	 */
	constructor(id, name) {
		/**
		 * @type{string}
		 */
		this.id = id;
		/**
		 * @type{string}
		 */
		this.name = name;
		/**
		 * @type{Array<Goal>}
		 */
		this.goals = [];
	}
}

export class Goal {
	/**
	 * @param {Object} goal - Unit to store in object.
	 * @param {string} goal.name - The name of the goal.
	 * @param {number} goal.daily - Daily amount to put aside for the goal
	 * @param {number} goal.monthly - Monthly amount to put aside for the goal
	 * @param {number} goal.yearly - Yearly amount to put aside for the goal
	 */
	constructor(
		name,
		daily,
		monthly,
		yearly,
	) {
		/**
		 * @type{string}
		 */
		this.name = name;
		/**
		 * @type{integer}
		 */
		this.daily = daily;
		/**
		 * @type{integer}
		 */
		this.monthly = monthly;
		/**
		 * @type{integer}
		 */
		this.yearly = yearly;
	}
}
