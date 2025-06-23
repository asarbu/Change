export default class Theme {
	static RED = new Theme('red', '#880e0e', '#d81b1b');

	static GREEN = new Theme('green', '#004D40', '#00796B');

	static BLUE = new Theme('blue', '#1A237E', '#5C6BC0');

	static PURPLE = new Theme('purple', '#311B92', '#7E57C2');

	static BLACK = new Theme('black', '#212121', '#757575');

	static fromJson({ name, primaryDarkColor, primaryLightColor } = {}) {
		return new Theme(name, primaryDarkColor, primaryLightColor);
	}

	/**
	 * @param {Theme} name
	 */
	static fromName(name) {
		switch (name) {
		case 'red':
			return Theme.RED;
		case 'green':
			return Theme.GREEN;
		case 'blue':
			return Theme.BLUE;
		case 'purple':
			return Theme.PURPLE;
		case 'black':
			return Theme.BLACK;
		default:
			return Theme.GREEN;
		}
	}

	#name = undefined;

	#primaryDarkColor = undefined;

	#primaryLightColor = undefined;

	/**
	 * @param {string} name Name of the color theme
	 * @param {string} primaryDarkColor Hex RGB value of the color
	 * @param {string} primaryLightColor Hex RGB value of the color
	 */
	constructor(name = 'green', primaryDarkColor = '#004D40', primaryLightColor = '#00796B') {
		this.#name = name;
		this.#primaryDarkColor = primaryDarkColor;
		this.#primaryLightColor = primaryLightColor;
	}

	name() {
		return this.#name;
	}

	primaryDarkColor() {
		return this.#primaryDarkColor;
	}

	primaryLightColor() {
		return this.#primaryLightColor;
	}

	toJson() {
		return {
			name: this.#name,
			primaryDarkColor: this.#primaryDarkColor,
			primaryLightColor: this.#primaryLightColor,
		};
	}
}
