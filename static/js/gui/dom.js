/**
 * Creates and decorates a new DOM Element
 * @param {string} ofType Type of element to be created
 * @param {Array} properties.classes Classes to be added to the DOM classlist
 * @param {DOMElement} withParent Parent to bind the newly created element to
 * @returns {DOMElement}
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
 * 
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
