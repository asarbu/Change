/* eslint-disable class-methods-use-this */
import Dom from '../../common/gui/dom.js';
import Planning, { Statement, Category } from '../model/planningModel.js';
import icons from '../../common/gui/icons.js';
import PlanningNavbar from './planningNavbar.js';
import Modal from '../../common/gui/modal.js';
import GraphicEffects from '../../common/gui/effects.js';
import Alert from '../../common/gui/alert.js';
import SubmitStatementModal from './submitStatementModal.js';
import Settings from '../../settings/model/settings.js';
import SettingsController from '../../settings/controller/settingsController.js';
import CategoryTable from './categoryTable.js';

export default class PlanningScreen {
	#onClickSavePlanning = undefined;

	#onInsertedStatementHandler = undefined;

	#onEditedStatementHandler = undefined;

	#onClickedDeletePlanning = undefined;

	/** @type {Map<string, CategoryTable>} */
	categoryTables = new Map();

	/** @type {Planning} */
	#defaultPlanning = undefined;

	/** @type {boolean} */
	#editMode = false;

	/** @type {GraphicEffects} */
	#gfx = undefined;

	/** @type {SubmitStatementModal} */
	#submitStatementModal = undefined;

	/** @type {Settings} */
	#settings = undefined;

	/**
	 * Constructor
	 * @param {string} year Unique identifier of the screen
	 * @param {Planning} planning Planning object to draw on the screen
	 */
	constructor(planning, settings = new SettingsController().currentSettings()) {
		if (!planning) {
			throw Error('No planning provided to draw on the screen');
		}
		this.#defaultPlanning = planning;
		this.#settings = settings;
	}

	/**
	 * Initialize the current screen
	 */
	init() {
		this.navbar = new PlanningNavbar(this.#defaultPlanning);

		this.navbar.onClickSavePlanning(this.onClickedSavePlanning.bind(this));
		this.navbar.onClickEdit(this.onClickedEdit.bind(this));
		this.navbar.onClickInsertStatement(this.#onClickedInsertStatement.bind(this));
		this.navbar.onSelectStatement(this.onSelectedStatement.bind(this));
		this.navbar.onClickDeletePlanning(this.onClickedDeletePlanning.bind(this));
		this.navbar.onClickDeleteStatement(this.onClickedDeleteStatement.bind(this));

		const mainElement = document.getElementById('main');
		mainElement.replaceChildren();
		mainElement.appendChild(this.navbar.toHtml());
		this.navbar.selectYear(this.#defaultPlanning.year);
		this.containerHtml = this.buildContainerDom(this.#defaultPlanning).toHtml();
		mainElement.appendChild(this.containerHtml);
		this.navbar.init();

		this.buildSubmitStatementModal();
		this.#gfx = new GraphicEffects();
		this.#gfx.onSliceChange(this.onChangedStatementIndex.bind(this));
		this.#gfx.init(this.containerHtml);
	}

	// #region DOM update
	appendYear(year) {
		this.navbar.appendYear(year);
		this.navbar.updateYearDropupText();
	}

	appendMonth(month) {
		this.navbar.appendMonth(month);
		this.navbar.updateMonthDropupText();
	}
	// #endregion

	// #region DOM creation

	/**
	 * Creates all necessary objects needed to draw current screen
	 * @param {Planning} planning
	 * @returns {Dom}
	 */
	buildContainerDom(planning) {
		const addStatement = () => {
			this.navbar.onClickedEdit();
			this.navbar.clickInsertStatement();
		};
		const container = new Dom('div').id(planning.year).cls('container');
		const section =	new Dom('div').cls('section');
		if (planning.statements.length === 0) {
			section.append(
				new Dom('div').cls('slice').append(
					new Dom('h1').text('No statements available'),
					new Dom('h2').append(
						new Dom('span').text('You need a statement to define categories of goals. A statement groups together goal categories by type (income, expenses, savings). You can have multiple statements of the same type.'),
					),
					new Dom('h2').append(
						new Dom('span').text('Click '),
						new Dom('a').text('"Add statement"').attr('href', '#').onClick(addStatement),
						new Dom('span').text(' to add a new Expense/Income/Savings statement.'),
					),
				),
			);
		} else {
			planning.statements
				.map(this.#buildStatementDom.bind(this))
				.reduce((dom, statement) => dom.append(statement), section);
		}

		container.append(section);
		return container;
	}

	/**
	 * Creates a DOM statement
	 * @param {Statement} statement Statement representing this slice
	 * @returns {Dom | undefined} Constructed and decorated DOM element
	 */
	#buildStatementDom(statement) {
		if (!statement) return undefined;

		const onKeyUp = this.onKeyUpStatementName.bind(this);
		const onClickAddCategory = this.onClickedAddCategory.bind(this, statement);
		const slice = new Dom('div').id(statement.id).cls('slice').userData(statement).append(
			new Dom('h1').text(statement.name).onKeyUp(onKeyUp).onClick(this.#onClickedEditStatement.bind(this)),
			new Dom('h2').text(`${statement.type} `).hideable(this.#editMode).onClick(this.#onClickedEditStatement.bind(this)),
			new Dom('h3').text('Remember to save any changes before exiting.').hideable(this.#editMode),
			...statement.categories.map(this.buildCategory),
			Dom.imageButton('Add Category', icons.add_table).hideable(this.#editMode).onClick(onClickAddCategory),
		);

		return slice;
	}

	/**
	 * Creates a Dom array containing all of the tables constructed from the categories.
	 * Only visible columns are rendered, based on settings.
	 * @param {Array<Category>} planningCategories Categories to draw inside parent statement
	 * @returns {Array<Dom>} Document fragment with all of the created tables
	 */
	buildCategory(category) {
		const table = new CategoryTable(category).buildTable();
		this.categoryTables.set(category.id, table);
	}

	// #endregion

	// #region DOM manipulation

	/** Refresh screen */
	refresh(planning) {
		this.#defaultPlanning = planning;

		const container = this.buildContainerDom(planning).toHtml();
		this.containerHtml.parentElement.replaceChild(container, this.containerHtml);
		this.containerHtml = container;
		// Screen changed, effects need reinitialization
		if (this.#gfx) {
			if (container) this.#gfx.init(container);
		}
		if (this.#defaultPlanning.statements.length === 0) {
			// TODO Add empty statement tutorial DOM
		}
		this.navbar.refresh(this.#defaultPlanning);
	}

	/**
	 * @param {Statement} statement
	 */
	refreshStatement(statement) {
		const statementHtml = document.getElementById(statement.id);
		const statementDom = this.#buildStatementDom(statement);
		const { scrollTop } = statementHtml;
		statementHtml.parentElement.replaceChild(statementDom.toHtml(), statementHtml);
		statementDom.toHtml().scrollTop = scrollTop;
	}

	/**
	 * @param {Category} category
	 */
	refreshCategory(category) {
		const categoryHtml = document.getElementById(`${category.id}`);
		const categoryDom = this.#buildStatementDom(category);
		const { scrollTop } = categoryHtml;
		categoryHtml.parentElement.replaceChild(categoryDom.toHtml(), categoryHtml);
		categoryDom.toHtml().scrollTop = scrollTop;
	}

	onClickedAddCategory(statement) {
		const id = new Date().getTime();
		const category = new Category(id, 'New Category');
		statement.categories.push(category);
		this.refreshStatement(statement);
	}

	// #endregion

	// #region event handlers
	// #region planning event handlers
	onDeletePlanning(handler) {
		this.#onClickedDeletePlanning = handler;
	}

	onClickedDeletePlanning(planning) {
		if (this.#onClickedDeletePlanning) {
			return Modal.areYouSureModal(
				'are-you-sure-delete-planning',
				'Are you sure you want to delete planning?',
				this.#onClickedDeletePlanning.bind(this, planning),
			).open();
		}
		return undefined;
	}

	onClickSavePlanning(handler) {
		this.#onClickSavePlanning = handler;
	}
	// #endregion

	// #region statement event handlers

	/**
	 * @param {Statement} statement
	 */
	onSelectedStatement(statement) {
		const index = this.#defaultPlanning.statements
			.findIndex((stmt) => stmt.name === statement.name);
		if (index >= 0) {
			this.#gfx.jumpTo(index);
		} else {
			Alert.show('Statement not found', `Statement ${statement.name} not found in planning`);
		}
	}

	onChangedStatementIndex(index) {
		const statement = this.#defaultPlanning.statements[index];
		this.navbar.onChangedStatement(statement);
	}

	onClickedDeleteStatement() {
		if (this.#defaultPlanning.statements.length === 0) return;

		const index = this.#gfx.selectedIndex();
		this.#defaultPlanning.statements.splice(index, 1);
		this.refresh(this.#defaultPlanning);
		// Next available index after deletion
		const selectIndex = Math.min(this.#defaultPlanning.statements.length, Math.max(index - 1, 0));
		this.#gfx.jumpTo(selectIndex);
	}

	onInsertedStatement(statement) {
		this.#defaultPlanning.statements.push(statement);
		this.refresh(this.#defaultPlanning);
		this.navbar.onSelectedStatement(statement);
		return this.#onInsertedStatementHandler?.(statement);
	}

	onEditStatement(handler) {
		this.#onEditedStatementHandler = handler;
	}

	#onClickedEditStatement() {
		if (this.#editMode) {
			const editedStatement = this.#gfx.selectedSlice().userData;
			this.#submitStatementModal.editMode(editedStatement).open();
		}
	}

	onClickedEdit() {
		// Disable sliding effects to avoid listener conflicts.
		this.#gfx.pause();

		this.categoryTables.forEach((categoryTable) => {
			categoryTable.toEditMode();
		});

		this.#editMode = true;
	}

	/**
	 * @param {Planning} forPlanning
	 */
	onClickedSavePlanning(forPlanning) {
		// Resume effects as there will be no listener conflicts anymore.
		this.#gfx.resume();

		this.categoryTables.forEach((categoryTable) => {
			categoryTable.toNormalMode();
		});

		this.#editMode = false;

		if (this.#onClickSavePlanning) {
			const planning = forPlanning || this.#defaultPlanning;
			return this.#onClickSavePlanning(planning);
		}
		return undefined;
	}

	onKeyUpStatementName(event) {
		const statementName = event.currentTarget.textContent;
		const statement = event.currentTarget.parentNode.userData;
		statement.name = statementName;
	}
	// #endregion

	// #region Submit Statement Modal

	buildSubmitStatementModal() {
		this.#submitStatementModal = new SubmitStatementModal();

		this.#submitStatementModal.onInsertStatement(this.#onInsertedStatement.bind(this));
		this.#submitStatementModal.onEditStatement(this.#onEditedStatement.bind(this));

		return this.#submitStatementModal;
	}

	/**
	 * @param {(newStatement: Statement) => void} handler
	 */
	onInsertStatement(handler) {
		this.#onInsertedStatementHandler = handler;
	}

	#onInsertedStatement(statement) {
		this.#onInsertedStatementHandler?.(statement);
	}

	#onEditedStatement(editedStatement) {
		this.#onEditedStatementHandler?.(editedStatement);
	}

	#onClickedInsertStatement() {
		this.#submitStatementModal.insertMode().open();
	}
	// #endregion
}
