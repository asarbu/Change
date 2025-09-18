/**
 * @jest-environment jsdom
 */
import { describe, it, expect, beforeAll, jest } from "@jest/globals";
import SpendingsBuilder from "./builders";
import SpendingSubmitModal from '../../static/js/spending/view/spendingSubmitModal.js';

describe('Spending Submit Modal', () => {
    beforeAll(() => {
        // Fix structured clone bug.
        // https://stackoverflow.com/questions/73607410/referenceerror-structuredclone-is-not-defined-using-jest-with-nodejs-typesc
        global.structuredClone = (val) => JSON.parse(JSON.stringify(val));

        // Initialize main element because we do not have an index.html
        const main = document.createElement('main');
        main.id = 'main';
        document.body.appendChild(main);
    });



    it('Should display spending correctly in edit mode', () => {
        const builder = new SpendingsBuilder();
        const spendings = builder.oneSpending().create();
        const categories = builder.categories();
        const modal = new SpendingSubmitModalFake(categories, 2001, 1, 1).editMode(spendings[0]);

        expect(modal.readInputValue('amount')).toBe('10');
        expect(modal.readInputValue('date')).toBe('2001-02-01');
        expect(modal.readInputValue('category')).toBe('Food');
        expect(modal.readInputValue('description')).toBe('Bread');
    });
})
