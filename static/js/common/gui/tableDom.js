import Dom from './dom.js';

export default class TableDom extends Dom {
	/** @type {Dom} */
	#thead = undefined;

	/** @type {Dom} */
	#tbody = undefined;

	/** @type {Dom} */
	#tfoot = undefined;

	/** @type {boolean} */
	#pausedSorting = undefined;

	constructor() {
		super('table');
		this.#thead = new Dom('thead');
		this.#tbody = new Dom('tbody');
		this.#tfoot = new Dom('tfoot');
		this.append(
			this.#thead,
			this.#tbody,
			this.#tfoot,
		);
	}

	thead(...domElements) {
		this.#thead.append(...domElements);
		this.sortable();
		return this;
	}

	tbody(...domElements) {
		this.#tbody.append(...domElements);
		return this;
	}

	theadDom() {
		return this.#thead;
	}

	tbodyDom() {
		return this.#tbody;
	}

	tfootDom() {
		return this.#tfoot;
	}

	tfoot(...domElements) {
		this.#tfoot.clear().append(...domElements);
		return this;
	}

	sortable() {
		this.#thead.toHtml().querySelectorAll('th')
			.forEach((th, colIndex) => th.addEventListener('click', () => this.#sortTableByColumnAsc(colIndex)));
		return this;
	}

	pauseSorting() {
		this.#pausedSorting = true;
		return this;
	}

	resumeSorting() {
		this.#pausedSorting = false;
		return this;
	}

	#sortTableByColumnAsc = (columnIndex) => {
		if (this.#pausedSorting) return;
		Array.from(this.#tbody.toHtml().querySelectorAll('tr'))
			// TODO Instead of text, filter by internal data (e.g timestamp instead of Date column value)
			.sort((a, b) => {
				const aText = a.children[columnIndex].textContent.trim();
				const bText = b.children[columnIndex].textContent.trim();
				const aNum = parseFloat(aText.replace(/[^\d.-]/g, ''));
				const bNum = parseFloat(bText.replace(/[^\d.-]/g, ''));
				if (!Number.isNaN(aNum) && !Number.isNaN(bNum)) {
					return aNum - bNum;
				}
				return aText.localeCompare(bText);
			})
			.forEach((row) => this.#tbody.append(row));
	};
}
