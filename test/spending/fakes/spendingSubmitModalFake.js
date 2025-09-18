import SpendingSubmitModal from "../../../static/js/spending/view/spendingSubmitModal";

export default class SpendingSubmitModalFake  extends SpendingSubmitModal {
    constructor(categories, year, month, day) {
        super(categories, year, month, day);
    }

    // Read value from input field by id.
    readInputValue(id) {
        const input = document.getElementById(id);
        if (input) {
            return input.value;
        }
        return null;
    }
}