import TableDom from '../../common/gui/tableDom.js';
import Dom from '../../common/gui/dom.js';
import icons from '../../common/gui/icons.js';
import { Category, Goal } from '../model/planningModel.js';
import Settings from '../../settings/model/settings.js';
import SettingsController from '../../settings/controller/settingsController.js';

export default class CategoryTable extends TableDom {
	/** @type {Settings} */
	#settings = undefined;

	/** @type {Object<string, Goal>}} */
	#goals = undefined;

	#editMode = false;

	/**
	 * @param {Category} category
	 * @param {Settings} settings
	 * @param {*} options
	 */
	constructor(category, settings = new SettingsController().currentSettings(), options = {}) {
		super();
		this.category = category;
		this.#settings = settings;
		this.editMode = options.editMode || false;
	}

	buildTable() {
		const visibleColumns = this.#settings.planningTableSettings().visibleColumns();

		const tableHeadRow = [
			new Dom('th').text(this.category.name).editable().contentEditable(false).onKeyUp((e) => { this.category = e.currentTarget.textContent; }),
			...visibleColumns.filter((col) => col !== 'Name').map((col) => new Dom('th').text(col)),
			new Dom('th').cls('narrow-col').hideable(this.#editMode).onClick(this.#onClickedDeleteCategory).append(
				Dom.imageButton('Delete row', icons.delete),
			),
		];

		const tableBodyRows = this.category.goals.map((goal) => new Dom('tr').id(`Goal_${goal.id}`).userData(goal).append(
			...visibleColumns.map((col) => new Dom('td').text(goal[col.toLowerCase()]).editable().onKeyUp(this.#onKeyUpGoal.bind(col))),
			new Dom('td').hideable(this.#editMode).onClick(this.onClickedDeleteGoal).append(
				Dom.imageButton('Delete goal', icons.delete),
			),
		));

		this.id(`${this.category.id}`)
			.thead(new Dom('tr').append(...tableHeadRow))
			.tbody(...tableBodyRows)
			.tfoot(this.totalsRow())
			.userData(this.category);

		return this;
	}

	totalsRow() {
		const visibleColumns = this.#settings.planningTableSettings().visibleColumns();
		const totalValues = {
			Daily: this.category.totalDaily(),
			Monthly: this.category.totalMonthly(),
			Yearly: this.category.totalYearly(),
		};
		return new Dom('tr').append(
			new Dom('td').text('Total'),
			...visibleColumns.filter((col) => col !== 'Name').map((col) => new Dom('td').text(totalValues[col])),
			new Dom('td').hideable(this.#editMode).onClick(this.#onClickedAddGoal).append(
				Dom.imageButton('Add row', icons.add_row),
			),
		);
	}

	#onKeyUpCategoryName(category, event) {
		const categoryName = event.currentTarget.textContent;
		category.name = categoryName;
	}

	#onClickedDeleteCategory(event) {
		const table = event.currentTarget.parentNode.parentNode.parentNode;
		const category = table.userData;
		const statement = table.parentNode.userData;
		statement.categories.splice(statement.categories.indexOf(category), 1);
		table.parentNode.removeChild(table);
	}

	#onClickedAddGoal(event) {
		const btn = event.currentTarget;
		const category = btn.parentNode.parentNode.parentNode.userData;
		const goal = new Goal('New Goal', 0, 0, 0);
		category.goals.push(goal);
		const goalDom = this.buildGoalRow(goal, category, this.toEditMode);
		const categoryTbody = this.tbodyDom().toHtml();
		const lastIndex = categoryTbody.children.length - 1;
		categoryTbody.insertBefore(goalDom.toHtml(), categoryTbody.children[lastIndex]);
	}

	#onKeyUpGoal = (propertyName, event) => {
		const cell = event.currentTarget;
		const row = cell.parentNode;
		const goal = row.userData;
		const { textContent } = cell;
		const parsedContent = Number.parseInt(textContent, 10);
		goal[propertyName] = Number.isNaN(parsedContent)
			? textContent
			: parsedContent;
		this.#settings.planningTableSettings().visibleColumns().forEach((col, index) => {
			cell.parentNode.cells[index] = goal[col];
		});
		this.tfoot(this.totalsRow());
	};

	onClickedDeleteGoal(event) {
		const row = event.currentTarget.parentNode;
		const tBody = row.parentNode;
		const goal = row.userData;
		const category = row.parentNode.parentNode.userData;
		category.goals.splice(category.goals.indexOf(goal), 1);
		tBody.removeChild(row);
		this.tfoot(this.totalsRow());
	}

	// Helper for building a goal row (used in add goal handler)
	buildGoalRow(goal, editMode) {
		const visibleColumns = this.#settings.planningTableSettings().visibleColumns();

		return new Dom('tr').id(`Goal_${goal.id}`).userData(goal).append(
			...visibleColumns
				.map((col) => CategoryTable.columnRenderers[col]?.(goal, editMode, this.#onKeyUpGoal)),
			new Dom('td').hideable(this.#editMode).onClick(this.onClickedDeleteGoal).append(
				Dom.imageButton('Delete goal', icons.delete),
			),
		);
	}

	toEditMode() {
		this.#editMode = true;
		// TODO Remove editable content. Replace with modals
		[...this.theadDom().toHtml().querySelectorAll('[editable="true"]'),
			...this.tbodyDom().toHtml().querySelectorAll('[editable="true"]'),
			...this.tfootDom().toHtml().querySelectorAll('[editable="true"]')]
			.forEach((tableDef) => { tableDef.contentEditable = 'true'; });

		[...this.theadDom().toHtml().querySelectorAll('[hideable="true"]'),
			...this.tbodyDom().toHtml().querySelectorAll('[hideable="true"]'),
			...this.tfootDom().toHtml().querySelectorAll('[hideable="true"]')]
			.forEach((element) => { element.style.display = ''; });

		this.pauseSorting();
		return this;
	}

	toNormalMode() {
		this.#editMode = false;
		const editableElmts = document.querySelectorAll('[editable="true"]');
		for (let i = 0; i < editableElmts.length; i += 1) {
			editableElmts[i].contentEditable = 'false';
		}

		const hideableElmts = document.querySelectorAll('[hideable="true"]');
		for (let i = 0; i < hideableElmts.length; i += 1) {
			hideableElmts[i].style.display = 'none';
		}

		this.resumeSorting();
		return this;
	}
}
