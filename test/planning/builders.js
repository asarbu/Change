import { Category, Goal } from '../../static/js/planning/model/planningModel';


/**
 * Builder class for creating Category instances with various configurations.
 */
export class CategoryBuilder {
	   /**
		* Initializes a new Category with default id, name, and empty goals.
		* @constructor
		*/
	   constructor() {
			   /** @type {Category} */
			   this.category = new Category(1, 'SampleCategory', []);
	   }


	   /**
		* Sets the category to have a single sample goal.
		* @returns {CategoryBuilder} The builder instance for chaining.
		*/
	   withOneGoal() {
			   this.category.goals = [];
			   this.category.goals.push(Goal.fromDailyAmount('Sample Goal 1', 1));
			   return this;
	   }



	   /**
		* Sets the category to have multiple sample goals.
		* @returns {CategoryBuilder} The builder instance for chaining.
		*/
	   withFourGoals() {
			   this.category.goals = [];
			   this.category.goals.push(Goal.fromDailyAmount('Sample Goal 1', 1));
			   this.category.goals.push(Goal.fromDailyAmount('Sample Goal 2', 2));
			   this.category.goals.push(Goal.fromDailyAmount('Sample Goal 3', 3));
			   this.category.goals.push(Goal.fromDailyAmount('Sample Goal 4', 4));
			   return this;
	   }

	   /**
		* Returns the constructed Category instance.
		* @returns {Category} The built Category object.
		*/
	   build() {
			   return this.category;
	   }
}