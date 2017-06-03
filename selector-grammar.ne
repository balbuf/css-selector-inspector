@{%
// collapse nested arrays of strings into a single concatenated string
function collapse(d) {
	if (typeof d === 'string') return d;
	else if (d && typeof d.raw === 'string') return d.raw;
	else if (!Array.isArray(d)) return '';

	var out = '';
	for (var i = 0; i < d.length; i++) out += collapse(d[i]);
	return out;
}

// collect nested arrays of objects into a flat array
function collectObjects(d) {
	var objs = [];
	for (var i = 0; i < d.length; i++) {
		if (Array.isArray(d[i])) {
			objs = objs.concat(collectObjects(d[i]));
		} else if (d[i] && typeof d[i] === 'object') {
			objs.push(d[i]);
		}
	}
	return objs;
}

const combinatorTypes = {
	'+': 'adjacentSiblingCombinator',
	'>': 'childCombinator',
	'~': 'generalSiblingCombinator',
	' ': 'descendantCombinator',
};
%}

selectors_group -> _ selector (_ "," _ selector):* _
	{% (d) => {
		var selectors = [ d[1] ];
		// are there additional selectors?
		if (d[2] && d[2].length) {
			for (var i = 0; i < d[2].length; i++) {
				selectors.push(d[2][i][3]);
			}
		}
		return {type: 'selectorsGroup', selectors};
	} %}

selector -> simple_selector_sequence (combinator simple_selector_sequence):* {% (d) => { return {type: 'selector', nodes: collectObjects(d)} } %}

combinator -> ( _ [+>~] _ | __ ) {% (d, location) => { return {type: combinatorTypes[d[0][1] || ' '], location, raw: collapse(d)} } %}

simple_selector_sequence -> ( type_selector | universal ) simple_selector:*
	| simple_selector:+

simple_selector -> hash | class | attrib | pseudo | negation

# selectors
universal -> namespace_prefix:? "*" {% (d, location) => { return {type: 'universalSelector', namespace: d[0] ? d[0].name : d[0], location, raw: collapse(d)} } %}
type_selector -> namespace_prefix:? ident {% (d, location) => { return {type: 'typeSelector', namespace: d[0] ? d[0].name : d[0], name: d[1], location, raw: collapse(d)} } %}
hash -> "#" name {% (d, location) => { return {type: 'idSelector', name: d[1], location, raw: collapse(d)} } %}
class -> "." ident {% (d, location) => { return {type: 'classSelector', name: d[1], location, raw: collapse(d)} } %}
attrib -> "[" _ namespace_prefix:? ident _ ( [~|^$*]:? "=" _ ( ident | string ) ):? "]"
	{% (d, location) => {
		var obj = {namespace: d[2] ? d[2].name : d[2], name: d[3], location, raw: collapse(d)};
		if (d[5] && d[5].length) {
			obj.type = 'attributeValueSelector';
			obj.operator = (d[5][0] || '') + '=';
			obj.value = d[5][3][0]; // @todo: this is raw and needs to be parsed
		} else {
			obj.type = 'attributePresenceSelector';
		}
		return obj;
	} %}
pseudo -> ":" ":":? ( ident | functional_pseudo )
	{% (d, location, reject) => {
		var pseudo = typeof d[2][0] === 'string' ? d[2][0].toLowerCase() : d[2][0];
		// reject :not()
		if (pseudo.function === 'not') {
			return reject;
		}
		var obj = {name: pseudo.function || pseudo, location, raw: collapse(d)};
		// pseudo element?
		if (d[1] || ['before', 'after', 'first-line', 'first-letter'].indexOf(pseudo) !== -1) {
			obj.type = 'pseudoElementSelector';
		} else {
			obj.type = 'pseudoClassSelector';
			obj.expression = pseudo.expression || null;
		}
		return obj;
	} %}
negation -> ":" [nN] [oO] [tT] "(" _ negation_arg _ ")" {% (d, location) => { return {type: 'negationSelector', selectors: d[6], location, raw: collapse(d)} } %}

# selector helpers
namespace_prefix -> ( ident | "*" ):? "|" {% (d) => { return {name: collapse(d[0]), raw: collapse(d)} } %} # return just the namespace
functional_pseudo -> ident "(" _ expression ")" {% (d) => { return {function: d[0].toLowerCase(), expression: d[3].trim()} } %}
negation_arg -> type_selector | universal | hash | class | attrib | pseudo
expression -> ( ( "+" | "-" | dimension | num | string | ident ) _ ):+ {% collapse %}

# patterns
ident -> "-":? nmstart nmchar:* {% collapse %}
name -> nmchar:+ {% collapse %}
nmstart -> [_a-zA-Z] | nonascii | escape
nonascii -> [^\0-\177]
unicode -> "\\" hexchar hexchar:? hexchar:? hexchar:? hexchar:? hexchar:? ( "\r\n" | space ):?
escape -> unicode | "\\" [^\n\r\f0-9a-fA-F]
nmchar -> [_a-zA-Z0-9-] | nonascii | escape
num -> [0-9]:+ | [0-9]:* "." [0-9]:+
hexchar -> [0-9a-fA-F]
string -> ( string1 | string2 ) {% collapse %}
string1 -> "\"" ( [^\n\r\f\\"] | "\\" nl | nonascii | escape ):* "\""
string2 -> "'" ( [^\n\r\f\\'] | "\\" nl | nonascii | escape ):* "'"
nl -> "\n" | "\r\n" | "\r" | "\f"
dimension -> num ident
space -> [ \n\r\t\f]
_ -> space:* # optional space
__ -> space:+ # required space