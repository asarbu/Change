import Spending from '../model/spending.js';
import SpendingReport from '../model/spendingReport.js';
import Planning, { Category } from '../../planning/model/planningModel.js';
import Dom from '../../common/gui/dom.js';
import icons from '../../common/gui/icons.js';
import GraphicEffects from '../../common/gui/effects.js';
import Modal from '../../common/gui/modal.js';
import SpendingNavbar from './spendingNavbar.js';
import SpendingNavbarEventHandlers from './spendingNavbarHandlers.js';
import SpendingSummaryModal from './spendingSummaryModal.js';
import SpendingSubmitModal from './spendingSubmitModal.js';
import SpendingCategoryTable from './spendingCategoryTable.js';
import Settings from '../../settings/model/settings.js';
import SettingsController from '../../settings/controller/settingsController.js';
import Utils from '../../common/utils/utils.js';

export default class SpendingScreen {
	/** @type {(spending: Spending) => any} */
	#onCreateSpendingHandler = undefined;

	#onSaveHandler = undefined;

	/** @type {Array<Category>} */
	categories = undefined;

	/** 
	 * The 0-based index of the array represents the month of the table
	 * @type {Array<SpendingCategoryTable>} 
	 */
	#drawnTables = Array(12).fill(undefined);

	/** @type {number} */
	#month = undefined;

	/** @type {number} */
	#year = undefined;

	/** @type {Settings} */
	#settings = undefined;

	/** @type {Array<Spending>} */
	#spendings = undefined;

	/** @type {Array<Category>} */
	#availableCategories = undefined;

	/**
	 * @param {number} defaultYear
	 * @param {number} defaultMonth
	 * @param {Array<SpendingReport>} spendings
	 */
	constructor(defaultYear, defaultMonth, spendings, availableCategories, settings = new SettingsController().currentSettings()) {
		this.#year = defaultYear;
		this.#month = defaultMonth;
		this.#spendings = spendings;
		this.#availableCategories = availableCategories;
		this.#settings = settings;
	}

	init() {
		let defaultReport = this.#spendings[this.#month];
		if (!defaultReport) {
			defaultReport = new SpendingReport(
				this.#year,
				this.#month,
				new Planning(this.#year, this.#month, []),
			);
			this.#spendings.push(defaultReport);
		}

		document.getElementById('main').replaceChildren();

		this.buildNavbar(defaultReport);
		const screen = this.buildScreen(defaultReport);
		this.gfx = new GraphicEffects();
		this.gfx.init(screen);
		this.gfx.onSliceChange(this.navbar.selectMonth.bind(this.navbar));
		return this;
	}

	buildNavbar() {
		const eventHandlers = new SpendingNavbarEventHandlers();
		eventHandlers.onClickAddSpending = this.#onClickAddSpending;
		eventHandlers.onClickEdit = this.onClickEdit;
		eventHandlers.onClickSave = this.#onClickedSave;
		eventHandlers.onClickSummary = this.#onClickedSummary;
		eventHandlers.onMonthChanged = this.slideToMonth.bind(this, this.#month);

		this.navbar = new SpendingNavbar(this.#year, this.#month, eventHandlers);
		const main = document.getElementById('main');
		// TODO move append children to the end of init
		main.appendChild(this.navbar.toHtml());
		this.navbar.selectMonth(this.#month);
		this.navbar.selectYear(this.#year);
	}

	/**
	 * @param {number} month
	 * @param {Array<Spending>} spendings
	 * @param {Array<string>} categories
	 */
	refreshMonth(month, spendings, categories) {
		if (!categories || categories.length === 0) {
			return;
		}

		let spendingsTable = this.#drawnTables[month];
		if (!spendingsTable) {
			spendingsTable = new SpendingCategoryTable(this.#settings.spendingTableSettings().visibleColumns());
			
			this.section.clear().append(
				new Dom('div').id(`slice_${month}`).cls('slice').userData(spendingsTable).append(
					new Dom('h1').text(`${Utils.MONTH_NAMES[month]} spending`),
				).append(spendingsTable)
			);
			this.navbar.appendMonth(month);
			this.#drawnTables[month] = spendingsTable;
		}
		spendingsTable.refresh(month, spendings, categories);
	}

	/**
	 * Appends a new year to the navbar
	 * @param {number} year Year to append to the Navbar
	 */
	updateYear(year) {
		this.navbar.appendYear(year);
	}

	/**
	 * Slides the current shown slice to the one for the month provided
	 * @param {number} month
	 */
	slideToMonth(month) {
		const sliceIndex = this.#drawnTables.filter(a => a).indexOf(this.#drawnTables[month]);
		this.gfx.slideTo(sliceIndex);
		this.#month = month;
	}

	/**
	 * Jumps to the month selected without animation
	 * @param {number} month
	 */
	jumpToMonth(month) {
		const sliceIndex = this.#drawnTables.filter(a => a).indexOf(this.#drawnTables[month]);
		this.gfx.jumpTo(sliceIndex);
		this.#month = month;
		return this;
	}

	/**
	 * @returns {HTMLElement}
	 */
	buildScreen() {
		this.section = new Dom('div').id('spendings-section').cls('section');
		this.screen = new Dom('div').cls('container').append(
			this.section,
		);

		const main = document.getElementById('main');
		main.appendChild(this.screen.toHtml());

		for(var index = 0; index < this.#spendings.length; index++) {
			this.refreshMonth(index, this.#spendings[index], this.#availableCategories[index]);
		}

		return this.screen.toHtml();
	}

	// #region event handlers

	onClickSave(handler) {
		this.#onSaveHandler = handler;
		return this;
	}

	onCreateSpending(handler) {
		this.#onCreateSpendingHandler = handler;
		return this;
	}

	onClickEdit = () => {
		// Disable sliding effects to avoid listener conflicts.
		this.gfx.pause();
		this.#drawnTables.get(this.#month).editMode();

		this.editMode = true;
	}

	#onClickedSave = () => {
		// Resume effects as there will be no listener conflicts anymore.
		this.gfx.resume();
		this.editMode = false;

		this.#onSaveHandler?.(this.#month, this.#spendings.find((report) => report.month() === this.#month));
	};

	#onClickedSummary = () => {
		const selectedSlice = this.gfx.selectedIndex();
		const spendings = this.#spendings.filter(a => a)[selectedSlice];
		new SpendingSummaryModal(spendings, this.#availableCategories.flatMap(category => category.goals())).open();
	}

	#onClickAddSpending = () => {
		const today = new Date();
		const day = today.getFullYear() === this.#year && today.getMonth() === this.#month ? today.getDate() : 1;
		new SpendingSubmitModal(this.#availableCategories[this.#month], this.#year, this.#month, day)
			.insertMode()
			.onInsertSpending((spending) => {
				this.#spendings[this.#month].push(spending);
				this.refreshMonth(this.#month, this.#spendings[this.#month], this.#availableCategories[this.#month]);
				this.#onCreateSpendingHandler?.(spending);
			}).open();
	}

	// #endregion
}
