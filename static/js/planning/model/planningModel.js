// Too much overhead to split the planning model into individual files
// eslint-disable-next-line max-classes-per-file
export default class Planning {
	/** @type {Array<Statement>} */
	statements = [];

	/**
	 * @constructs Planning
	 * @param {number} year
	 * @param {number} month
	 * @param {Array<Statement>} statements
	 */
	constructor(id, year, month, statements) {
		this.id = id;
		this.year = year;
		this.month = month;
		if (statements) {
			this.statements = statements;
		}
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
	 * @param {Array<Category>} categories categories associated with this statement
	 */
	constructor(id, name, type, categories = []) {
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
		this.categories = categories;
	}
}

export class Category {
	/**
	 *
	 * @param {string} id
	 * @param {string} name
	 * @param {Array<Goal>} goals 
	 */
	constructor(id, name, goals = []) {
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
		this.goals = goals;
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
