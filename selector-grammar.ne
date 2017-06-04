@{%
// collapse nested arrays of strings/objects into a single concatenated string
function collapse(d, raw = false) {
	if (typeof d === 'string') return d;
	else if (d && raw && typeof d.raw === 'string') return d.raw;
	else if (d && !raw && typeof d.parsed === 'string') return d.parsed;
	else if (!Array.isArray(d)) return '';

	var out = '';
	for (var i = 0; i < d.length; i++) out += collapse(d[i], raw);
	return out;
}

// wrapper for clarity
function collapseRaw(d) {
	return collapse(d, true);
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

# @see: https://www.w3.org/TR/css3-selectors/#w3cselgrammar
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

selector -> simple_selector_sequence (combinator simple_selector_sequence):*
	{% (d) => { return {type: 'selector', nodes: collectObjects(d)} } %}

combinator -> ( _ [+>~] _ | __ )
	{% (d, location) => { return {type: combinatorTypes[d[0][1] || ' '], location, raw: collapseRaw(d)} } %}

simple_selector_sequence -> ( type_selector | universal ) simple_selector:* | simple_selector:+

simple_selector -> hash | class | attrib | pseudo | negation

# selectors
universal -> namespace_prefix:? "*"
	{% (d, location) => { return {type: 'universalSelector', namespace: d[0] ? d[0].name : d[0], location, raw: collapseRaw(d)} } %}
type_selector -> namespace_prefix:? ident
	{% (d, location) => { return {type: 'typeSelector', namespace: d[0] ? d[0].name : d[0], name: collapse(d[1]), location, raw: collapseRaw(d)} } %}
hash -> "#" name
	{% (d, location) => { return {type: 'idSelector', name: collapse(d[1]), location, raw: collapseRaw(d)} } %}
class -> "." ident
	{% (d, location) => { return {type: 'classSelector', name: collapse(d[1]), location, raw: collapseRaw(d)} } %}
attrib -> "[" _ namespace_prefix:? ident _ ( [~|^$*]:? "=" _ ( ident | string ) ):? "]"
	{% (d, location) => {
		var obj = {namespace: d[2] ? d[2].name : d[2], name: collapse(d[3]), location, raw: collapseRaw(d)};
		if (d[5] && d[5].length) {
			obj.type = 'attributeValueSelector';
			obj.operator = (d[5][0] || '') + '=';
			obj.value = collapse(d[5][3][0]);
		} else {
			obj.type = 'attributePresenceSelector';
		}
		return obj;
	} %}
pseudo -> ":" ":":? ( ident | functional_pseudo )
	{% (d, location, reject) => {
		// reject :not()
		if (d[2][0].function === 'not') {
			return reject;
		}
		var obj = {name: d[2][0].function || collapse(d[2][0]), location, raw: collapseRaw(d)};
		// pseudo element?
		if (d[1] || ['before', 'after', 'first-line', 'first-letter'].indexOf(obj.name) !== -1) {
			// pseudo elements should not have a function
			if (d[2][0].function) {
				return reject;
			}
			obj.type = 'pseudoElementSelector';
		} else {
			obj.type = 'pseudoClassSelector';
			obj.expression = d[2][0].expression || null;
			obj.expressionRaw = d[2][0].expressionRaw || null;
		}
		return obj;
	} %}
negation -> ":" [nN] [oO] [tT] "(" _ negation_arg _ ")"
	{% (d, location) => { return {type: 'negationSelector', selectors: d[6], location, raw: collapseRaw(d)} } %}

# selector helpers
namespace_prefix -> ( ident | "*" ):? "|"
	{% (d) => { return {name: collapse(d[0]), raw: collapseRaw(d)} } %}
functional_pseudo -> ident "(" _ expression _ ")"
	{% (d) => { return {function: collapse(d[0]).toLowerCase(), expression: collapse(d[3]), raw: collapseRaw(d), expressionRaw: collapseRaw(d[3])} } %}
negation_arg -> type_selector | universal | hash | class | attrib | pseudo
expression -> string | ident | nth

# patterns
ident -> "-":? nmstart nmchar:*
name -> nmchar:+
nmstart -> [_a-zA-Z] | nonascii | escape
nonascii -> [^\0-\177]
unicode -> "\\" ( hexchar hexchar:? hexchar:? hexchar:? hexchar:? hexchar:? ) ( "\r\n" | space ):?
	{% (d) => { return {parsed: String.fromCodePoint(collapse(d[1])), raw: collapse(d)} } %}
escape -> unicode
	| "\\" [^\n\r\f0-9a-fA-F] {% (d) => { return {parsed: d[1], raw: collapseRaw(d)} } %}
escaped_nl -> "\\" nl
	{% (d) => { return {parsed: d[1], raw: collapseRaw(d)} } %}
nmchar -> [_a-zA-Z0-9-] | nonascii | escape
num -> [0-9]:+ | [0-9]:* "." [0-9]:+
int -> [0-9]:+
# @see: https://www.w3.org/TR/css3-selectors/#nth-child-pseudo
nth -> ( [+-]:? int:? [nN] ( _ [+-] _ int ):? | [+-]:? int )
	{% (d) => { return {parsed: collapse(d).replace(/[ \n\r\t\f]+/g, ''), raw: collapseRaw(d)} } %}
hexchar -> [0-9a-fA-F]
string -> ( string1 | string2 ) {% (d) => d[0][0] %}
string1 -> "\"" ( [^\n\r\f\\"] | escaped_nl | nonascii | escape ):* "\""
	{% (d) => { return {parsed: collapse(d[1]), raw: collapseRaw(d)} } %}
string2 -> "'" ( [^\n\r\f\\'] | escaped_nl | nonascii | escape ):* "'"
	{% (d) => { return {parsed: collapse(d[1]), raw: collapseRaw(d)} } %}
nl -> "\n" | "\r\n" | "\r" | "\f"
dimension -> num ident
space -> [ \n\r\t\f]
_ -> space:* # optional space
__ -> space:+ # required space
