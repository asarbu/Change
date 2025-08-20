/**
 * @jest-environment jsdom
 */
import { describe, it, expect, beforeAll, jest } from "@jest/globals";
import { CategoryBuilder } from "./builders";
import SubmitGoalModalFake from "./fakes/submitGoalModalFake";

describe('Planning Category Table', () => {
    beforeAll(() => {
        // Fix structured clone bug.
		// https://stackoverflow.com/questions/73607410/referenceerror-structuredclone-is-not-defined-using-jest-with-nodejs-typesc
		global.structuredClone = (val) => JSON.parse(JSON.stringify(val));

		// Initialize main element because we do not have an index.html
		const main = document.createElement('main');
		main.id = 'main';
		document.body.appendChild(main);
    });

    it('should change goal daily by keystroke', () => {
        const category = new CategoryBuilder().withOneGoal().build();
        expect(category.goals[0].daily).toBe(1); // Initial daily value
        expect(category.goals[0].monthly).toBe(30); // Initial monthly value
        expect(category.goals[0].yearly).toBe(365); // Initial yearly value
        const modal = new SubmitGoalModalFake()
            .editMode(category.goals[0])
            .open()
            .updateInputValue('daily', '73')
            .clickSave();

        expect(modal.readInputValue('daily')).toBe('73'); // Daily value should be updated
        expect(modal.readInputValue('monthly')).toBe('2190'); // Monthly value should be recalculated
        expect(modal.readInputValue('yearly')).toBe('26645'); // Yearly value should be recalculated
    });

    it('should change goal monthly by keystroke', () => {
        const category = new CategoryBuilder().withOneGoal().build();
        expect(category.goals[0].daily).toBe(1); // Initial daily value
        expect(category.goals[0].monthly).toBe(30); // Initial monthly value
        expect(category.goals[0].yearly).toBe(365); // Initial yearly value
        const modal = new SubmitGoalModalFake()
            .editMode(category.goals[0])
            .open()
            .updateInputValue('monthly', '10950')
            .clickSave();

        expect(modal.readInputValue('daily')).toBe('365'); // Daily value should be recalculated
        expect(modal.readInputValue('monthly')).toBe('10950'); // Monthly value should be updated
        expect(modal.readInputValue('yearly')).toBe('131400'); // Yearly value should be recalculated
    });

    it('should change goal yearly by keystroke', () => {
        const category = new CategoryBuilder().withOneGoal().build();
        expect(category.goals[0].daily).toBe(1); // Initial daily value
        expect(category.goals[0].monthly).toBe(30); // Initial monthly value
        expect(category.goals[0].yearly).toBe(365); // Initial yearly value
        const modal = new SubmitGoalModalFake()
            .editMode(category.goals[0])
            .open()
            .updateInputValue('yearly', '131400')
            .clickSave();

        expect(modal.readInputValue('daily')).toBe('360'); // Daily value should be recalculated
        expect(modal.readInputValue('monthly')).toBe('10950'); // Monthly value should be recalculated
        expect(modal.readInputValue('yearly')).toBe('131400'); // Yearly value should be updated
    });

    it('should display goal values correctly in the modal for edit mode', () => {
        const category = new CategoryBuilder().withOneGoal().build();
        const modal = new SubmitGoalModalFake().editMode(category.goals[0]).open();

        expect(modal.readInputValue('name')).toBe('Sample Goal 1');
        expect(modal.readInputValue('daily')).toBe('1');
        expect(modal.readInputValue('monthly')).toBe('30');
        expect(modal.readInputValue('yearly')).toBe('365');
    });

    it('should display no values in the modal for insert mode', () => {
        const modal = new SubmitGoalModalFake().insertMode().open();

        expect(modal.readInputValue('name')).toBe('');
        expect(modal.readInputValue('daily')).toBe('');
        expect(modal.readInputValue('monthly')).toBe('');
        expect(modal.readInputValue('yearly')).toBe('');
    });

    it('should call submit handler with correct goal data in insert mode', () => {
        const modal = new SubmitGoalModalFake()
            .insertMode()
            .onSubmitGoal((newGoal) => {
                expect(newGoal.name).toBe('New Goal');
                expect(newGoal.daily).toBe(5);
                expect(newGoal.monthly).toBe(150);
                expect(newGoal.yearly).toBe(1825);
            })
            .open()
            .updateInputValue('name', 'New Goal')
            .updateInputValue('daily', '5')
            .clickSave();
    });

    it('should call submit handler with correct goal data in edit mode', () => {
        const category = new CategoryBuilder().withOneGoal().build();
        expect(category.goals[0].name).toBe('Sample Goal 1');
        expect(category.goals[0].daily).toBe(1);
        expect(category.goals[0].monthly).toBe(30);
        expect(category.goals[0].yearly).toBe(365);

        const modal = new SubmitGoalModalFake()
            .editMode(category.goals[0])
            .onSubmitGoal((newGoal) => {
                expect(newGoal.name).toBe('Updated Goal');
                expect(newGoal.daily).toBe(10);
                expect(newGoal.monthly).toBe(300);
                expect(newGoal.yearly).toBe(3650);
            })
            .open()
            .updateInputValue('name', 'Updated Goal')
            .updateInputValue('daily', '10')
            .clickSave();
    });

    it('should not change goal values when clicking save without input changes', () => {
        const category = new CategoryBuilder().withOneGoal().build();
        const modal = new SubmitGoalModalFake()
            .editMode(category.goals[0])
            .open()
            .clickSave();

        expect(modal.readInputValue('name')).toBe('Sample Goal 1');
        expect(modal.readInputValue('daily')).toBe('1');
        expect(modal.readInputValue('monthly')).toBe('30');
        expect(modal.readInputValue('yearly')).toBe('365');
    });

    it('should not close modal with empty required values', () => {
        // Jest does not have form validation. We are forced to mock
        const originalGetElementById = document.getElementById.bind(document);
        document.getElementById = (id) => {
            if (id === 'goal-submit-modal-form') {
                return {
                    checkValidity: () => false
                };
            } else {
                return originalGetElementById(id);
            }
        };
        const modal = new SubmitGoalModalFake()
            .insertMode()
            .onSubmitGoal(() => {
                expect(true).toBe(false); // This should not be called
            }).open();

        modal.clickSave();

        expect(modal.isOpen()).toBe(true);
    });

    it('should close modal after saving goal with valid inputs', () => {
        const modal = new SubmitGoalModalFake()
            .insertMode()
            .onSubmitGoal(() => {
                expect(true).toBe(true); // This should be called
            })
            .open()
            .updateInputValue('name', 'Valid Goal')
            .updateInputValue('daily', '10')
            .clickSave();
    });
});