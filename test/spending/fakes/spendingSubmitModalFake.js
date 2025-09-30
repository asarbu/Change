import SpendingSubmitModal from "../../../static/js/spending/view/spendingSubmitModal";

export default class SpendingSubmitModalFake  extends SpendingSubmitModal {
    constructor(categories, year, month, day) {
        super(categories, year, month, day);
    }

    // Read value from input field by id.
    readInputValue(id) {
        const modal = this.toHtml();
        const input = modal.querySelector(`#${id}`);
        if (input) {
            return input.value;
        }
        return null;
    }

    	/**
	 * 
	 * @param {string} name 
	 * @param {string} value 
	 */
	updateInputValue(name, value) {
		const input = this.toHtml().querySelector(`#${name}`);
		input.focus();
		input.value = ''; // Clear the input before typing
		for (let i = 0; i < value.length; i++) {
			input.value += value.charAt(i); // Update the input value
			input.dispatchEvent(new KeyboardEvent('keyup', { key: value.charAt(i) }));
			input.dispatchEvent(new Event('input', { bubbles: true }));
		}
		return this;
	}

    setInputValue(id, value) {
        const modal = this.toHtml();
        const input = modal.querySelector(`#${id}`);
        if (input) {
            input.value = value;
            input.dispatchEvent(new Event('input', { bubbles: true }));
            input.dispatchEvent(new Event('change', { bubbles: true }));
        }
        return this;
    }

    clickSave() {
		return this.toHtml().querySelector('#submit-spending').onclick();
	}
}