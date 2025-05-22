import Dom from '../../common/gui/dom.js';
import Modal from '../../common/gui/modal.js';
import { StatementType } from '../model/planningModel.js';

export default class SelectStatementTypeModal extends Modal {
	/** @type {(newStatementType:StatementType) => void} */
	#onChangedStatementTypeHandler = undefined;

	constructor() {
		super('select-statement-type-modal');

		const onChangedStatementType = this.#onChangedStatementType.bind(this);

		this.header(
			new Dom('h2').text('Select Statement Type'),
		).body(
			new Dom('div').cls('accordion-secondary').text(StatementType.INCOME).onClick(onChangedStatementType),
			new Dom('div').cls('accordion-secondary').text(StatementType.EXPENSE).onClick(onChangedStatementType),
			new Dom('div').cls('accordion-secondary').text(StatementType.SAVING).onClick(onChangedStatementType),
		).addCancelFooter();
	}

	#onChangedStatementType(event) {
		const statementType = event.currentTarget.textContent;
		this.#onChangedStatementTypeHandler?.(statementType);
	}

	/**
	 * @param {(newStatementType: StatementType) => void} handler
	 */
	onChangeStatementType(handler) {
		this.#onChangedStatementTypeHandler = handler;
	}
}
