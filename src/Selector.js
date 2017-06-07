/**
 * CSS Selector object
 */

class Selector {

	/**
	 * Constructor
	 *
	 * @param  {Object} tokens  object with type: 'selector' and array of nodes
	 */
	constructor(tokens) {
		if (typeof tokens !== 'object' || tokens.type !== 'selector' || !tokens.nodes || !tokens.nodes.length) {
			throw new TypeError('Selector should be constructed with a proper parsed token object.');
		}

		// pull out just the nodes
		tokens = tokens.nodes;

		var specificity = {a: 0, b: 0, c: 0, d: 0};

		// calculate the specificity @see: https://www.w3.org/TR/2009/CR-CSS2-20090908/cascade.html#specificity
		for (var i = 0; i < tokens.length; i++) {
			if (tokens[i].specificityType) {
				specificity[tokens[i].specificityType]++;
			}
		}

		Object.assign(this, {tokens, specificity});
	}

}

export default Selector;
