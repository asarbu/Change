import { Goal } from "../../../static/js/planning/model/planningModel";
import PlanningCategoryTable from "../../../static/js/planning/view/planningCategoryTable";

export default class PlanningCategoryTableFake extends PlanningCategoryTable {
	constructor(category, visibleColumns) {
        super(category, visibleColumns);
    }

    /**
	 * Clicks the goal in the table.
	 * @param {Goal} goal
	 * @returns {SubmitGoalModal|undefined} The modal opened for editing the goal, or undefined if not in edit mode.
	 */
	clickGoalName(goal) {
		// search in the table the row with the name of the goal and click it
		const tds = this.tbodyDom().toHtml().querySelectorAll('td');
		const td = [...tds].find(td => td.textContent === goal.name);
		return td?.onclick();
	}

	/**
	 * Clicks the "Add Goal" button in the table.
	 * @returns {SubmitGoalModal} The modal opened for adding a new goal.
	 */
	clickAddGoal() {
		return this.tfootDom().toHtml().querySelectorAll('td')?.[this.tbodyDom().toHtml().querySelectorAll('td').length - 1]?.onclick();
	}
}