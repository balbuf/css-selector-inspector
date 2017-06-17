import Selector from './Selector';

const originPrecedence = [ 'user-important', 'author-important', 'author-normal', 'user-normal', 'userAgent' ];
const stylesheetTypes = [ 'author', 'user', 'userAgent' ];

class TheoreticalProperty {

	// default props
	origin = 'inline';
	important = false;
	selector = null;

	/**
	 * Constructor
	 *
	 * @param  {Object} options plain object with options or Selector object
	 */
	constructor(options = {}) {
		// shortcut for Selector objects
		if (options instanceof Selector) {
			this.selector = options;
			this.origin = 'author';
		} else {
			Object.assign(this, options);
		}
	}

	/**
	 * Get the specificity level of the selector.
	 *
	 * @return {object} specificity object with the number of selectors for each component type a,b,c,d
	 */
	getSpecificity() {
		if (stylesheetTypes.includes(this.origin) && this.selector instanceof Selector) {
			return this.selector.specificity;
		} else if (this.origin === 'inline' && this.selector === null) {
			return {a: 1, b: 0, c: 0, d: 0};
		} else {
			throw new Error('Invalid CSS theoretical property! Likely causes: invalid origin type or incompatible selector/origin combination.');
		}
	}

	/**
	 * Get the precedence level of the selector's origin and !important status.
	 *
	 * @return {int} precedence level, lower being higher precedence
	 */
	getPrecedenceLevel() {
		// inline styles originate from the author
		var level, precedenceType = this.origin === 'inline' ? 'author' : this.origin;

		// userAgent stylesheets cannot use "!important"
		if (this.origin !== 'userAgent') {
			precedenceType += '-' + (this.important === true ? 'important' : 'normal');
		}

		// derive the level from the origin precedence
		if ((level = originPrecedence.indexOf(precedenceType)) === -1) {
			throw new Error('Invalid origin type.');
		}

		return level;
	}

}

export default TheoreticalProperty;
