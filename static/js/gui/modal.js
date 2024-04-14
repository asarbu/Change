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

	toDom() {
		return this.modal;
	}

	toHtml() {
		return this.modalHtml;
	}

	open() {
		this.modalBackdropHtml.classList.add('show-modal-backdrop');
		this.contentHtml.classList.add('show-modal-content');
		this.#isOpen = true;
		return this;
	}

	close(event) {
		// Force close if not triggered by an event (triggered by code)
		if (!event || this.#triggeredCancelEvent(event)) {
			this.modalBackdropHtml.classList.remove('show-modal-backdrop');
			this.contentHtml.classList.remove('show-modal-content');
		}
		this.#isOpen = false;
		return this;
	}

	#triggeredCancelEvent(event) {
		return event.target === this.cancelButtonHtml || event.target === this.modalBackdropHtml;
	}

	scrollable() {
		this.bodyDom.elmt.classList.remove('no-scrollbar');
		return this;
	}

	isOpen() {
		return this.#isOpen;
	}
}
