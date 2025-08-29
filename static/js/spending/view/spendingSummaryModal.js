import Alert from '../../common/gui/alert.js';
import Dom from '../../common/gui/dom.js';
import Modal from '../../common/gui/modal.js';
import TableDom from '../../common/gui/tableDom.js';
import { Category, Goal } from '../../planning/model/planningModel.js';
import Spending from '../model/spending.js';

export default class SpendingSummaryModal extends Modal {
	/** @type {Spending[]} */
	#spendings = undefined;

	/** @type {Goal[]} */
	#goals = undefined;

	/**
	 * @param {Spending[]} spendings
	 * @param {Goal[]} goals
	 */
	constructor(spendings, goals) {
		super('expenses_summary');
		this.#spendings = spendings;
		this.#goals = goals;
		
		// TODO There is a mismatch of concepts here. From spending we get categories, but they should be named goals
		const totals = new Map();
		const spentGoalNames = new Set(spendings.map(spending => spending.category));
		spentGoalNames.forEach((spentGoalName) => totals.set(spentGoalName, goals.filter((goal) => goal.name === spentGoalName).reduce((acc, curr) => acc + curr.monthly, 0)));

		const spendingTotal = 0;
		const budgetTotal = 0;

		this.header(
			new Dom('h2').text('Expenses summary'),
		).body(
			new TableDom().id(`summary-table-${spendingReport}`)
				.thead(
					new Dom('tr').append(
						new Dom('th').text('Category'),
						new Dom('th').cls('normal-col').text('Spending'),
						new Dom('th').cls('normal-col').text('Budget'),
						new Dom('th').cls('normal-col').text('Percent'),
					),
				)
				.tbody(
					...spentGoalNames.map((goalName) => {
						const spentForGoal = spendings.filter((spending) => spending.category === goalName).reduce((acc, curr) => acc + curr.amount, 0);
						spendingTotal += spentForGoal;
						const budgetForGoal = goals.find((goal) => goal.name === goalName)?.monthly || 0;
						budgetTotal += budgetForGoal;

						return new Dom('tr').append(
							new Dom('td').text(goalName),
							new Dom('td').text(spentForGoal),
							new Dom('td').text(budgetForGoal),
							new Dom('td').text(((100 * spentForGoal) / budgetForGoal).toFixed(2)),
						);
					}),
				)
				.tfoot(
					new Dom('tr').append(
						new Dom('td').text('Total'),
						new Dom('td').text(spendingTotal),
						new Dom('td').text(budgetTotal),
						new Dom('td').text(((100 * spendingTotal) / budgetTotal).toFixed(2)),
					),
				),
		).addCancelFooter();
	}
}
