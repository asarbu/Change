/**
 * @jest-environment jsdom
 */
import { expect, it } from "@jest/globals";
import GDriveSettings from "../../static/js/settings/model/gDriveSettings";
import PlanningTableSettings from "../../static/js/settings/model/planiningTableSettings";
import Settings from "../../static/js/settings/model/settings";
import Theme from "../../static/js/settings/model/theme";
import { CategoryBuilder } from "./builders";
import PlanningCategoryTableFake from "./fakes/planningCategoryTableFake";
import SubmitGoalModal from "../../static/js/planning/view/submitGoal";

describe('Planning Category Table', () => {
    const settings = new Settings(new GDriveSettings(false, false), Theme.BLACK, new PlanningTableSettings([PlanningTableSettings.COLUMN_NAMES]));

    beforeAll(async () => {
        // Fix structured clone bug.
        // https://stackoverflow.com/questions/73607410/referenceerror-structuredclone-is-not-defined-using-jest-with-nodejs-typesc
        global.structuredClone = (val) => JSON.parse(JSON.stringify(val));

        // Initialize main elements because we do not have an index.html
        const main = document.createElement('main');
        main.id = 'main';
        document.body.appendChild(main);
    });
    
    it('should render no table when no categories are present', () => {
        const visibleColumns = ['Name', 'Daily', 'Monthly', 'Yearly'];

        const tableElement = new PlanningCategoryTableFake(undefined, visibleColumns).refresh().toHtml();

        //There is one hidden delete column
        expect(tableElement.querySelectorAll('thead').length).toBe(0);
    });

    it('should render a table with one empty category', () => {
        const visibleColumns = ['Name', 'Daily', 'Monthly', 'Yearly'];
        const category = new CategoryBuilder().build();
        
        const tableElement = new PlanningCategoryTableFake(category, visibleColumns).refresh().toHtml();
        
        expect(tableElement.querySelectorAll('thead tr th').length).toBe(5); // 4 visible columns + 1 delete column
        expect(tableElement.querySelectorAll('tbody tr').length).toBe(0);
    });

    it('should render a table with one category with one goal', () => {
        const visibleColumns = ['Name', 'Daily', 'Monthly', 'Yearly'];
        const category = new CategoryBuilder().withOneGoal().build();
        
        const tableElement = new PlanningCategoryTableFake(category, visibleColumns).refresh().toHtml();
        
        expect(tableElement.querySelectorAll('thead tr th').length).toBe(5); // 4 visible columns + 1 delete column
        expect(tableElement.querySelectorAll('tbody tr').length).toBe(1);
        expect(tableElement.querySelector('tbody tr td').textContent).toBe('Sample Goal 1');
    });

    it('should render a table with one category with multiple goals', () => {
        const visibleColumns = ['Name', 'Daily', 'Monthly', 'Yearly'];
        const category = new CategoryBuilder().withFourGoals().build();
        
        const tableElement = new PlanningCategoryTableFake(category, visibleColumns).refresh().toHtml();
        
        expect(tableElement.querySelectorAll('thead tr th').length).toBe(5); // 4 visible columns + 1 delete column
        expect(tableElement.querySelectorAll('tbody tr').length).toBe(4);
        expect(tableElement.querySelector('tbody tr td').textContent).toBe('Sample Goal 1');
    });

    it('should render a table with one category, one goal and only name column visible', () => {
        const visibleColumns = ['Name'];
        const category = new CategoryBuilder().withOneGoal().build();
        
        const tableElement = new PlanningCategoryTableFake(category, visibleColumns).refresh().toHtml();
        
        expect(tableElement.querySelectorAll('thead tr th').length).toBe(2); // 1 visible column + 1 delete column
        expect(tableElement.querySelectorAll('tbody tr').length).toBe(1);
        expect(tableElement.querySelector('tbody tr td').textContent).toBe('Sample Goal 1');
    });

    it('should render a table with one category, one goal and only daily column visible', () => {
        const visibleColumns = ['Daily'];
        const category = new CategoryBuilder().withOneGoal().build();
        
        const tableElement = new PlanningCategoryTableFake(category, visibleColumns).refresh().toHtml();
        
        expect(tableElement.querySelectorAll('thead tr th').length).toBe(2);
        expect(tableElement.querySelectorAll('tbody tr').length).toBe(1);
        expect(tableElement.querySelector('tbody tr td').textContent).toBe('1');
    });

    it('should render a table with one category, one goal and only monthly column visible', () => {
        const visibleColumns = ['Monthly'];
        const category = new CategoryBuilder().withOneGoal().build();
        
        const tableElement = new PlanningCategoryTableFake(category, visibleColumns).refresh().toHtml();
        
        expect(tableElement.querySelectorAll('thead tr th').length).toBe(2);
        expect(tableElement.querySelectorAll('tbody tr').length).toBe(1);
        expect(tableElement.querySelector('tbody tr td').textContent).toBe('30');
    });

    it('should render a table with one category, one goal and only yearly column visible', () => {
        const visibleColumns = ['Yearly'];
        const category = new CategoryBuilder().withOneGoal().build();
        
        const tableElement = new PlanningCategoryTableFake(category, visibleColumns).refresh().toHtml();
        
        expect(tableElement.querySelectorAll('thead tr th').length).toBe(2);
        expect(tableElement.querySelectorAll('tbody tr').length).toBe(1);
        expect(tableElement.querySelector('tbody tr td').textContent).toBe('365');
    });

    it('should render no table if no columns are visible', () => {
        const visibleColumns = [];
        const category = new CategoryBuilder().withOneGoal().build();
        
        const tableElement = new PlanningCategoryTableFake(category, visibleColumns).refresh().toHtml();
        
        expect(tableElement.querySelectorAll('thead tr th').length).toBe(0); // Do not render header if no columns are visible
        expect(tableElement.querySelectorAll('tbody tr').length).toBe(0);
    });

    it('should handle undefined category gracefully', () => {
        const visibleColumns = ['Name', 'Daily', 'Monthly', 'Yearly']; 

        const tableElement = new PlanningCategoryTableFake(undefined, visibleColumns).refresh().toHtml();

        expect(tableElement.querySelectorAll('thead tr th').length).toBe(0); //
        expect(tableElement.querySelectorAll('tbody tr').length).toBe(0);
    });

    it('should handle undefined visible columns gracefully', () => {
        const category = new CategoryBuilder().withOneGoal().build();

        const tableElement = new PlanningCategoryTableFake(category).refresh().toHtml();

        expect(tableElement.querySelectorAll('thead tr th').length).toBe(0); // Do not render header if no columns are visible
        expect(tableElement.querySelectorAll('tbody tr').length).toBe(0);
    });

    it('should compute totals correctly', () => {
        const visibleColumns = ['Name', 'Daily', 'Monthly', 'Yearly'];
        const category = new CategoryBuilder().withFourGoals().build();
        
        const tableElement = new PlanningCategoryTableFake(category, visibleColumns).refresh().toHtml();
        
        const footerRow = tableElement.querySelector('tfoot tr');
        expect(footerRow.querySelectorAll('td').length).toBe(5); // 4 visible columns + 1 add column
        expect(footerRow.querySelector('td').textContent).toBe('Total');
        expect(footerRow.querySelectorAll('td')[1].textContent).toBe('10'); // Total Daily
        expect(footerRow.querySelectorAll('td')[2].textContent).toBe('300'); // Total Monthly
        expect(footerRow.querySelectorAll('td')[3].textContent).toBe('3650'); // Total Yearly
    });

    it('Should call delete category handler when delete button is clicked', () => {
        const visibleColumns = ['Name', 'Daily', 'Monthly', 'Yearly'];
        const category = new CategoryBuilder().withOneGoal().build();
        const onDeleteCategoryHandler = () => { 
            expect(true).toBeTruthy(); 
        };
        const tableElement = new PlanningCategoryTableFake(category, visibleColumns)
            .onDeleteCategory(onDeleteCategoryHandler)
            .refresh()
            .toHtml();
        const deleteButton = tableElement.querySelector('th.narrow-col button');

        deleteButton.click();
    });

    it('Should not display delete button when edit mode is disabled', () => {
        const visibleColumns = ['Name', 'Daily', 'Monthly', 'Yearly'];
        const category = new CategoryBuilder().withOneGoal().build();

        const tableElement = new PlanningCategoryTableFake(category, visibleColumns)
            .refresh()
            .toNormalMode()
            .toHtml();

        const deleteTh = tableElement.querySelectorAll('th')[4];
        expect(deleteTh.style.display).toBe('none');
    });

    it('Should display delete button when edit mode is enabled', () => {
        const visibleColumns = ['Name', 'Daily', 'Monthly', 'Yearly'];
        const category = new CategoryBuilder().withOneGoal().build();

        const tableElement = new PlanningCategoryTableFake(category, visibleColumns)
            .refresh()
            .toEditMode()
            .toHtml();
        
        const headerCells = tableElement.querySelectorAll('thead tr th');
        expect(headerCells.length).toBe(5); // 4 visible columns + 1 delete column
        headerCells.forEach((cell) => {
            expect(cell.style.display).not.toBe('none'); // All columns should be visible
        });
    });

    it('should delete the only goal when delete button is clicked', () => {
        const visibleColumns = ['Name', 'Daily', 'Monthly', 'Yearly'];
        const category = new CategoryBuilder().withOneGoal().build();
        const tableElement = new PlanningCategoryTableFake(category, visibleColumns)
            .refresh()
            .toHtml();
        const deleteButton = tableElement.querySelector('tbody tr td button');

        deleteButton.click();

        expect(category.goals.length).toBe(0); // Goal should be deleted
    });

    it('should delete a specific goal when its delete button is clicked', () => {
        const visibleColumns = ['Name', 'Daily', 'Monthly', 'Yearly'];
        const category = new CategoryBuilder().withFourGoals().build();
        const tableElement = new PlanningCategoryTableFake(category, visibleColumns)
            .refresh()
            .toHtml();
        const deleteButtons = tableElement.querySelectorAll('tbody tr td button');

        deleteButtons[1].click(); // Click the delete button for 'Sample Goal 2'
        expect(category.goals.length).toBe(3); // One goal should be deleted
        expect(category.goals.some(goal => goal.name === 'Sample Goal 2')).toBe(false); // 'Sample Goal 2' should not be present
    });

    it('should open submit goal modal when a goal is clicked in edit mode', () => {
        const visibleColumns = ['Name', 'Daily', 'Monthly', 'Yearly'];
        const category = new CategoryBuilder().withOneGoal().build();
        const tableElement = new PlanningCategoryTableFake(category, visibleColumns)
            .toEditMode()
            .refresh();

        const modal = tableElement.clickGoalName(category.goals[0]);

        expect(modal).toBeDefined();
    });

    it('should not open modal when clicking a goal in normal mode', () => {
        const visibleColumns = ['Name', 'Daily', 'Monthly', 'Yearly'];
        const category = new CategoryBuilder().withOneGoal().build();
        const tableElement = new PlanningCategoryTableFake(category, visibleColumns)
            .refresh();

        const modal = tableElement.clickGoalName(category.goals[0]);

        expect(modal).toBeUndefined(); // No modal should be opened in normal mode
    });

    it('should add a new goal when "Add Goal" button is clicked', () => {
        const visibleColumns = ['Name', 'Daily', 'Monthly', 'Yearly'];
        const category = new CategoryBuilder().withOneGoal().build();
        const tableElement = new PlanningCategoryTableFake(category, visibleColumns)
            .refresh()
            .toEditMode();

        /** @type {SubmitGoalModal} */
        const modal = tableElement.clickAddGoal();
        modal.toHtml().querySelector('#submit-goal').onclick();

        expect(category.goals.length).toBe(2);
    });

    it('should edit goal when a goal is clicked in edit mode', () => {
        const visibleColumns = ['Name', 'Daily', 'Monthly', 'Yearly'];
        const category = new CategoryBuilder().withOneGoal().build();
        const tableElement = new PlanningCategoryTableFake(category, visibleColumns)
            .toEditMode()
            .refresh();

        /** @type {SubmitGoalModal} */
        const modal = tableElement.clickGoalName(category.goals[0]);
        modal.toHtml().querySelector('#goal-submit-modal-name').value = 'Updated Goal';
        modal.toHtml().querySelector('#goal-submit-modal-daily').value = '2';
        modal.toHtml().querySelector('#submit-goal').onclick();

        expect(category.goals.length).toBe(1);
        expect(category.goals[0].name).toBe('Updated Goal');
        expect(category.goals[0].daily).toBe(2);
    });
});
