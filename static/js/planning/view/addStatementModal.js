import Dom from '../../common/gui/dom.js';
import Modal from '../../common/gui/modal.js';
import { Statement } from '../model/planningModel.js';

export default class AddStatementModal extends Modal {
	#onClickedStatementTypeHandler = undefined;

	#onClickedSaveStatementHandler = undefined;

	constructor() {
		super('add-statement');
		const onClickSave = this.#onClickedSaveStatement.bind(this);
		const onClickStatementType = this.#onClickedStatementType.bind(this, true);

		this.header(
			new Dom('h2').text('Add Statement'),
		).body(
			new Dom('form').append(
				new Dom('div').cls('input-field').append(
					new Dom('input').id('statement-date-input').type('date').attr('required', '').attr('value', new Date().toISOString().substring(0, 10)),
					new Dom('label').text('Date: '),
				),
				new Dom('div').cls('input-field').append(
					new Dom('input').id('statement-name-input').type('text').attr('required', ''),
					new Dom('label').text('Statement name: '),
				),
				new Dom('div').cls('input-field').onClick().append(
					new Dom('input').id('statement-type-input').onFocus(onClickStatementType).onClick(onClickStatementType).type('text').attr('required', ''),
					new Dom('label').text('Type: '),
				),
				new Dom('input').type('submit').hide().onClick(onClickSave),
			),
		).footer(
			new Dom('h3').text('Cancel').onClick(this.close.bind(this)),
			new Dom('h3').text('Save').onClick(onClickSave),
		);
	}

	onClickSaveStatement(handler) {
		this.#onClickedSaveStatementHandler = handler;
	}

	onClickStatementType(handler) {
		this.#onClickedStatementTypeHandler = handler;
	}

	#onClickedSaveStatement() {
		const statementId = document.getElementById('statement-date-input').valueAsDate.getTime();
		const statementName = document.getElementById('statement-name-input').value;
		const statementType = document.getElementById('statement-type-input').value;
		const newStatement = new Statement(statementId, statementName, statementType);

		this.#onClickedSaveStatementHandler?.(newStatement);
		this.close();
	}

	#onClickedStatementType() {
		this.#onClickedStatementTypeHandler?.();
	}
}
