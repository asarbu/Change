import { Category, Goal } from '../../static/js/planning/model/planningModel.js';
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
        return [
            new Category(1, 'Vital Expenses', [new Goal('Food', 1, 30, 364)]), 
            new Category(2, 'Transport', [new Goal('Public transport')]),
            new Category(3, 'Household', [new Goal('Electricity', 1, 30, 365)]),
            new Category(4, 'Wasted money', [new Goal('Cigarettes', 1, 30, 365)]),
        ];
    }

    create() {
        return this.spendings;
    }
}
