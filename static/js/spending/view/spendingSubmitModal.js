import Dom from '../../common/gui/dom.js';
import Modal from '../../common/gui/modal.js';
import { Category } from '../../planning/model/planningModel.js';
import Spending from '../model/spending.js';
import SpendingCategoryModal from './spendingCategoryModal.js';

export default class SpendingSubmitModal extends Modal {
	/** @type {SpendingCategoryModal} */
	#categoryModal = undefined;

	#onInsertHandler = undefined;

	#onEditHandler = undefined;

	#spending = undefined;

	#editMode = false;

	/** @type {Dom} */
	#dateInput = new Dom();

	/** @type {Dom} */
	#descriptionInput = new Dom();

	/** @type {Dom} */
	#categoryInput = new Dom();

	/** @type {Dom} */
	#priceInput = new Dom();

	constructor(forCategories) {
		super('spending-submit-modal');

		const onClickCategoryInput = this.#onClickedCategoryInput.bind(this);

		this.header(
			new Dom('h2').text('Insert Spending'),
		).body(
			new Dom('form').append(
				new Dom('div').cls('input-field').append(
					new Dom('input').type('date').attr('required', '').attr('value', new Date().toISOString().substring(0, 10)).cloneTo(this.#dateInput),
					new Dom('label').text('Date: '),
				),
				new Dom('div').cls('input-field').append(
					new Dom('input').type('text').attr('required', '').attr('inputmode', 'none').onClick(onClickCategoryInput).onFocus(onClickCategoryInput)
						.cloneTo(this.#categoryInput),
					new Dom('label').text('Category: '),
				),
				new Dom('div').cls('input-field').append(
					new Dom('input').type('number').attr('required', '').attr('step', '0.01').cloneTo(this.#priceInput),
					new Dom('label').text('Price: '),
				),
				new Dom('div').cls('input-field').append(
					new Dom('input').type('text').attr('required', '').cloneTo(this.#descriptionInput),
					new Dom('label').text('Description: '),
				),
				new Dom('input').type('submit').hide().onClick(this.#onClickedSave.bind(this)),
			),
		).footer(
			new Dom('h3').text('Cancel').onClick(this.close.bind(this)),
			new Dom('h3').text('Save').onClick(this.#onClickedSave.bind(this)),
		);

		this.#buildCategoryModal(forCategories);
	}

	/**
	 * @param {Array<Category>} forCategories
	 * @returns {Dom}
	 */
	#buildCategoryModal(forCategories) {
		const onClickCategory = this.#onClickedCategory.bind(this);
		this.#categoryModal = new SpendingCategoryModal(forCategories, onClickCategory);
		return this.#categoryModal;
	}

	editMode(spending) {
		this.#editMode = true;
		this.header(new Dom('h2').text('Edit Spending'));
		this.#spending = spending;
		this.#spending.edited = true;

		this.#dateInput.toHtml().valueAsDate = spending.spentOn;
		this.#descriptionInput.toHtml().value = spending.description;
		this.#categoryInput.toHtml().value = spending.category;
		this.#priceInput.toHtml().value = spending.price;
	}

	insertMode() {
		this.#editMode = false;

		this.header(new Dom('h2').text('Insert Spending'));
		this.#spending = new Spending(new Date().getTime());

		this.#descriptionInput.toHtml().value = '';
		this.#categoryInput.toHtml().value = '';
		this.#priceInput.toHtml().value = '';
	}

	onEditSpending(handler) {
		this.#onEditHandler = handler;
	}

	onInsertSpending(handler) {
		this.#onInsertHandler = handler;
	}

	#onClickedSave(event) {
		event.preventDefault();
		this.#spending.spentOn = this.#dateInput.toHtml().valueAsDate;
		this.#spending.description = this.#descriptionInput.toHtml().value;
		this.#spending.price = +(this.#priceInput.toHtml().value);
		this.#spending.category = this.#categoryInput.toHtml().value;

		if (!this.#spending.price) {
			this.#priceInput.toHtml().focus();
			return;
		}

		this.close();

		if (this.#editMode && this.#onEditHandler) {
			this.#onEditHandler(this.#spending);
		} else if (this.#onInsertHandler) {
			this.#onInsertHandler(this.#spending);
		}
	}

	#onClickedCategory(event) {
		this.#categoryModal.close();
		this.open();
		this.#categoryInput.toHtml().value = event.target.textContent;
		this.#focusInputField(this.#priceInput.toHtml());
	}

	#onClickedCategoryInput() {
		if (this.isOpen()) {
			this.close();
		}
		this.#categoryModal.open();
	}

	#focusInputField(htmlElement) {
		/* Focus cannot be applied to invisible elements.
		 * We need to wait for elemnt to be focusable.
		 * We also cannot use display: none -> display: visible because 'display' cannot be animated
		 */
		requestAnimationFrame(() => {
			htmlElement.focus();
			if (document.activeElement !== htmlElement) {
				requestAnimationFrame(this.#focusInputField.bind(this, htmlElement));
			}
		});
	}
}
