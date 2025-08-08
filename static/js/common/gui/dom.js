export default class Dom {
	constructor(tagName) {
		/** @type {HTMLElement} */
		this.elmt = document.createElement(tagName);
	}

	// Todo replace all occurences of below instances with this static factory method
	static imageButton(text, src) {
		return new Dom('button').append(
			new Dom('img').cls('white-fill').text(text).attr('alt', text).attr('src', src),
		);
	}

	/**
	 * Appends the obj instances to the current DOM
	 * @param {Array<Dom>} children Object to append to current DOM instance
	 * @returns {Dom}
	 */
	append(...children) {
		children
			.filter((x) => x)
			.forEach((child) => {
				this.elmt.appendChild(child?.toHtml ? child.toHtml() : child);
			});
		return this;
	}

	attr(name, value) {
		this.elmt.setAttribute(name, value);
		return this;
	}

	checked(value) {
		this.elmt.checked = !!value;
		return this;
	}

	clear() {
		this.elmt.innerHTML = '';
		return this;
	}

	cls(...classes) {
		this.elmt.classList.add(...classes);
		return this;
	}

	contentEditable(value = true) {
		this.elmt.setAttribute('contenteditable', value);
		return this;
	}

	editable() {
		this.elmt.setAttribute('editable', 'true');
		return this;
	}

	hide() {
		this.elmt.style.display = 'none';
		return this;
	}

	hideable(isVisible = false) {
		this.elmt.setAttribute('hideable', true);
		this.elmt.style.display = isVisible ? '' : 'none';
		return this;
	}

	id(id) {
		this.elmt.id = id;
		return this;
	}

	onChange(listener) {
		this.elmt.addEventListener('change', listener);
		return this;
	}

	onClick(listener) {
		this.elmt.addEventListener('click', listener);
		return this;
	}

	onKeyUp(listener) {
		this.elmt.addEventListener('keyup', listener, false);
		return this;
	}

	onTransitionEnd(listener) {
		this.elmt.addEventListener('transitionend', listener, false);
		return this;
	}

	onFocus(listener) {
		this.elmt.addEventListener('focus', listener, false);
		return this;
	}

	show() {
		this.elmt.style.display = '';
		return this;
	}

	text(text) {
		this.elmt.textContent = text;
		return this;
	}

	type(type) {
		this.elmt.type = type;
		return this;
	}

	toHtml(target) {
		if (target) {
			Object.assign(target, this.elmt);
		}
		return this.elmt;
	}

	value(value) {
		this.elmt.value = value;
		return this;
	}

	/**
	 * Shallow copy the content of current DOM instance to provided DOM instance
	 * @param {Dom} target\ The instance where to copy the content to
	 * @returns current DOM instance
	 */
	cloneTo(target) {
		if (target) {
			Object.assign(target, this);
		}
		return this;
	}

	userData(userData) {
		this.elmt.userData = userData;
		return this;
	}
}
