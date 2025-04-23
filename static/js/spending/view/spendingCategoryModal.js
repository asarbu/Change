import Dom from '../../common/gui/dom.js';
import Modal from '../../common/gui/modal.js';

export default class SpendingCategoryModal {
	#modalDom = undefined;

	constructor(forCategories, onClickCategoryCallback) {
		if (!forCategories || forCategories.length === 0) {
			this.#modalDom = new Modal('categories')
				.header(
					new Dom('h2').text('Cannot Insert Spending'),
				).body(
					new Dom('div').cls('accordion').text('Plan your goals first!'),
				).addCancelFooter();
			return;
		}

		const onClickCategoryHeader = SpendingCategoryModal.#onClickCategoryHeader;

		this.#modalDom = new Modal('categories')
			.header(
				new Dom('h2').text('Insert Spending'),
			).body(
				new Dom('div').cls('accordion').append(
					...forCategories.map((category) => new Dom('div').cls('accordion-item').onTransitionEnd(onClickCategoryHeader).append(
						new Dom('input').id(category.id).cls('accordion-state').attr('type', 'checkbox'),
						new Dom('label').cls('accordion-header').attr('for', category.id).append(
							new Dom('span').text(category.name),
						),
						new Dom('div').cls('accordion-content').append(
							...category.goals.map((goal) => new Dom('div').cls('accordion-secondary').text(goal.name).onClick(onClickCategoryCallback)),
						),
					)),
				),
			).scrollable()
			.addCancelFooter();
	}

	open() {
		this.#modalDom.open();
	}

	close() {
		this.#modalDom.close();
	}

	static #onClickCategoryHeader(event) {
		const header = event.currentTarget;
		header.scrollIntoView(true);
	}
}
