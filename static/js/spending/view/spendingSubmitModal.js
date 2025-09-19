import Dom from '../../common/gui/dom.js';
import Modal from '../../common/gui/modal.js';
import { Category } from '../../planning/model/planningModel.js';
import Spending from '../model/spending.js';
import SpendingCategoryModal from './spendingCategoryModal.js';

export default class SpendingSubmitModal extends Modal {
	/** @type {SpendingCategoryModal} */
	#categoryModal = undefined;

	#onSubmitHandler = undefined;

	/** @type {Dom} */
	#dateInput = new Dom();

	/** @type {Dom} */
	#descriptionInput = new Dom();

	/** @type {Dom} */
	#categoryInput = new Dom();

	/** @type {Dom} */
	#priceInput = new Dom();

	constructor(forCategories, duringYear, duringMonth, duringDay = 1) {
		super('spending-submit-modal');
		
		const minDate = new Date(duringYear, duringMonth, 1).toLocaleDateString("en-CA");
		const maxDate = new Date(duringYear, duringMonth + 1, 0).toLocaleDateString("en-CA");
		const date = new Date(duringYear, duringMonth, duringDay).toLocaleDateString("en-CA");

		this.header(
			new Dom('h2').text('Insert Spending'),
		).body(
			new Dom('form').id('spending-submit-form').append(
				new Dom('div').cls('input-field').append(
					new Dom('input').id('date').type('date').attr('required', '').attr('min', minDate).attr('max', maxDate).attr('value', date).cloneTo(this.#dateInput),
					new Dom('label').text('Date: '),
				),
				new Dom('div').cls('input-field').append(
					new Dom('input').id('category').type('text').attr('required', '').attr('inputmode', 'none').onClick(this.#onClickedCategoryInput).onFocus(this.#onClickedCategoryInput)
						.cloneTo(this.#categoryInput),
					new Dom('label').text('Category: '),
				),
				new Dom('div').cls('input-field').append(
					new Dom('input').id('price').type('number').attr('required', '').attr('step', '0.01').cloneTo(this.#priceInput),
					new Dom('label').text('Price: '),
				),
				new Dom('div').cls('input-field').append(
					new Dom('input').id('description').type('text').attr('required', '').cloneTo(this.#descriptionInput),
					new Dom('label').text('Description: '),
				),
				new Dom('input').type('submit').hide().onClick(this.#onClickedSave),
			),
		).footer(
			new Dom('h3').text('Cancel').onClick(this.close.bind(this)),
			new Dom('input').id('submit-spending').attr('form', 'spending-submit-form').type('submit').value('Save').onClick(this.#onClickedSave),
		);

		this.#buildCategoryModal(forCategories);
	}

	/**
	 * @param {Array<Category>} forCategories
	 * @returns {Dom}
	 */
	#buildCategoryModal(forCategories) {
		this.#categoryModal = new SpendingCategoryModal(forCategories, this.#onClickedCategory);
		return this.#categoryModal;
	}

	editMode(spending) {
		this.header(new Dom('h2').text('Edit Spending'));

		const spent = spending.spentOn;
		this.#dateInput.toHtml().valueAsDate = new Date(spent.getFullYear(), spent.getMonth(), spent.getDate(), 0, -spent.getTimezoneOffset());
		this.#descriptionInput.toHtml().value = spending.description;
		this.#categoryInput.toHtml().value = spending.category;
		this.#priceInput.toHtml().value = spending.price;

		return this;
	}

	open = () => {
		return this.#onClickedCategoryInput();
	};

	insertMode() {
		this.header(new Dom('h2').text('Insert Spending'));

		this.#descriptionInput.toHtml().value = '';
		this.#categoryInput.toHtml().value = '';
		this.#priceInput.toHtml().value = '';
		return this;
	}

	onSubmit(handler) {
		this.#onSubmitHandler = handler;
		return this;
	}

	#onClickedSave = (event) => {
		const form = event.target.form;
		if(!form.checkValidity()) {	return;	}

		event.preventDefault();
		const spending = new Spending(new Date().getTime());
		spending.spentOn = this.#dateInput.toHtml().valueAsDate;
		spending.description = this.#descriptionInput.toHtml().value;
		spending.price = +(this.#priceInput.toHtml().value);
		spending.category = this.#categoryInput.toHtml().value;

		this.close();
		this.#onSubmitHandler?.(spending);
	};

	#onClickedCategory = (event) => {
		this.#categoryModal.close();
		super.open();
		this.#categoryInput.toHtml().value = event.target.textContent;
		this.#focusInputField(this.#priceInput.toHtml());
	}

	#onClickedCategoryInput = () => {
		if (this.isOpen()) {
			this.close();
		}
		this.#categoryModal.open();
	};

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
