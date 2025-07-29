import TableDom from '../../common/gui/tableDom.js';
import Dom from '../../common/gui/dom.js';
import icons from '../../common/gui/icons.js';
import { Category, Goal } from '../model/planningModel.js';
import Settings from '../../settings/model/settings.js';
import SettingsController from '../../settings/controller/settingsController.js';
import SubmitGoalModal from './submitGoal.js';

export default class PlanningCategoryTable extends TableDom {
	/** @type {Settings} */
	#settings = undefined;

	#editMode = false;

	#onDeletedCategoryHandler = undefined;

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

	onDeleteCategory = (handler) => {
		this.#onDeletedCategoryHandler = handler;
		return this;
	};

	refresh() {
		const visibleColumns = this.#settings.planningTableSettings().visibleColumns();

		const totalValues = {
			Name: 'Total',
			Daily: this.category.totalDaily(),
			Monthly: this.category.totalMonthly(),
			Yearly: this.category.totalYearly(),
		};

		this.id(`${this.category.id}`)
			.thead(
				new Dom('tr').append(
					// TODO Handle edit for category and add here visible columns
					new Dom('th').text(this.category.name).onKeyUp((e) => { this.category = e.currentTarget.textContent; }),
					...visibleColumns.filter((col) => col !== 'Name').map((col) => new Dom('th').text(col)),
					new Dom('th').cls('narrow-col').hideable(this.#editMode).onClick(this.#onClickedDeleteCategory).append(
						Dom.imageButton('Delete row', icons.delete),
					),
				),
			).tbody(
				...this.category.goals.map(
					(goal) => new Dom('tr').append(
						...visibleColumns.map((col) => new Dom('td').text(goal[col.toLowerCase()]).onClick(() => this.#onClickedGoal(goal))),
						new Dom('td').hideable(this.#editMode).onClick(() => this.#onClickedDeleteGoal(goal)).append(
							Dom.imageButton('Delete goal', icons.delete),
						),
					),
				),
			).tfoot(
				new Dom('tr').append(
					...visibleColumns.map((col) => new Dom('td').text(totalValues[col])),
					new Dom('td').hideable(this.#editMode).onClick(this.#onClickedAddGoal).append(
						Dom.imageButton('Add row', icons.add_row),
					),
				),
			).userData(this.category);
		return this;
	}

	#onClickedDeleteCategory = () => {
		this.#onDeletedCategoryHandler?.(this.category);
	};

	#onClickedAddGoal = () => {
		new SubmitGoalModal().insertMode().onSubmitGoal((newGoal) => {
			this.category.goals.push(newGoal);
			this.refresh();
		}).open();
	};

	/**
	 * @param {Goal} goal
	 */
	#onClickedGoal = (goal) => {
		new SubmitGoalModal().editMode(goal).onSubmitGoal((newGoal) => {
			goal.name = newGoal.name;
			goal.daily = newGoal.daily;
			goal.monthly = newGoal.monthly;
			goal.yearly = newGoal.yearly;
			this.refresh();
		}).open();
	};

	#onClickedDeleteGoal = (goal) => {
		this.category.goals.splice(this.category.goals.indexOf(goal), 1);
		this.refresh();
	};

	toEditMode() {
		this.#editMode = true;

		[...this.theadDom().toHtml().querySelectorAll('[hideable="true"]'),
			...this.tbodyDom().toHtml().querySelectorAll('[hideable="true"]'),
			...this.tfootDom().toHtml().querySelectorAll('[hideable="true"]')]
			.forEach((element) => { element.style.display = ''; });

		this.pauseSorting();
		return this;
	}

	toNormalMode() {
		[...this.theadDom().toHtml().querySelectorAll('[hideable="true"]'),
			...this.tbodyDom().toHtml().querySelectorAll('[hideable="true"]'),
			...this.tfootDom().toHtml().querySelectorAll('[hideable="true"]')]
			.forEach((element) => { element.style.display = 'none'; });

		this.resumeSorting();
		return this;
	}
}
