import { Parser } from 'nearley';
import grammar from './selector-grammar';
import Selector from './Selector';

export default {

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

		return results[0].selectors.map((tokens) => new Selector(tokens));
	},

};
