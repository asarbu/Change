import Dom from '../../common/gui/dom.js';
import Modal from '../../common/gui/modal.js';
import { Statement, StatementType } from '../model/planningModel.js';
import SelectStatementTypeModal from './selectStatementTypeModal.js';

export default class SubmitStatementModal extends Modal {
	#editMode = false;

	#onInsertedStatementHandler = undefined;

	#onEditStatementHandler = undefined;

	/** @type {SelectStatementTypeModal} */
	#selectStatementTypeModal = undefined;

	#idInput = new Dom();

	#nameInput = new Dom();

	#statementTypeInput = new Dom();

	constructor() {
		super('add-statement-modal');
		const onClickSave = this.#onSavedStatement.bind(this);
		const onClickStatementType = this.#onClickedStatementTypeInput.bind(this);

		this.header(
			new Dom('h2').text('Add Statement'),
		).body(
			new Dom('form').append(
				new Dom('div').cls('input-field').append(
					new Dom('input').type('text').attr('required', '').cloneTo(this.#nameInput),
					new Dom('label').text('Statement name: '),
				),
				new Dom('div').cls('input-field').onClick().append(
					new Dom('input').onFocus(onClickStatementType).onClick(onClickStatementType).type('text').attr('required', '').cloneTo(this.#statementTypeInput),
					new Dom('label').text('Type: '),
				),
				new Dom('input').attr('required', '').attr('value', new Date()).hide().cloneTo(this.#idInput),
				new Dom('input').type('submit').hide().onClick(onClickSave),
			),
		).footer(
			new Dom('h3').text('Cancel').onClick(this.close.bind(this)),
			new Dom('h3').text('Save').onClick(onClickSave),
		);

		this.#selectStatementTypeModal = new SelectStatementTypeModal();
		this.#selectStatementTypeModal.onChangeStatementType(this.#onChangedStatementType.bind(this));
	}

	// TODO Find a way to make this modal pure
	/**
	 * @param {Statement} statement
	 */
	editMode(statement) {
		this.#editMode = true;
		this.header(new Dom('h2').text('Edit Statement'));
		this.#idInput.toHtml().value = statement.id;
		this.#nameInput.toHtml().value = statement.name;
		this.#statementTypeInput.toHtml().value = statement.type;
		return this;
	}

	insertMode() {
		this.#editMode = false;
		this.header(new Dom('h2').text('Add Statement'));
		this.#idInput.toHtml().value = new Date();
		this.#nameInput.toHtml().value = '';
		this.#statementTypeInput.toHtml().value = '';
		return this;
	}

	/**
	 * @param {(newStatement: Statement) => void} handler
	 */
	onInsertStatement(handler) {
		this.#onInsertedStatementHandler = handler;
	}

	/**
	 * @param {(editedStatement: Statement) => void} handler
	 */
	onEditStatement(handler) {
		this.#onEditStatementHandler = handler;
	}

	#onSavedStatement() {
		const statementId = +this.#idInput.toHtml().value;
		const statementName = this.#nameInput.toHtml().value;
		const statementType = this.#statementTypeInput.toHtml().value;
		const statement = new Statement(statementId, statementName, statementType);

		if (!statementName || statementName.length === 0) {
			this.#nameInput.toHtml().focus();
			return;
		}

		if (!statementType) {
			this.#statementTypeInput.toHtml().focus();
			return;
		}

		this.close();
		if (this.#editMode) {
			this.#onEditStatementHandler?.(statement);
		} else {
			this.#onInsertedStatementHandler?.(statement);
		}
	}

	#onClickedStatementTypeInput() {
		this.#selectStatementTypeModal.open();
		if (this.isOpen()) {
			this.close();
		}
	}

	/**
	 * @param {StatementType} newStatementType
	 */
	#onChangedStatementType(newStatementType) {
		this.#statementTypeInput.toHtml().value = newStatementType;
		this.open()
			.#selectStatementTypeModal.close();
	}
}
