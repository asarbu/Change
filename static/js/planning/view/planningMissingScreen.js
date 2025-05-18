import Dom from '../../common/gui/dom.js';
import icons from '../../common/gui/icons.js';
import Sidenav from '../../common/gui/sidenav.js';

export default class PlanningMissingScreen {
	#onClickedGoToSettings = undefined;

	#onClickedFetchDefault = undefined;

	#onClickedCreateNewPlan = undefined;

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
		const createNewPlan = () => { this.#onClickedCreateNewPlan?.(); };
		const onClickOpenSidenav = () => { this.#sidenav.open(); };

		this.#dom = new Dom('div').cls('container').append(
			new Dom('div').cls('section').append(
				new Dom('div').cls('slice').append(
					new Dom('h1').text('Would you like to start planning your spendings?'),
					new Dom('h2').text('In order to user the application, you need to define planning goals for each day/month/year, group them into logical categories, then group categories into statements'),
					new Dom('h3').append(
						new Dom('a').text('Start a new plan from scratch').onClick(createNewPlan).attr('href', '#'),
					),
					new Dom('h1').text('I want to to receive default planning statements'),
					new Dom('h2').text('Receive carefully prepared common planning statements that you can edit later.'),
					new Dom('h3').append(
						new Dom('a').text('Fetch default planning ').onClick(fetchDefault).attr('href', '#'),
					),
					new Dom('h1').text('I want to restore my planning from Google Drive'),
					new Dom('h2').text('If you have used this application in the past and backed up your data, you can sync it from Google Drive.'),
					new Dom('h3').append(
						new Dom('a').text('Go to settings ').onClick(goToSettings).attr('href', '#'),
					),
				),
			),
		);

		this.#navbar = new Dom('nav').append(
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
		mainElement.replaceChildren();
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

	onClickCreateNewPlan(handler) {
		this.#onClickedCreateNewPlan = handler;
	}
}
