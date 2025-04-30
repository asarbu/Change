import Dom from './dom.js';

export default class Sidenav {
	static PLANNING_SUFFIX = '/planning';

	static SPENDING_SUFFIX = '/';

	static SAVING_SUFFIX = '/saving';

	static SETTINGS_SUFFIX = '/settings';

	/** @type {Dom} */
	#sideNavDom = undefined;

	/** @type {HTMLElement} */
	#main = undefined;

	/** @type {boolean} */
	#isOpen = undefined;

	/** @type {Dom} */
	#overlay = undefined;

	#onCloseSidenav = undefined;

	constructor() {
		this.#sideNavDom = new Dom('div').id('sidenav').cls('sidenav').append(
			new Dom('a').cls('view-link').attr('href', Sidenav.PLANNING_SUFFIX).text('Plannings'),
			new Dom('a').cls('view-link').attr('href', Sidenav.SPENDING_SUFFIX).text('Spendings'),
			new Dom('a').cls('view-link').attr('href', Sidenav.SAVING_SUFFIX).text('Savings'),
			new Dom('a').cls('view-link').attr('href', Sidenav.SETTINGS_SUFFIX).text('Settings'),
		);

		this.#overlay = new Dom('div').cls('sidenav-overlay').onClick(this.close.bind(this));
		this.#main = document.getElementById('main');
		this.#onCloseSidenav = this.#onClosedSidenav.bind(this);
		document.body.appendChild(this.#sideNavDom.toHtml());
	}

	toHtml() {
		return this.#sideNavDom.toHtml();
	}

	open() {
		if (this.#isOpen) return;

		document.body.appendChild(this.#overlay.toHtml());

		requestAnimationFrame(() => {
			this.#overlay.toHtml().classList.add('show-sidenav-overlay');
			this.#sideNavDom.toHtml().classList.add('sidenav-open');
			this.#main.classList.add('main-shift-left');
		});

		this.#isOpen = true;
	}

	close() {
		requestAnimationFrame(() => {
			this.#overlay.toHtml().classList.remove('show-sidenav-overlay');
			this.#main.classList.remove('main-shift-left');
			this.#sideNavDom.toHtml().classList.remove('sidenav-open');
			this.#isOpen = false;
			this.#sideNavDom.onTransitionEnd(this.#onCloseSidenav);
		});
		return this;
	}

	#onClosedSidenav() {
		this.#sideNavDom.toHtml().removeEventListener('transitionend', this.#onCloseSidenav);
		document.body.removeChild(this.#overlay.toHtml());
	}
}
