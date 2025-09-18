import Spending from '../../static/js/spending/model/spending.js';

export default class SpendingsBuilder {
    constructor() {
        this.spendings = [];
    }

    oneSpending() {
        this.spendings.push(new Spending('spending-1', '', new Date(2001, 1,1), 'Food', 'Bread', 10));
        return this;
    }

    twoSpendings() {
        this.spendings.push(new Spending('spending-1', '', new Date(2001, 1,1), 'Food', 'Bread', 10));
        this.spendings.push(new Spending('spending-2', '', new Date(2001, 1,2), 'Transport', 'Bus', 5));
        return this;
    }

    categories() {
        return ['Food', 'Transport', 'Entertainment', 'Health', 'Other'];
    }

    create() {
        return this.spendings;
    }
}
