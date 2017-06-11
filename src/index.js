import { Parser } from 'nearley';
import grammar from './selector-grammar';
import Selector from './Selector';
import PropertyTest from './PropertyTest';
import CSS from './escape';

/**
 * Using the location and additional offset of unicode escape tokens,
 * fix the location values for parsed selector tokens.
 *
 * @param  {Array} tokens
 * @param  {Array} unicodeLocations  location and offset of each unicode escape
 */
function fixLocation(tokens, unicodeLocations) {
	for (var i = 0; i < tokens.length; i++) {
		if (tokens[i].location) {
			tokens[i].location += unicodeLocations.filter((l) => l.index < tokens[i].location).reduce((offset, l) => offset + l.offset, 0);
		}
		if (Array.isArray(tokens[i].tokens)) {
			fixLocation(tokens[i].tokens, unicodeLocations);
		}
	}
}

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
		// tokenize the input string
		// (the only special tokens are unicode escapes, which need to be matched greedily to avoid ambiguous results)
		var tokens = []
		  , unicodeReg = /\\[0-9a-zA-Z]{1,6}(?:\r\n|[ \n\r\t\f])?/g
		  , lastIndex = 0
		  , result
		  , unicodeLocations = [] // keep track of where unicode tokens are to fix the "location" values of selector tokens
		;

		// find all the unicode escapes, split everything else into individual chars
		while ((result = unicodeReg.exec(selector)) !== null) {
			Array.prototype.push.apply(tokens, selector.substr(lastIndex, result.index).split(''));
			unicodeLocations.push({index: tokens.length, offset: result[0].length - 1});
			tokens.push(result[0]);
			lastIndex = unicodeReg.lastIndex;
		}
		Array.prototype.push.apply(tokens, selector.substr(lastIndex).split(''));

		var parser = new Parser(grammar.ParserRules, grammar.ParserStart)
		  , results = parser.feed(tokens).results
		;

		// usually a parse error is thrown by nearley, unless there are no results due to
		// a postprocessor function rejecting a match
		if (results.length === 0) {
			throw new Error('Invalid selector.');
		}

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

		return results[0].selectors.map((selector) => {
			if (unicodeLocations.length) {
				fixLocation(selector.tokens, unicodeLocations);
			}
			return new Selector(selector.tokens);
		});
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

	/**
	 * Normalize a selector string by parsing and reassembling.
	 * Removes extraneous whitespace, unencodes unnecessary unicode escapes,
	 * removes comments, normalizes nth formulas.
	 *
	 * This idea could be expanded upon to sort simple selectors and even
	 * standardize a preference between identical selectors, e.g. :first-child and :nth-child(1).
	 *
	 * @param  {String} selector selector string
	 * @return {String}          normalized selector string
	 */
	normalize(selector) {
		return this.parse(selector).map((s) => s.toString()).join(', ');
	},

	// escape methods
	escape: CSS.escape,
	escapeString: CSS.escapeString,

};
