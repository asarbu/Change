import Alert from '../../common/gui/alert.js';
import Dom from '../../common/gui/dom.js';
import Modal from '../../common/gui/modal.js';
import SpendingReport from '../model/spendingReport.js';

export default class SpendingSummaryModal extends Modal {
	/** @type {Dom} */
	#modalDom = undefined;

	/** @type {SpendingReport} */
	#spendingReport = undefined;

	/**
	 * @param {SpendingReport} spendingReport
	 */
	constructor(spendingReport) {
		super(spendingReport.id());
		this.#spendingReport = spendingReport;
		this.build(this.#spendingReport);
	}

	/**
	 * @param {SpendingReport} spendingReport
	 */
	build(spendingReport) {
		// TODO. Build summary modal according to currently clicked month
		const spentGoalsName = spendingReport.spentGoals();
		const goals = spendingReport.plannedGoals();
		const budgetTotal = goals.reduce((accumulator, current) => accumulator + current.monthly, 0);
		const spendingTotal = spendingReport.total();

		this.header(
			new Dom('h2').text('Expenses summary'),
		).body(
			new Dom('table').id(`summary-table-${spendingReport}`).append(
				new Dom('thead').append(
					new Dom('tr').append(
						new Dom('th').text('Category'),
						new Dom('th').cls('normal-col').text('Spending'),
						new Dom('th').cls('normal-col').text('Budget'),
						new Dom('th').cls('normal-col').text('Percent'),
					),
				),
				new Dom('tbody').append(
					...spentGoalsName.map((goalName) => this.#buildRowForGoal(goalName)),
				),
				new Dom('tfoot').append(
					new Dom('tr').append(
						new Dom('td').text('Total'),
						new Dom('td').text(spendingTotal),
						new Dom('td').text(budgetTotal),
						new Dom('td').text(((100 * spendingTotal) / budgetTotal).toFixed(2)),
					),
				),
			),
		).addCancelFooter();
	}

	#buildRowForGoal(goalName) {
		const spentForGoal = this.#spendingReport.totalForGoal(goalName).toFixed(2);
		const plannedGoals = this.#spendingReport.plannedGoals();
		const foundGoal = plannedGoals.find((plannedGoal) => plannedGoal.name === goalName);
		let budgetForGoal = 1;
		if (!foundGoal) {
			Alert.show('Planning error', `Goal not found in planning: ${goalName}`);
		} else {
			budgetForGoal = foundGoal.monthly;
		}
		return new Dom('tr').append(
			new Dom('td').text(goalName),
			new Dom('td').text(spentForGoal),
			new Dom('td').text(budgetForGoal),
			new Dom('td').text(((100 * spentForGoal) / budgetForGoal).toFixed(2)),
		);
	}
}
