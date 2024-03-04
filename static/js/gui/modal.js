import Dom from "./dom.js"

export default class Modal {
	constructor(id) {
		this.id = id;
		this.modal = new Dom('div').id(id).cls('modal').onClick(this.close.bind(this));
		this.modalHtml = this.modal.toHtml();

		this.content = new Dom('div').cls('modal-content');
		this.contentHtml = this.content.toHtml();
		this.modalHtml.appendChild(this.contentHtml);
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
		this.content.append(
			new Dom('div').cls('modal-body').append(
				...domElements,
			),
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
		this.modalHtml.classList.add('show-modal-backdrop');
		this.contentHtml.classList.add('show-modal-content');
	}

	close(event) {
		// Force close if it function not triggered by an event (triggered by code)
		if (!event || event.target === this.cancelButtonHtml || event.target === this.modalHtml) {
			this.modalHtml.classList.remove('show-modal-backdrop');
			this.contentHtml.classList.remove('show-modal-content');
		}
	}
}
