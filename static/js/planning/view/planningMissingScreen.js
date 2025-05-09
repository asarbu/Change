import Dom from '../../common/gui/dom.js';
import icons from '../../common/gui/icons.js';
import Sidenav from '../../common/gui/sidenav.js';

export default class PlanningTutorialScreen {
	#onClickedGoToSettings = undefined;

	#onClickedFetchDefault = undefined;

	#navbar = undefined;

	/** @type {Sidenav} */
	#sidenav = undefined;

	/**
	 * @type {Dom}
	 */
	#dom = undefined;

	constructor() {
		this.#sidenav = new Sidenav();

		const goToSettings = () => { this.#onClickedGoToSettings?.(); };
		const fetchDefault = () => { this.#onClickedFetchDefault?.(); };
		const onClickAddStatement = () => {};
		const onClickOpenSidenav = () => { this.#sidenav.open(); };

		this.#dom = new Dom('div').cls('container').append(
			new Dom('div').cls('section').append(
				new Dom('div').cls('slice').append(
					new Dom('h1').text('There is currently no planning available'),
					new Dom('ul').cls('list').append(
						new Dom('li').append(
							new Dom('span').text('You can create a new planning by clicking on the navbar button below.'),
						),
						new Dom('li').append(
							new Dom('span').text('You can also '),
							new Dom('a').text('fetch a default planning ').onClick(fetchDefault).attr('href', '#'),
						),
						new Dom('li').append(
							new Dom('span').text('Alternatively, you can '),
							new Dom('a').text('go to settings ').onClick(goToSettings).attr('href', '#'),
							new Dom('span').text('and enable synchronization to Google Drive.'),
						),
					),
				),
			),
		);

		this.#navbar = new Dom('nav').append(
			new Dom('div').cls('nav-header').append(
				new Dom('button').id('planning-add-statement').cls('nav-item').onClick(onClickAddStatement)
					.append(
						new Dom('img').cls('white-fill').text('Add Statement').attr('alt', 'Add Statement').attr('src', icons.add_file),
					),
			),
			new Dom('div').cls('nav-footer').append(
				new Dom('button').cls('nav-item', 'nav-trigger').onClick(onClickOpenSidenav).append(
					new Dom('img').cls('white-fill').text('Menu').attr('alt', 'Menu').attr('src', icons.menu),
				),
			),
			new Dom('div').cls('dropup-content', 'top-round').hide(),
		);
	}

	init() {
		const mainElement = document.getElementById('main');
		mainElement.appendChild(this.#dom.toHtml());
		mainElement.appendChild(this.#navbar.toHtml());

		return this;
	}

	onClickFetchDefault(handler) {
		this.#onClickedFetchDefault = handler;
	}

	onClickGoToSettings(handler) {
		this.#onClickedGoToSettings = handler;
	}
}
