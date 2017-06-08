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
		return tokens.reduce((str, token) => {
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
					return (typeof token.namespace === 'string' ? CSS.escape(token.namespace) + '|' : '') +
						(token.type === 'universalSelector' ? '*' : CSS.escape(token.name));

				case 'idSelector':
				case 'classSelector':
					return (token.type === 'idSelector' ? '#' : '.') + CSS.escape(token.name);

				case 'attributePresenceSelector':
					return '[' + CSS.escape(token.name) + ']';

				case 'attributeValueSelector':
					// @todo: CSS.escape escapes more than necessary for strings
					return `[${CSS.escape(token.name)}${token.operator}"${CSS.escape(token.value)}"]`;

				case 'pseudoElementSelector':
					// no escape necessary since only identities are allowed
					return '::' + token.name;

				case 'pseudoClassSelector':
					// @todo: get away from using raw expression
					return ':' + token.name + (typeof token.expressionRaw === 'string' ? '(' + token.expressionRaw + ')' : '');

				case 'negationSelector':
					return ':not(' + this.tokensToString(token.tokens) + ')';
			}
		}, '');
	}

	/**
	 * Reconstruct the selector tokens into a complete and valid selector.
	 * @return {String} selector string
	 */
	toString() {
		if (!this.selectorString) {
			this.selectorString = Selector.tokensToString(this.tokens);
		}

		return this.selectorString;
	}

}

export default Selector;
