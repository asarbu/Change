import Dom from './dom.js';

export default class Modal {
	/** @type {boolean} */
	#isOpen = false;

	constructor(id) {
		this.id = id;
		const onClose = this.close.bind(this);
		this.modalBackdrop = new Dom('div').cls('modal').onClick(onClose);
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
		const areYouSureModal = new Modal(id).header(
			new Dom('h1').text(message),
		).#addCancelYesFooter(yesCallback);
		return areYouSureModal;
	}

	header(...domElements) {
		this.content.append(
			new Dom('div').cls('modal-header').append(
				...domElements,
			),
		);
		return this;
	}

	body(...domElements) {
		if (!this.bodyDom) {
			this.bodyDom = new Dom('div').cls('modal-body', 'no-scrollbar');
			this.content.append(this.bodyDom);
		}

		this.bodyDom.append(
			...domElements,
		);

		return this;
	}

	bodyHtml() {
		return this.body().bodyDom.toHtml();
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
			this.cancelButton.onClick(this.close.bind(this)),
		);

		return this;
	}

	#addCancelYesFooter(yesHandler) {
		this.cancelButton = new Dom('h3').id(`modal-cancel-${this.id}`)
			.text('Cancel').onClick(this.close.bind(this));
		this.cancelButtonHtml = this.cancelButton.toHtml();
		this.yesButton = new Dom('h3').text('Yes').onClick(() => {
			yesHandler();
			this.close();
		});

		this.footer(
			this.cancelButton,
			this.yesButton,
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

	close() {
		requestAnimationFrame(() => {
			this.modalBackdropHtml.classList.remove('show-modal-backdrop');
			this.contentHtml.classList.remove('show-modal-content');
			this.contentHtml.addEventListener('transitionend', this.closeModalEventListener);
		});
		return this;
	}

	#closeModal() {
		this.contentHtml.removeEventListener('transitionend', this.closeModalEventListener);
		const main = document.getElementById('main');
		main.removeChild(this.modalHtml);
		this.#isOpen = false;
	}

	scrollable() {
		this.bodyDom.elmt.classList.remove('no-scrollbar');
		return this;
	}

	isOpen() {
		return this.#isOpen;
	}
}
