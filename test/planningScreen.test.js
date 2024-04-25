/**
 * @jest-environment jsdom
 */

import { describe, expect, test } from "@jest/globals";
import Planning, { Goal } from "../static/js/planning/model/planningModel";
import PlanningScreen from "../static/js/planning/view/planningScreen";

describe('Planning screen', () => {
	test('build one goal', async() => {
        const goal = new Goal('Goal One', 10, 30, 3650);
        const planning = new Planning(1, 1970, 0, []);
        const screen = new PlanningScreen(planning);
        /** @type {HTMLTableRowElement} */
        const row = screen.buildGoal(goal).toHtml();
        expect(row).toBeDefined();
        const children = row.childNodes;
        expect(children[0].textContent).toBe('Goal One');
        expect(children[1].textContent).toBe('10');
        expect(children[2].textContent).toBe('30');
        expect(children[3].textContent).toBe('3650');
    });
});