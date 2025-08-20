import Dom from '../../common/gui/dom.js';
import Modal from '../../common/gui/modal.js';
import { Goal } from '../model/planningModel.js';

export default class SubmitGoalModal extends Modal {
	#onSubmitHandler = null;

	/** @type {Object<string, Dom>} */
	#inputs = null;

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
			name: new Dom('input').id('goal-submit-modal-name').type('text').attr('required', true),
			daily: new Dom('input').id('goal-submit-modal-daily').type('number').attr('required', true).onKeyUp(() => {
				const daily = +this.#inputs.daily.toHtml().value;
				this.#inputs.monthly.toHtml().value = Math.ceil((daily * 30));
				this.#inputs.yearly.toHtml().value = Math.ceil((daily * 365));
			}),
			monthly: new Dom('input').id('goal-submit-modal-monthly').type('number').attr('required', true).onKeyUp(() => {
				const monthly = +this.#inputs.monthly.toHtml().value;
				this.#inputs.daily.toHtml().value = Math.ceil((monthly / 30));
				this.#inputs.yearly.toHtml().value = Math.ceil((monthly * 12));
			}),
			yearly: new Dom('input').id('goal-submit-modal-yearly').type('number').attr('required', true).onKeyUp(() => {
				const yearly = +this.#inputs.yearly.toHtml().value;
				this.#inputs.daily.toHtml().value = Math.ceil((yearly / 365));
				this.#inputs.monthly.toHtml().value = Math.ceil((yearly / 12));
			}),
		};

		this.header(new Dom('h2').text('Insert Goal'))
			.body(
				new Dom('form').id('goal-submit-modal-form').append(
					new Dom('div').cls('input-field').append(
						this.#inputs.name,
						new Dom('label').attr('for', 'goal-submit-modal-name').text('Name: '),
					),
					new Dom('div').cls('input-field').append(
						this.#inputs.daily,
						new Dom('label').attr('for', 'goal-submit-modal-daily').text('Daily: '),
					),
					new Dom('div').cls('input-field').append(
						this.#inputs.monthly,
						new Dom('label').attr('for', 'goal-submit-modal-monthly').text('Monthly: '),
					),
					new Dom('div').cls('input-field').append(
						this.#inputs.yearly,
						new Dom('label').attr('for', 'goal-submit-modal-yearly').text('Yearly: '),
					),
				),
			)
		.footer(
			new Dom('h3').text('Cancel').onClick(this.close),
			new Dom('input').id('submit-goal').attr('form', 'goal-submit-modal-form').type('submit').value('Save').onClick(() => {
				const form = document.getElementById('goal-submit-modal-form');
				if(form.checkValidity()) {
					this.#saveGoal();
					this.close();
				}
			}),
		);
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
		this.close();
	};

	/**
	 * @param {Goal} goal
	 */
	editMode(goal) {
		this.header(new Dom('h2').text('Edit Goal'));

		this.#inputs.name.toHtml().value = goal.name;
		this.#inputs.daily.toHtml().value = goal.daily;
		this.#inputs.monthly.toHtml().value = goal.monthly;
		this.#inputs.yearly.toHtml().value = goal.yearly;

		return this;
	}

	insertMode() {
		this.header(new Dom('h2').text('Insert Goal'));

		this.#inputs.name.toHtml().value = '';
		this.#inputs.daily.toHtml().value = '';
		this.#inputs.monthly.toHtml().value = '';
		this.#inputs.yearly.toHtml().value = '';

		return this;
	}
}
