import Dom from '../../common/gui/dom.js';
import Modal from '../../common/gui/modal.js';
import Utils from '../../common/utils/utils.js';
import Planning from '../model/planningModel.js';

export default class PlanningCreateModal extends Modal {
	/** @type {(newPlanning: Planning) => void} */
	#onCreatedPlanningHandler = undefined;

	#yearInput = new Dom();

	#monthInput = new Dom();

	constructor(dateTimeProvider = new Date()) {
		super('planning_create_modal');

		const onClickSave = this.#onCreatedPlanning.bind(this);

		this.header(
			new Dom('h1').text('Add Planning'),
		).body(
			new Dom('form').append(
				new Dom('div').cls('input-field').append(
					new Dom('input').type('number').attr('required', '').value(dateTimeProvider.getFullYear()).cloneTo(this.#yearInput),
					new Dom('label').text('For year: '),
				),
				new Dom('div').cls('input-field').onClick().append(
					new Dom('input').type('text').attr('required', '').value(Utils.nameForMonth(dateTimeProvider.getMonth())).cloneTo(this.#monthInput),
					new Dom('label').text('For Month: '),
				),
				new Dom('input').type('submit').hide().onClick(onClickSave),
			),
		).footer(
			new Dom('h3').text('Cancel').onClick(this.close.bind(this)),
			new Dom('h3').text('Save').onClick(onClickSave),
		);
	}

	#onCreatedPlanning() {
		const newPlanning = new Planning();
		newPlanning.year = this.#yearInput.toHtml().value;
		newPlanning.month = Utils.monthForName(this.#monthInput.toHtml().value);
		this.#onCreatedPlanningHandler?.(newPlanning);
	}

	onCreatePlanning(handler) {
		this.#onCreatedPlanningHandler = handler;
	}
}
