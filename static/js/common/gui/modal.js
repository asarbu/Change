import Dom from './dom.js';

export default class Modal {
	/** @type {boolean} */
	#isOpen = false;

	/** @type {Dom} */
	#headerDom = undefined;

	/** @type {Dom} */
	#bodyDom = undefined;

	constructor(id) {
		this.id = id;
		this.modalBackdrop = new Dom('div').cls('modal').onClick(this.close);
		this.content = new Dom('div').cls('modal-content');
		this.modal = new Dom('div').id(id).append(
			this.modalBackdrop,
			this.content,
		);

		this.modalHtml = this.modal.toHtml();
		this.contentHtml = this.content.toHtml();
		this.modalBackdropHtml = this.modalBackdrop.toHtml();
		this.closeModalEventListener = this.#closeModal.bind(this);
	}

	/**
	 * @param {Function} yesCallback
	 */
	static areYouSureModal(id, message, yesCallback) {
		return new Modal(id).header(
			new Dom('h1').text(message),
		).addFooterWithActionButton('Yes', yesCallback);
	}

	header(...domElements) {
		if (!this.#headerDom) {
			this.#headerDom = new Dom('div').cls('modal-header');
			this.content.append(this.#headerDom);
		}
		this.#headerDom.clear();
		this.#headerDom.append(
			...domElements,
		);
		return this;
	}

	body(...domElements) {
		if (!this.#bodyDom) {
			this.#bodyDom = new Dom('div').cls('modal-body', 'no-scrollbar');
			this.content.append(this.#bodyDom);
		}

		this.#bodyDom.append(
			...domElements,
		);

		return this;
	}

	clearBody() {
		if (this.#bodyDom) {
			this.#bodyDom.clear();
		}
		return this;
	}

	bodyHtml() {
		return this.body().#bodyDom.toHtml();
	}

	footer(...domElements) {
		this.content.append(
			new Dom('div').cls('modal-footer').append(
				...domElements,
			),
		);
		return this;
	}

	addCancelFooter() {
		this.cancelButton = new Dom('h3').id(`modal-cancel-${this.id}`).text('Cancel');
		this.cancelButtonHtml = this.cancelButton.toHtml();

		this.footer(
			this.cancelButton.onClick(this.close),
		);

		return this;
	}

	addFooterWithActionButton(actionName, handler) {
		this.footer(
			new Dom('h3').text('Cancel').onClick(this.close),
			new Dom('h3').text(actionName).onClick(() => {
				handler?.();
				this.close();
			}),
		);
		return this;
	}

	clickYes() {
		if (this.yesButton) {
			this.yesButton.toHtml().click();
		}
	}

	toDom() {
		return this.modal;
	}

	toHtml() {
		return this.modalHtml;
	}

	open() {
		const main = document.getElementById('main');
		main.appendChild(this.modalHtml);
		requestAnimationFrame(() => {
			this.modalBackdropHtml.classList.add('show-modal-backdrop');
			this.contentHtml.classList.add('show-modal-content');
			this.#isOpen = true;
		});

		return this;
	}

	close = () => {
		this.#isOpen = false;
		requestAnimationFrame(() => {
			this.modalBackdropHtml.classList.remove('show-modal-backdrop');
			this.contentHtml.classList.remove('show-modal-content');
			this.contentHtml.addEventListener('transitionend', this.closeModalEventListener);
		});
		return this;
	};

	#closeModal() {
		this.contentHtml.removeEventListener('transitionend', this.closeModalEventListener);
		const main = document.getElementById('main');
		main.removeChild(this.modalHtml);
	}

	scrollable() {
		this.#bodyDom.elmt.classList.remove('no-scrollbar');
		return this;
	}

	isOpen() {
		return this.#isOpen;
	}
}
