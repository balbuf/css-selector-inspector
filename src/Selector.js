import CSS from './escape';

/**
 * CSS Selector object
 */

class Selector {

	/**
	 * Constructor
	 *
	 * @param  {Array} tokens  array of token objects
	 */
	constructor(tokens) {
		this.setTokens(tokens);
	}

	/**
	 * Set tokens and calculate specificity.
	 *
	 * @param {Array} tokens  array of token objects
	 */
	setTokens(tokens) {
		if (!Array.isArray(tokens) || !tokens.length) {
			throw new TypeError('Expecting a proper parsed array of tokens.');
		}

		Object.assign(this, {tokens, specificity: Selector.tallySpecificity(tokens)});
		delete this.selectorString;
	}

	/**
	 * Calculate the specificity of a selector based on its tokens.
	 * Creates and/or modifies a specificity object.
	 *
	 * @param  {Array} tokens array of tokens
	 * @param  {Object} specificity specificity object with properties a,b,c,d
	 * @return {Object}        specificity object
	 * @see: https://www.w3.org/TR/2009/CR-CSS2-20090908/cascade.html#specificity
	 */
	static tallySpecificity(tokens, specificity = {a: 0, b: 0, c: 0, d: 0}) {
		// calculate the specificity
		for (var i = 0; i < tokens.length; i++) {
			if (tokens[i].specificityType && typeof specificity[tokens[i].specificityType] === 'number') {
				specificity[tokens[i].specificityType]++;
			} else if (Array.isArray(tokens[i].tokens)) {
				this.tallySpecificity(tokens[i].tokens, specificity);
			}
		}

		return specificity;
	}

	/**
	 * Turn an array of tokens into a string representation.
	 * @param  {Array} tokens array of token objects
	 * @return {String}        selector string
	 */
	static tokensToString(tokens) {
		return tokens.map((token) => {
			switch (token.type) {
				case 'adjacentSiblingCombinator':
					return ' + ';

				case 'childCombinator':
					return ' > ';

				case 'generalSiblingCombinator':
					return ' ~ ';

				case 'descendantCombinator':
					return ' ';

				case 'universalSelector':
				case 'typeSelector':
					return namespaceString(token) + (token.type === 'universalSelector' ? '*' : CSS.escape(token.name));

				case 'idSelector':
				case 'classSelector':
					return (token.type === 'idSelector' ? '#' : '.') + CSS.escape(token.name);

				case 'attributePresenceSelector':
					return '[' + namespaceString(token) + CSS.escape(token.name) + ']';

				case 'attributeValueSelector':
					return '[' + namespaceString(token) + CSS.escape(token.name) + token.operator + CSS.escapeString(token.value) + ']';

				case 'pseudoElementSelector':
					// no escape necessary since only identities are allowed
					return '::' + token.name;

				case 'pseudoClassSelector':
					var expression = '';
					if (token.expression) {
						switch (token.expression.type) {
							case 'identity':
								expression = CSS.escape(token.expression.parsed);
								break;

							case 'string':
								expression = CSS.escapeString(token.expression.parsed);
								break;

							case 'nthKeyword':
								expression = token.expression.parsed;
								break;

							case 'nthFormula':
								if (token.expression.parsed.a) {
									if (Math.abs(token.expression.parsed.a) === 1) {
										// omit the number
										expression = token.expression.parsed.a < 0 ? '-n' : 'n';
									} else {
										expression = token.expression.parsed.a + 'n';
									}
								}
								// if there is a b component, or there was no a component
								if (token.expression.parsed.b || !expression) {
									// add an explicit plus sign if there was an a component and b is positive
									if (token.expression.parsed.b > 0 && expression) {
										expression += '+';
									}
									expression += token.expression.parsed.b;
								}
								break;
						}
						expression = expression && ('(' + expression + ')');
					}
					return ':' + token.name + expression;

				case 'negationSelector':
					return ':not(' + this.tokensToString(token.tokens) + ')';
			}
		}).join('');
	}

	/**
	 * Reconstruct the selector tokens into a complete and valid selector.
	 * @return {String} selector string
	 */
	toString() {
		// cache the selector string
		if (!this.selectorString) {
			this.selectorString = Selector.tokensToString(this.tokens);
		}

		return this.selectorString;
	}

}

/**
 * Return the properly-formed namespace string for the given token.
 * @param  {Object} token selector token
 * @return {String}       namespace string
 */
function namespaceString(token) {
	if (typeof token.namespace === 'string') {
		return CSS.escape(token.namespace) + '|';
	} else if (typeof token.namespace === 'object' && token.namespace !== null && token.namespace.type === 'wildcard') {
		return '*|';
	}
	return '';
}

export default Selector;
