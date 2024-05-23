import Dom from './dom.js';

/** Alert system that displays one message in the designated area below the title on each screen
 * TODO: make alert system a promise queue:
 * https://medium.com/@karenmarkosyan/how-to-manage-promises-into-dynamic-queue-with-vanilla-javascript-9d0d1f8d4df5
 */
export default class Alert {
	/** @type {Dom} */
	#alert = undefined;

	/** @type {HTMLElement} */
	#alertHtml = undefined;

	/** @type {number} */
	#TIMEOUT_IN_MS = 2000;

	/** @type {Function} */
	#onCloseTransitionEnd = undefined;

	constructor(primaryText, secondaryText) {
		this.#alert = new Dom('div').cls('alert').append(
			new Dom('div').append(
				new Dom('strong').cls('alert-header').text(primaryText),
				new Dom('p').cls('alert-text').text(secondaryText),
			),
		);
		this.#alertHtml = this.#alert.toHtml();
		this.#onCloseTransitionEnd = this.onCloseTransitionEnd.bind(this);
	}

	static show(primaryText, secondaryText) {
		const alert = new Alert(primaryText, secondaryText);
		alert.open();
	}

	open() {
		const main = document.getElementById('main');
		main.appendChild(this.#alertHtml);
		requestAnimationFrame(() => {
			// Wait for any pending reflows to finish
			// https://stackoverflow.com/questions/56399913/wait-for-reflow-to-end-after-requestfullscreen
			requestAnimationFrame(() => {
				this.#alertHtml.classList.add('show-alert');
			});
		});
		setTimeout(this.close.bind(this), this.#TIMEOUT_IN_MS);
	}

	close() {
		requestAnimationFrame(() => {
			this.#alert.onTransitionEnd(this.#onCloseTransitionEnd);
			this.#alertHtml.classList.remove('show-alert');
		});
	}

	onCloseTransitionEnd() {
		this.#alertHtml.removeEventListener('transitionend', this.#onCloseTransitionEnd);
		const main = document.getElementById('main');
		main.removeChild(this.#alertHtml);
	}
}
