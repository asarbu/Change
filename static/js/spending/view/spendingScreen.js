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

export default class SpendingScreen {
	/** @type {(spending: Spending) => any} */
	onCreateSpendingCallback = undefined;

	onSaveReportCallback = undefined;

	onDeleteReportCallback = undefined;

	/** @type {Array<Category>} */
	categories = undefined;

	/** @type {Map<number, SpendingCategoryTable>} */
	#drawnMonths = new Map();

	/** @type {number} */
	#month = undefined;

	/** @type {number} */
	#year = undefined;

	/** @type {Settings} */
	#settings = undefined;

	/**
	 * @param {number} defaultYear
	 * @param {number} defaultMonth
	 * @param {Array<SpendingReport>} spendingReports
	 */
	constructor(defaultYear, defaultMonth, spendingReports, settings = new SettingsController().currentSettings()) {
		this.#year = defaultYear;
		this.#month = defaultMonth;
		this.spendingReports = spendingReports;
		this.#settings = settings;
	}

	init() {
		let defaultReport = this.spendingReports[this.#month];
		if (!defaultReport) {
			defaultReport = new SpendingReport(
				this.#year,
				this.#month,
				new Planning(this.#year, this.#month, []),
			);
			this.spendingReports.push(defaultReport);
		}

		document.getElementById('main').replaceChildren();

		this.buildNavbar(defaultReport);
		const screen = this.buildScreen(defaultReport);
		this.gfx = new GraphicEffects();
		this.gfx.init(screen);
		this.gfx.onSliceChange(this.navbar.selectMonth.bind(this.navbar));

		this.spendingReports.sort((a, b) => a.month() - b.month()).forEach((spendingReport) => this.refreshMonth(spendingReport));
	}

	/**
	 * 
	 * @param {SpendingReport} spendingReport 
	 */
	buildNavbar(spendingReport) {
		const eventHandlers = new SpendingNavbarEventHandlers();
		eventHandlers.onClickAddSpending = this.onClickAddSpending;
		eventHandlers.onClickEdit = this.onClickEdit;
		eventHandlers.onClickSave = this.onClickedSave;
		eventHandlers.onClickSummary = this.onClickedSummary;
		eventHandlers.onMonthChanged = this.slideToMonth.bind(this, spendingReport.month());

		this.navbar = new SpendingNavbar(this.#year, spendingReport.month(), eventHandlers);
		const main = document.getElementById('main');
		// TODO move append children to the end of init
		main.appendChild(this.navbar.toHtml());
		this.navbar.selectMonth(this.#month);
		this.navbar.selectYear(this.#year);
	}

	/**
	 * @param {SpendingReport} spendingReport
	 */
	refreshMonth(spendingReport) {
		let spendingsTable = this.#drawnMonths.get(spendingReport.month());
		if (!spendingsTable) {
			spendingsTable = new SpendingCategoryTable(spendingReport.toString(), spendingReport.spendings(), this.categories, this.#settings.spendingTableSettings().visibleColumns());

			this.section.clear().append(
				new Dom('div').id(`slice_${spendingReport.month()}`).cls('slice').userData(spendingReport).append(
					new Dom('h1').text(`${spendingReport} spending`),
				).append(spendingsTable)
			);
			this.navbar.appendMonth(spendingReport.month());
			this.#drawnMonths.set(spendingReport.month(), spendingsTable);
		}
		spendingsTable.refresh();
		// Screen changed, effects need reinitialization
		//this.gfx.init(this.screen.toHtml());
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
		const reportSlice = this.#drawnMonths.get(month);
		const sliceIndex = Array.prototype.indexOf.call(
			this.section.toHtml().childNodes,
			reportSlice.toHtml(),
		);
		this.gfx.slideTo(sliceIndex);
	}

	/**
	 * Jumps to the month selected without animation
	 * @param {number} month
	 */
	jumpToMonth(month) {
		const sliceIndex = Array.from(this.#drawnMonths.keys()).sort((a, b) => a - b).indexOf(month);
		this.gfx.jumpTo(sliceIndex);
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

		return this.screen.toHtml();
	}

	// #region event handlers
	onInsertedSpending(newSpending) {
		if (this.onCreateSpendingCallback) {
			this.onCreateSpendingCallback(newSpending);
		}
	}

	onClickDeleteSlice(event) {
		if (!this.editMode) return;

		const table = (event.currentTarget.parentNode.parentNode.parentNode.parentNode);
		const spendingReport = table.userData;

		Modal.areYouSureModal(
			'delete-report-modal',
			'Are you sure you want to delete this report?',
			() => {
				if (this.onDeleteReportCallback) {
					this.onDeleteReportCallback(spendingReport);
				}
				table.parentNode.removeChild(table);
			},
		).open();
	}

	onEditedSpending(spending) {
		const row = document.getElementById(spending.id);
		// TODO Extract slice to its own class and get user data directly from it according to month
		const spendingReport = row.parentNode.parentNode.userData;
		this.refreshMonth(spendingReport);
	}

	onClickEdit = () => {
		// Disable sliding effects to avoid listener conflicts.
		this.gfx.pause();
		this.#drawnMonths.get(this.#month).editMode();

		this.editMode = true;
	}

	onClickedSave = () => {
		// Resume effects as there will be no listener conflicts anymore.
		this.gfx.resume();
		this.editMode = false;

		this.#drawnMonths.forEach((slice) => {
			/** @type {SpendingReport} */
			const spendingReport = slice.toHtml().userData;
			if (spendingReport) {
				const reportChanged = spendingReport.applyChanges();
				// Do not call the handler if the report did not change
				if (this.onSaveReportCallback && reportChanged) {
					slice.toHtml().getElementsByTagName('table')[0].tFoot.replaceChildren(
						this.buildTotalRow(spendingReport.totalAsSpending()).toHtml(),
					);
					this.onSaveReportCallback(spendingReport);
				}
			}
		});
	}

	onClickedSummary = () => {
		const selectedSlice = this.gfx.selectedSlice();
		new SpendingSummaryModal(selectedSlice.userData).open();
	}

	onClickAddSpending = () => {
		new SpendingSubmitModal(this.categories.planningCategories()).insertMode().open();
	}

	// #endregion
}
