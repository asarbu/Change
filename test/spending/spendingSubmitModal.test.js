/**
 * @jest-environment jsdom
 */
import { describe, it, expect, beforeAll, jest } from "@jest/globals";
import SpendingsBuilder from "./builders";
import SpendingSubmitModalFake from "./fakes/spendingSubmitModalFake.js";
import SpendingCategoryModal from "../../static/js/spending/view/spendingCategoryModal.js";

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
        const modal = new SpendingSubmitModalFake(categories, 2001, 1, 1)
            .editMode(spendings[0]);

        expect(modal.readInputValue('date')).toBe('2001-02-01');
        expect(modal.readInputValue('category')).toBe('Food');
        expect(modal.readInputValue('description')).toBe('Bread');
        expect(modal.readInputValue('price')).toBe('10');
    });

    it('Should display empty fields in insert mode', () => {
        const builder = new SpendingsBuilder();
        const categories = builder.categories();
        const modal = new SpendingSubmitModalFake(categories, 2001, 1, 1)
            .insertMode();

        expect(modal.readInputValue('date')).toBe('2001-02-01');
        expect(modal.readInputValue('category')).toBe('');
        expect(modal.readInputValue('description')).toBe('');
        expect(modal.readInputValue('price')).toBe('');
    });

    it('Should not call onSubmit callback when form is invalid', () => {
        const builder = new SpendingsBuilder();
        const categories = builder.categories();
        const onSubmit = jest.fn();
        new SpendingSubmitModalFake(categories, 2001, 1, 1)
            .insertMode()
            .onSubmit(onSubmit)
            .open()
            .clickSave();

        expect(onSubmit).not.toHaveBeenCalled();
    });

    it('Should call onSubmit callback when form is valid', () => {
        const builder = new SpendingsBuilder();
        const categories = builder.categories();
        const modal = new SpendingSubmitModalFake(categories, 2001, 1, 1)
            .insertMode()
            .onSubmit((expectedSpending) => {
                expect(expectedSpending.spentOn).toEqual(new Date('2001-02-01'));
                expect(expectedSpending.category).toEqual('Food');
                expect(expectedSpending.description).toEqual('Bread');
                expect(expectedSpending.price).toEqual(10);
            })
            .open()
            .setInputValue('date', '2001-02-01')
            .setInputValue('category', 'Food')
            .setInputValue('description', 'Bread')
            .setInputValue('price', '10')
            .clickSave();
    });

    it('Should open category modal when clicking category input', () => {
        const builder = new SpendingsBuilder();
        const categories = builder.categories();
        
        const modal = new SpendingSubmitModalFake(categories, 2001, 1, 1)
            .insertMode()
            .openCategoryModal();
        
        expect(modal instanceof SpendingCategoryModal).toBe(true);
    });

    it('Should update category input when selecting a category', () => {
        const builder = new SpendingsBuilder();
        const categories = builder.categories();
        const spendingModal = new SpendingSubmitModalFake(categories, 2001, 1, 1)
            .insertMode()
            .open();
        
        spendingModal
            .openCategoryModal()
            .toHtml()
            .querySelector('.accordion-secondary')
            .onclick({ target: { textContent: 'Food' } });

        expect(spendingModal.readInputValue('category')).toBe('Food');
    });
})
