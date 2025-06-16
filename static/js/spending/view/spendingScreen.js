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

export default class SpendingScreen {
	/** @type {(spending: Spending) => any} */
	onCreateSpendingCallback = undefined;

	onSaveReportCallback = undefined;

	onDeleteReportCallback = undefined;

	/** @type {Array<Category>} */
	categories = undefined;

	/** @type {Map<number, Dom} */
	#drawnSlices = new Map();

	/** @type {SpendingSubmitModal} */
	#spendingSubmitModal = undefined;

	/** @type {Modal} */
	#categoryModal = undefined;

	/** @type {number} */
	#month = undefined;

	/** @type {number} */
	#year = undefined;

	/**
	 * @param {number} defaultYear
	 * @param {number} defaultMonth
	 * @param {Array<SpendingReport>} spendingReports
	 */
	constructor(defaultYear, defaultMonth, spendingReports) {
		this.#year = defaultYear;
		this.#month = defaultMonth;
		this.spendingReports = spendingReports;
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
		this.buildSubmitSpendingModal(defaultReport.plannedCategories());
		const screen = this.buildScreen(defaultReport);
		this.gfx = new GraphicEffects();
		this.gfx.init(screen);
		this.gfx.onSliceChange(this.navbar.selectMonth.bind(this.navbar));

		this.spendingReports.forEach((spendingReport) => this.refreshMonth(spendingReport));
	}

	buildNavbar(spendingReport) {
		const eventHandlers = new SpendingNavbarEventHandlers();
		eventHandlers.onClickAddSpending = this.onClickAddSpending.bind(this);
		eventHandlers.onClickEdit = this.onClickEdit.bind(this);
		eventHandlers.onClickSave = this.onClickedSave.bind(this);
		eventHandlers.onClickSummary = this.onClickedSummary.bind(this);
		eventHandlers.onMonthChanged = this.slideToMonth.bind(this);

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
		let reportSlice = this.#drawnSlices.get(spendingReport.month());
		const sliceId = `slice_${spendingReport.month()}`;
		if (!reportSlice) {
			reportSlice = new Dom('div').id(sliceId).cls('slice').userData(spendingReport).append(
				new Dom('h1').text(`${spendingReport} spending`),
			);

			// Insert the slice in calendaristic order
			const sectionHtml = this.section.toHtml();
			const slices = Array.from(sectionHtml.children);
			const insertIndex = slices.findIndex(
				(slice) => slice.userData && slice.userData.month() > spendingReport.month(),
			);
			if (insertIndex === -1) {
				this.section.append(reportSlice);
			} else {
				sectionHtml.insertBefore(reportSlice.toHtml(), slices[insertIndex]);
			}

			this.navbar.appendMonth(spendingReport.month());
			// Screen changed, effects need reinitialization
			this.gfx.init(this.screen.toHtml());
		} else {
			const sliceTable = document.getElementById(`table-${spendingReport.month()}`);
			reportSlice.toHtml().removeChild(sliceTable);
		}

		reportSlice.append(
			this.buildTable(spendingReport),
		);

		this.#drawnSlices.set(spendingReport.month(), reportSlice);
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
		const reportSlice = this.#drawnSlices.get(month);
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
		const reportSlice = this.#drawnSlices.get(month);
		const sliceIndex = Array.prototype.indexOf.call(
			this.section.toHtml().childNodes,
			reportSlice.toHtml(),
		);
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
		// main.appendChild(this.buildTable(spendingReport).toHtml());

		return this.screen.toHtml();
	}

	/**
	 * Builds the {Dom} object associated with this report
	 * @param {SpendingReport} spendingReport
	 * @returns {Dom}
	 */
	buildTable(spendingReport) {
		const onClickDelete = this.onClickDeleteSlice.bind(this);
		const buildSpendingRow = this.buildSpendingRow.bind(this);
		const spendingsDom = new Dom('table').id(`table-${spendingReport.month()}`).append(
			new Dom('thead').append(
				new Dom('tr').append(
					new Dom('th').cls('narrow-col').text('Date'),
					new Dom('th').text(spendingReport),
					new Dom('th').cls('normal-col').text('Category'),
					new Dom('th').cls('normal-col').text('Amount'),
					new Dom('th').cls('narrow-col').hideable(this.editMode).append(
						new Dom('button').onClick(onClickDelete).append(
							new Dom('img').cls('white-fill').text('Delete').attr('alt', 'Delete').attr('src', icons.delete),
						),
					),
				),
			),
			new Dom('tbody').append(
				...spendingReport.spendings().map(buildSpendingRow),
			),
			new Dom('tfoot').append(
				this.buildTotalRow(spendingReport.totalAsSpending()),
			),
		).userData(spendingReport);
		this.spendingsHtml = spendingsDom.toHtml();

		return spendingsDom;
	}

	buildSubmitSpendingModal(forCategories) {
		this.#spendingSubmitModal = new SpendingSubmitModal(forCategories);
		this.#spendingSubmitModal.onInsertSpending(this.onInsertedSpending.bind(this));
		this.#spendingSubmitModal.onEditSpending(this.onEditedSpending.bind(this));

		return this.#spendingSubmitModal;
	}

	/**
	 * Appends a new row with the current spending to the slice table.
	 * The row is clickable and can be deleted.
	 * @param {Spending} spending Spending to append
	 */
	buildSpendingRow(spending) {
		const onClickDelete = this.onClickedDeleteSpending.bind(this);
		const onClickedSpending = this.onClickedSpending.bind(this);
		const spentOn = spending.spentOn.toLocaleString('en-GB', { day: 'numeric' });
		const newRow = new Dom('tr').id(spending.id).userData(spending).append(
			new Dom('td').text(spentOn).onClick(onClickedSpending),
			new Dom('td').text(spending.description).onClick(onClickedSpending),
			new Dom('td').text(spending.category).onClick(onClickedSpending),
			new Dom('td').text(spending.price).onClick(onClickedSpending),
			new Dom('td').hideable(this.editMode).append(
				new Dom('button').onClick(onClickDelete).append(
					new Dom('img').cls('white-fill').text('Delete').attr('alt', 'Delete').attr('src', icons.delete),
				),
			),
		);

		return newRow;
		// this.spendingsHtml.tBodies[0].appendChild(newRow.toHtml());
	}

	/**
	 * Appends a new row with the current spending to the slice table.
	 * The row cannot be edited nor deleted.
	 * @param {Spending} total
	 */
	buildTotalRow(total) {
		const spentOn = total.spentOn.toLocaleString('en-GB', { day: 'numeric' });
		const newRow = new Dom('tr').id(total.id).userData(total).append(
			new Dom('td').text(spentOn),
			new Dom('td').text(total.description),
			new Dom('td').text(total.category),
			new Dom('td').text(total.price.toFixed(2)),
			new Dom('td').hideable(this.editMode),
		);
		return newRow;
	}

	// #region event handlers
	onInsertedSpending(newSpending) {
		if (this.onCreateSpendingCallback) {
			this.onCreateSpendingCallback(newSpending);
		}
	}

	onClickedDeleteSpending(event) {
		if (!this.editMode) return;

		const row = event.currentTarget.parentNode.parentNode;
		const tBody = row.parentNode;
		/** @type {Spending} */
		const spending = row.userData;
		spending.deleted = true;

		tBody.removeChild(row);
	}

	onClickDeleteSlice(event) {
		if (!this.editMode) return;

		const table = (event.currentTarget.parentNode.parentNode.parentNode.parentNode);
		const spendingReport = table.userData;

		if (this.onDeleteReportCallback) {
			this.onDeleteReportCallback(spendingReport);
		}
		table.parentNode.removeChild(table);
	}

	onClickedSpending(event) {
		if (!this.editMode) return;

		const cell = event.currentTarget;
		const row = cell.parentNode;
		/** @type {Spending} */
		const spending = row.userData;
		this.#spendingSubmitModal.open();
		this.#spendingSubmitModal.editMode(spending);
	}

	onEditedSpending(spending) {
		const row = document.getElementById(spending.id);
		// TODO Extract slice to its own class and get user data directly from it according to month
		const spendingReport = row.parentNode.parentNode.userData;
		this.refreshMonth(spendingReport);
	}

	onClickEdit() {
		// Disable sliding effects to avoid listener conflicts.
		this.gfx.pause();
		const elements = document.querySelectorAll('[hideable="true"]');
		for (let i = 0; i < elements.length; i += 1) {
			elements[i].style.display = '';
		}

		this.editMode = true;
	}

	onClickedSave() {
		// Resume effects as there will be no listener conflicts anymore.
		this.gfx.resume();
		const hideables = document.querySelectorAll('[hideable="true"]');
		for (let i = 0; i < hideables.length; i += 1) {
			hideables[i].style.display = 'none';
		}

		this.editMode = false;

		this.#drawnSlices.forEach((slice) => {
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

	onClickedSummary() {
		const selectedSlice = this.gfx.selectedSlice();
		new SpendingSummaryModal(selectedSlice.userData).open();
	}

	onClickAddSpending() {
		this.#spendingSubmitModal.open();
		this.#spendingSubmitModal.insertMode();
	}

	// #endregion
}
