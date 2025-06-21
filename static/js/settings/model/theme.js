export default class Theme {
	static RED = new Theme('red');

	static GREEN = new Theme('green');

	static BLUE = new Theme('blue');

	static PURPLE = new Theme('purple');

	static BLACK = new Theme('black');

	static fromJson({ name } = {}) {
		return new Theme(name);
	}

	#name = undefined;

	constructor(name = '') {
		this.#name = name;
	}

	name() {
		return this.#name;
	}

	toJson() {
		return { name: this.#name };
	}
}
