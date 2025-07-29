import Dom from '../../common/gui/dom.js';
import Modal from '../../common/gui/modal.js';
import { Goal } from '../model/planningModel.js';

export default class SubmitGoalModal extends Modal {
	#goal;

	#onSubmitHandler = null;

	#inputs = null;

	#editMode = false;

	constructor() {
		super('SubmitGoalModal');
		this.buildModal();
	}

	/**
	 * Set the save handler
	 * @param {function(Goal):void} handler
	 */
	onSubmitGoal(handler) {
		this.#onSubmitHandler = handler;
		return this;
	}

	/**
	 * Build the modal DOM
	 */
	buildModal() {
		this.#inputs = {
			name: new Dom('input').type('text').attr('required', true),
			daily: new Dom('input').type('number').attr('required', true).onKeyUp(() => {
				const daily = +this.#inputs.daily.toHtml().value;
				this.#inputs.monthly.toHtml().value = Math.ceil((daily * 30));
				this.#inputs.yearly.toHtml().value = Math.ceil((daily * 365));
			}),
			monthly: new Dom('input').type('number').attr('required', true).onKeyUp(() => {
				const monthly = +this.#inputs.monthly.toHtml().value;
				this.#inputs.daily.toHtml().value = Math.ceil((monthly / 30));
				this.#inputs.yearly.toHtml().value = Math.ceil((monthly * 12));
			}),
			yearly: new Dom('input').type('number').attr('required', true).onKeyUp(() => {
				const yearly = +this.#inputs.yearly.toHtml().value;
				this.#inputs.daily.toHtml().value = Math.ceil((yearly / 365));
				this.#inputs.monthly.toHtml().value = Math.ceil((yearly / 12));
			}),
		};

		this.header(new Dom('h2').text('Insert Goal'))
			.body(
				new Dom('form').append(
					new Dom('div').cls('input-field').append(
						this.#inputs.name,
						new Dom('label').text('Name: '),
					),
					new Dom('div').cls('input-field').append(
						this.#inputs.daily,
						new Dom('label').text('Daily: '),
					),
					new Dom('div').cls('input-field').append(
						this.#inputs.monthly,
						new Dom('label').text('Monthly: '),
					),
					new Dom('div').cls('input-field').append(
						this.#inputs.yearly,
						new Dom('label').text('Yearly: '),
					),
					new Dom('input').type('submit').hide().onClick(this.#onSubmitHandler),
				),
			);

		this.addFooterWithActionButton('Save', this.#saveGoal);
		return this;
	}

	/**
	 * Save the goal and call the handler
	 */
	#saveGoal = () => {
		const newGoal = new Goal(
			this.#inputs.name.toHtml().value,
			+this.#inputs.daily.toHtml().value,
			+this.#inputs.monthly.toHtml().value,
			+this.#inputs.yearly.toHtml().value,
		);
		this.#onSubmitHandler?.(newGoal);
	};

	/**
	 * @param {Goal} goal
	 */
	editMode(goal) {
		this.#editMode = true;
		this.header(new Dom('h2').text('Edit Goal'));
		this.#goal = goal;

		this.#inputs.name.toHtml().value = goal.name;
		this.#inputs.daily.toHtml().value = goal.daily;
		this.#inputs.monthly.toHtml().value = goal.monthly;
		this.#inputs.yearly.toHtml().value = goal.yearly;

		return this;
	}

	insertMode() {
		this.#editMode = false;

		this.header(new Dom('h2').text('Insert Goal'));
		this.#goal = new Goal('', 0, 0, 0);

		this.#inputs.name.toHtml().value = '';
		this.#inputs.daily.toHtml().value = '';
		this.#inputs.monthly.toHtml().value = '';
		this.#inputs.yearly.toHtml().value = '';

		return this;
	}
}
