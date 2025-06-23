export default class Theme {
	/** Colors are chosen by using OKLCH color space with a 0.4 (dark) and 0.55 (light) luminance
	 * The chroma is kept at .16 (where possible. For Green RGB caps at 0.1) and varying the hue.
	 * TODO change RGB color space to OKLCH
	 */

	static RED = new Theme('red', 'oklch(0.3 0.15 20)', 'oklch(0.5 0.15 20)');

	static GREEN = new Theme('green', 'oklch(0.3 0.15 180)', 'oklch(0.5 0.15 180)');

	static BLUE = new Theme('blue', 'oklch(0.3 0.15 270)', 'oklch(0.5 0.15 270)');

	static PURPLE = new Theme('purple', 'oklch(0.3 0.15 290)', 'oklch(0.5 0.15 290)');

	static BLACK = new Theme('black', 'oklch(0.3 0 0)', 'oklch(0.5 0 0)');

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
	constructor(name = 'green', primaryDarkColor = 'oklch(0.4 0.16 170)', primaryLightColor = 'oklch(0.55 0.16 170)') {
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
