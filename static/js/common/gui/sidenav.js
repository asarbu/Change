import Dom from './dom.js';
import GraphicEffects from './effects.js';

export default class Sidenav {
	static PLANNING_SUFFIX = '/planning';

	static SPENDING_SUFFIX = '/';

	static SAVING_SUFFIX = '/saving';

	static SETTINGS_SUFFIX = '/settings';

	/** @type {Dom} */
	#sideNavDom = undefined;

	/** @type {HTMLDivElement} */
	#sideNavLeft = undefined;

	/** @type {HTMLDivElement} */
	#sideNavRight = undefined;

	/** @type {HTMLElement} */
	#main = undefined;

	/** @type {'left' | 'right'} */
	#navOpenSide = undefined;

	/** @type {GraphicEffects} */
	#gfx = undefined;

	/** @type {HTMLElement} */
	#fragment = undefined;

	constructor(gfx) {
		this.#sideNavDom = new Dom('div').id('sidenav').cls('sidenav').append(
			new Dom('a').cls('view-link').attr('href', Sidenav.PLANNING_SUFFIX).text('Plannings'),
			new Dom('a').cls('view-link').attr('href', Sidenav.SPENDING_SUFFIX).text('Spendings'),
			new Dom('a').cls('view-link').attr('href', Sidenav.SPENDING_SUFFIX).text('Savings'),
			new Dom('a').cls('view-link').attr('href', Sidenav.SPENDING_SUFFIX).text('Settings'),
		);

		this.#fragment = new DocumentFragment();
		this.#sideNavLeft = this.#sideNavDom.toHtml();
		this.#sideNavRight = this.#sideNavLeft.cloneNode(true);
		this.#sideNavLeft.classList.add('sidenav-left');
		this.#sideNavRight.classList.add('sidenav-right');
		this.#fragment.appendChild(this.#sideNavLeft);
		this.#fragment.appendChild(this.#sideNavRight);
		this.#main = document.getElementById('main');

		// TODO Remove this and add event listener individually to each dom element
		document.querySelectorAll('.nav-trigger').forEach((el) => el.addEventListener('click', this.open.bind(this)));

		this.#gfx = gfx;
	}

	toHtml() {
		return this.#fragment;
	}

	/* Nav panel */
	open(ev) {
		const { side } = ev.currentTarget.dataset;
		if (side === 'left') {
			if (this.#navOpenSide === 'left') {
				this.close();
				return;
			}

			this.#sideNavRight.classList.remove('sidenav-open');
			this.#sideNavLeft.classList.add('sidenav-open');
			this.#main.classList.remove('main-shift-right');
			this.#main.classList.add('main-shift-left');

			this.#navOpenSide = 'left';
		} else if (side === 'right') {
			if (this.#navOpenSide === 'right') {
				this.close();
				return;
			}

			this.#sideNavLeft.classList.remove('sidenav-open');
			this.#sideNavRight.classList.add('sidenav-open');
			this.#main.classList.remove('main-shift-left');
			this.#main.classList.add('main-shift-right');

			this.#navOpenSide = 'right';
		}

		this.#main.addEventListener('transitionend', function transitioned() {
			this.#main.removeEventListener('transitionend', transitioned);
		}.bind(this));
	}

	close() {
		this.#sideNavLeft.classList.remove('sidenav-open');
		this.#sideNavRight.classList.remove('sidenav-open');
		this.#main.classList.remove('main-shift-left');
		this.#main.classList.remove('main-shift-right');

		this.#navOpenSide = undefined;
		// TODO check if this registers the tranisioned multiple times
		this.#main.addEventListener('transitionend', function transitioned() {
			this.#main.removeEventListener('transitionend', transitioned);
			this.#gfx.refresh();
		}.bind(this));
	}
}
