import SubmitGoalModal from "../../../static/js/planning/view/submitGoal";

export default class SubmitGoalModalFake extends SubmitGoalModal {
    constructor() {
        super();
    }

	/**
	 * 
	 * @param {string} name 
	 * @param {string} value 
	 */
	updateInputValue(name, value) {
		const input = this.toHtml().querySelector(`#goal-submit-modal-${name}`);
		input.focus();
		input.value = ''; // Clear the input before typing
		for (let i = 0; i < value.length; i++) {
			input.value += value.charAt(i); // Update the input value
			input.dispatchEvent(new KeyboardEvent('keyup', { key: value.charAt(i) }));
			input.dispatchEvent(new Event('input', { bubbles: true }));
		}
		return this;
	}

	readInputValue(name) {
		return this.toHtml().querySelector(`#goal-submit-modal-${name}`).value;
	}

	clickSave() {
		this.toHtml().querySelector('#submit-goal').onclick();
		return this;
	}
}