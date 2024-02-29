import Dom from "./dom"

export default class Modal {
	constructor(id) {
		this.modal = new Dom('div').id(id).cls('modal');
		this.modalHtml = this.modal.toHtml();

		this.content = new Dom('div').cls('modal-content');
		this.contentHtml = this.modal.toHtml();
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

	open() {
		this.modalHtml.classList.add('show-modal-backdrop');
		this.contentHtml.classList.add('show-modal-content');
	}

	close() {
		this.modalHtml.classList.remove('show-modal-backdrop');
		this.contentHtml.classList.remove('show-modal-content');
	}
}
