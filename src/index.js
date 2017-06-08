import { Parser } from 'nearley';
import grammar from './selector-grammar';
import Selector from './Selector';
import PropertyTest from './PropertyTest';

export default {

	// classes
	Selector,
	PropertyTest,

	/**
	 * Parse a selector or group of selectors.
	 *
	 * @param  {string} selector
	 * @return {array}          Selector object(s)
	 */
	parse(selector) {
		var parser = new Parser(grammar.ParserRules, grammar.ParserStart)
		  , results = parser.feed(selector).results
		;

		// are there ambiguous results?
		if (results.length > 1) {
			let stringified = JSON.stringify(results[0]);

			// check that any of the possibilities vary
			for (var i = 1; i < results.length; i++) {
				if (JSON.stringify(results[i]) !== stringified) {
					throw new Error('Selector could not be parsed due to ambiguous results.');
				}
			}
		}

		return results[0].selectors.map((selector) => new Selector(selector.tokens));
	},

	/**
	 * Shortcut to determine whether a selector string parses, without throwing an error.
	 * Does not determine whether the selector is completely valid by CSS spec,
	 * e.g. number, type, and placement of pseudo class/elements.
	 *
	 * @param  {string}  selector
	 * @return {Boolean}      successful parse or not
	 */
	isValid(selector) {
		try {
			this.parse(selector);
		} catch (e) {
			return false;
		}
		return true;
	},

	/**
	 * Compare the two types of selectors/properties for use with a sorting function.
	 * Comparison is descending by specificity, highest first.
	 *
	 * @param  {mixed} a  PropertyTest
	 * @param  {mixed} b  PropertyTest
	 * @return {int}   -1, 0, 1
	 * @see  https://www.w3.org/TR/2009/CR-CSS2-20090908/cascade.html#cascading-order
	 */
	compare(a, b) {
		if (!a instanceof PropertyTest || !b instanceof PropertyTest) {
			throw new TypeError('Compare terms must be PropertyTest objects.');
		}

		// get the difference of precedence levels
		var diff = a.getPrecedenceLevel() - b.getPrecedenceLevel();

		// if there is no difference, move on to specificity level
		if (!diff) {
			// drill down to specificity to compare
			a = a.getSpecificity();
			b = b.getSpecificity();

			// try each specificity level until there is a difference
			if (!(diff = b.a - a.a)) {
				if (!(diff = b.b - a.b)) {
					if (!(diff = b.c - a.c)) {
						if (!(diff = b.d - a.d)) {
							// props are effectively the same
							return 0;
						}
					}
				}
			}
		}

		return diff < 0 ? -1 : 1;
	},

	/**
	 * Sort an array of selectors and/or PropertyTest objects.
	 * If selectors have the same precedence and speceficity, the later one will appear first.
	 *
	 * @param  {array|...mixed} arr  Selector object, PropertyTest object, or simple object to pass to PropertyTest
	 * @return {array}      sorted copy of original array
	 */
	sort(arr, ...more) {
		// allow selectors to be passed as variadic args
		if (Array.isArray(more) && !Array.isArray(arr)) {
			arr = [ arr ].concat(more);
		}

		// convert all items to PropertyTest objects
		var mapped = arr.map((item, index) => {
			// preserve index for later recomposition of original array
			return {index, item: item instanceof PropertyTest ? item : new PropertyTest(item)};
		});

		// sort based on specificity, then order
		mapped.sort((a, b) => {
			// if the items are equivalent, choose the later item to come first
			return this.compare(a.item, b.item) || b.index - a.index;
		});

		// reassemble original array based on the sorted state of the mapping
		return mapped.map((item) => arr[item.index]);
	},

};
