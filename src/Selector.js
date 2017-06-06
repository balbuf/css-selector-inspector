/**
 * CSS Selector object
 */

const originTypes = [ 'author', 'user', 'userAgent' ];

class Selector {

	constructor(tokens, origin = 'author') {
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

		Object.assign(this, {tokens, origin, specificity, important: false});
	}

	set origin(origin) {
		if (originTypes.indexOf(origin) === -1) {
			throw new Error(`Origin should be one of: ${originTypes.join(', ')}`);
		}
		this._origin = origin;
	}

	get origin() {
		return this._origin;
	}

}

export default Selector;
