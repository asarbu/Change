import Dom from '../../common/gui/dom.js';
import Modal from '../../common/gui/modal.js';
import { Category } from '../../planning/model/planningModel.js';
import Spending from '../model/spending.js';
import SpendingCategoryModal from './spendingCategoryModal.js';

export default class SpendingSubmitModal {
	#modalDom = undefined;

	#categoryModal = undefined;

	#onClickSaveHandler = undefined;

	#spending = undefined;

	constructor(forCategories, onClickSaveHandler) {
		this.#onClickSaveHandler = onClickSaveHandler;
		const onClickCategoryInput = this.#onClickCategoryInput.bind(this);

		this.#modalDom = new Modal('add-spending').header(
			new Dom('h2').text('Insert Spending'),
		).body(
			new Dom('form').append(
				new Dom('div').cls('input-field').append(
					new Dom('input').id('date-input-field').type('date').attr('required', '').attr('value', new Date().toISOString().substring(0, 10)),
					new Dom('label').text('Date: '),
				),
				new Dom('div').cls('input-field').append(
					new Dom('input').id('category-input-field').type('text').attr('required', '').onClick(onClickCategoryInput).onFocus(onClickCategoryInput),
					new Dom('label').text('Category: '),
				),
				new Dom('div').cls('input-field').append(
					new Dom('input').id('price-input-field').type('number').attr('required', '').attr('step', '0.01'),
					new Dom('label').text('Price: '),
				),
				new Dom('div').cls('input-field').append(
					new Dom('input').id('description-input-field').type('text').attr('required', ''),
					new Dom('label').text('Description: '),
				),
				new Dom('input').type('submit').hide().onClick(this.#onClickSave.bind(this)),
			),
		).footer(
			new Dom('h3').text('Cancel').onClick(this.close.bind(this)),
			new Dom('h3').text('Save').onClick(this.#onClickSave.bind(this)),
		);

		this.#buildCategoryModal(forCategories);
	}

	/**
	 * @param {Array<Category>} forCategories
	 * @returns {Dom}
	 */
	#buildCategoryModal(forCategories) {
		const onClickCategory = this.#onClickCategory.bind(this);
		this.#categoryModal = new SpendingCategoryModal(forCategories, onClickCategory);
		return this.#categoryModal;
	}

	open() {
		this.#modalDom.open();
	}

	close() {
		this.#modalDom.close();
	}

	editMode(spending) {
		this.#modalDom.header(new Dom('h2').text('Edit Spending'));
		this.#spending = spending;
		this.#spending.edited = true;
	}

	insertMode() {
		this.#modalDom.header(new Dom('h2').text('Insert Spending'));
		this.#spending = new Spending(new Date().getTime());
	}

	#onClickSave(event) {
		event.preventDefault();
		this.#spending.spentOn = document.getElementById('date-input-field').valueAsDate;
		this.#spending.description = document.getElementById('description-input-field').value;
		this.#spending.price = +document.getElementById('price-input-field').value;
		this.#spending.category = document.getElementById('category-input-field').value;

		if (!this.#spending.price) {
			document.getElementById('price-input-field').focus();
			return;
		}

		this.close();
		if (this.#onClickSaveHandler) {
			this.#onClickSaveHandler(this.#spending);
		}
	}

	#onClickCategory(event) {
		// TODO move setters in modal
		this.#categoryModal.close();
		this.open();
		const categoryInput = document.getElementById('category-input-field');
		const descriptionInput = document.getElementById('description-input-field');
		const priceInput = document.getElementById('price-input-field');
		categoryInput.value = event.target.textContent;
		descriptionInput.value = '';
		priceInput.value = '';
		this.#focusInputField('price-input-field');
	}

	#onClickCategoryInput() {
		if (this.isOpen()) {
			this.close();
		}
		this.#categoryModal.open();
	}

	#focusInputField(withId) {
		/* Focus cannot be applied to invisible elements.
		 * We need to wait for elemnt to be focusable.
		 * We also cannot use display: none -> display: visible because 'display' cannot be animated
		 */
		requestAnimationFrame(() => {
			const priceInputField = document.getElementById(withId);
			priceInputField.focus();
			if (document.activeElement !== priceInputField) {
				requestAnimationFrame(this.#focusInputField.bind(this, withId));
			}
		});
	}

	isOpen() {
		return this.#modalDom.isOpen();
	}
}
