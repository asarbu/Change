/**
 * Creates and decorates a new DOM Element
 * @param {string} ofType Type of element to be created
 * @param {Array} properties.classes Classes to be added to the DOM classlist
 * @param {HTMLElement} withParent Parent to bind the newly created element to
 * @returns {HTMLElement}
 */
export function create(ofType, havingProperties, withParent) {
	const elmt = document.createElement(ofType);

	if (havingProperties) {
		Object.entries(havingProperties).forEach(([key, value]) => {
			if (key === 'classes') {
				elmt.classList.add(...value);
			} else {
				elmt[key] = value;
			}
		});
	}

	if (withParent) {
		withParent.appendChild(elmt);
	}

	return elmt;
}

/**
 * Creates an HTML element and appends it to a parent.
 * @param {string} ofType HTML element type to create
 * @param {HTMLElement} withParent Parent where to append the element
 * @returns {HTMLElement}
 */
export function createChild(ofType, withParent) {
	const elmt = document.createElement(ofType);
	withParent.appendChild(elmt);
	return elmt;
}

/**
 * @param {string} text Text to display in button. TODO remove if notused
 * @param {Array<string>} classList Array of classes to decorate button. TODO remove if not used
 * @param {string} src String that represents the icon inside the button
 * @param {HTMLElement} parent Parent to append this button to.
 * @param {Function} onClick Callback function to bind to 'click' event
 * @returns {HTMLButtonElement}
 */
export function createImageButton(text, classList, src, parent, onClick) {
	// TODO Add event listener for on click in params
	const btn = create('button');
	btn.classList.add(...classList);
	const img = create('img');
	img.classList.add('white-fill');
	img.textContent = text;
	img.alt = text;
	img.src = src;
	btn.appendChild(img);
	if (parent) {
		parent.appendChild(btn);
	}
	if (onClick) {
		btn.addEventListener('click', onClick);
	}
	return btn;
}

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
		children.forEach((child) => {
			this.elmt.appendChild(child.toHtml ? child.toHtml() : child);
		});
		return this;
	}

	attr(name, value) {
		this.elmt.setAttribute(name, value);
		return this;
	}

	checked(value) {
		if (value) {
			this.elmt.checked = 'checked';
		} else {
			delete this.elmt.checked;
		}
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

	contentEditable(value) {
		let isEditable = true;
		if (value !== undefined) {
			isEditable = value;
		}
		this.elmt.setAttribute('contenteditable', isEditable);
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

	hideable(isVisible) {
		this.elmt.setAttribute('hideable', true);
		this.elmt.style.display = isVisible ? '' : 'none';
		return this;
	}

	id(id) {
		this.elmt.id = id;
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

	text(text) {
		this.elmt.textContent = text;
		return this;
	}

	type(type) {
		this.elmt.type = type;
		return this;
	}

	toHtml() {
		return this.elmt;
	}

	userData(userData) {
		this.elmt.userData = userData;
		return this;
	}
}
