import Dom from '../../common/gui/dom.js';
import Modal from '../../common/gui/modal.js';
import Utils from '../../common/utils/utils.js';

export default class PlanningMonthModal extends Modal {
	#onSelectedMonthHandler;

	constructor() {
		super('planning-month-modal');
		const monthToDom = this.#monthToDom.bind(this);
		this.header(
			new Dom('h1').text('Select month for plan'),
		).body(
			new Dom('div').cls('accordion').append(
				...Utils.MONTH_NAMES.map(monthToDom),
			),
		).addCancelFooter();
	}

	#monthToDom(monthName) {
		return new Dom('div').cls('accordion-secondary').text(monthName).onClick(this.#onSelectedMonth.bind(this, monthName));
	}

	onSelectMonth(handler) {
		this.#onSelectedMonthHandler = handler;
	}

	#onSelectedMonth(month) {
		this.#onSelectedMonthHandler?.(month);
	}
}
