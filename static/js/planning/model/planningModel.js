// Too much overhead to split the planning model into individual files
// eslint-disable-next-line max-classes-per-file
export class Goal {
	/**
	 * @param {Object} goal - Unit to store in object.
	 * @param {string} goal.name - The name of the goal.
	 * @param {number} goal.daily - Daily amount to put aside for the goal
	 * @param {number} goal.monthly - Monthly amount to put aside for the goal
	 * @param {number} goal.yearly - Yearly amount to put aside for the goal
	 */
	constructor(name, daily, monthly, yearly) {
		/**
		 * @type {number}
		 */
		this.name = name;
		/**
		 * @type {number}
		 */
		this.daily = daily;
		/**
		 * @type {number}
		 */
		this.monthly = monthly;
		/**
		 * @type {number}
		 */
		this.yearly = yearly;
	}

	static fromJavascriptObject(object) {
		return new Goal(object.name, object.daily, object.monthly, object.yearly);
	}

	static fromDailyAmount(withName, withAmount) {
		return new Goal(withName, withAmount, withAmount * 30, withAmount * 365);
	}

	static fromMonthlyAmount(withName, withAmount) {
		return new Goal(withName, withAmount / 30, withAmount, withAmount * 12);
	}

	static fromYearlyAmount(withName, withAmount) {
		return new Goal(withName, withAmount / 365, withAmount / 12, withAmount);
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
		 * @type {string}
		 */
		this.id = id;
		/**
		 * @type {string}
		 */
		this.name = name;
		/**
		 * @type {Array<Goal>}
		 */
		this.goals = goals;
	}

	totalDaily() {
		return this.goals.reduce((acc, curr) => acc + curr.daily, 0);
	}

	totalMonthly() {
		return this.goals.reduce((acc, curr) => acc + curr.monthly, 0);
	}

	totalYearly() {
		return this.goals.reduce((acc, curr) => acc + curr.yearly, 0);
	}

	static fromJavascriptObject(object) {
		const category = new Category(object.id, object.name);
		if (object.goals) {
			object.goals.forEach((goal) => {
				category.goals.push(Goal.fromJavascriptObject(goal));
			});
		}
		return category;
	}
}

export class StatementType {
	static INCOME = 'Income';

	static EXPENSE = 'Expense';

	static SAVING = 'Saving';
}

/**
 * @class
 */
export class Statement {
	// TODO replace this with above
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
		 * @type {number}
		 */
		this.id = id;
		/**
		 * @type {string}
		 */
		this.name = name;
		/**
		 * @type {string}
		 */
		this.type = type;
		/**
		 * @type {Array<Category>}
		 */
		this.categories = categories;
	}

	static fromJavascriptObject(object) {
		const statement = new Statement(object.id, object.name, object.type);
		if (object.categories) {
			object.categories.forEach(
				(category) => statement.categories.push(Category.fromJavascriptObject(category)),
			);
		}
		return statement;
	}
}

export default class Planning {
	/** @type {Array<Statement>} */
	statements = [];

	/**
	 * @constructs Planning
	 * @param {number} year
	 * @param {number} month
	 * @param {Array<Statement>} statements
	 */
	constructor(id, year, month, statements = []) {
		this.id = id;
		this.year = year;
		this.month = month;
		this.statements = statements;
	}

	static fromJavascriptObject(object) {
		const planning = new Planning(object.id, object.year, object.month);
		if (object.statements) {
			object.statements.forEach((statement) => {
				planning.statements.push(Statement.fromJavascriptObject(statement));
			});
		}
		return planning;
	}

	/**
	 * Fetch only the categories of type "Expense"
	 * @returns {Array<Category>}
	 */
	readCategories(forStatementType = Statement.EXPENSE) {
		/** @type {Array<Planning>} */
		const expenseStatements = this.statements
			.filter((statement) => statement.type === forStatementType);
		return expenseStatements
			.reduce((categories, statement) => categories.concat(...statement.categories), []);
	}

	readAllCategories() {
		return this.statements.flatMap((statement) => statement.categories);
	}

	readGoals(forStatementType = Statement.EXPENSE) {
		const categories = this.readCategories(forStatementType);
		return categories.reduce((accumulator, current) => accumulator.concat(current.goals), []);
	}
}
