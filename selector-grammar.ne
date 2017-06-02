@{% function collapse(d) {
	if (typeof d === 'string') return d;
	else if (!Array.isArray(d)) return '';

	var out = '';
	for (var i = 0; i < d.length; i++) out += collapse(d[i]);
	return out;
}%}

selectors_group -> selector (_ "," _ selector):* #{% collapse %}

selector -> simple_selector_sequence (combinator simple_selector_sequence):*

combinator -> _ [+>~] _ | __

simple_selector_sequence -> ( type_selector | universal ) simple_selector:*
	| simple_selector:+

simple_selector -> hash | class | attrib | pseudo | negation

# selectors
universal -> namespace_prefix:? "*"
type_selector -> namespace_prefix:? ident
hash -> "#" name
class -> "." ident
attrib -> "[" _ namespace_prefix:? ident _ ( [~|^$*]:? "=" _ ( ident | string ) ):? "]"
pseudo -> ":" ":":? ( ident | functional_pseudo )
negation -> ":" [nN] [oO] [tT] "(" _ negation_arg _ ")"

# selector helpers
namespace_prefix -> ( ident | "*" ):? "|"
functional_pseudo -> function _ expression ")"
negation_arg -> type_selector | universal | hash | class | attrib | pseudo
expression -> ( ( "+" | "-" | dimension | num | string | ident ) _ ):+

# optional space
_ -> space:* {% () => null %}

# required space
__ -> space:+ {% () => ' ' %}

# patterns
ident -> "-":? nmstart nmchar:*
name -> nmchar:+
nmstart -> [_a-zA-Z] | nonascii | escape
nonascii -> [^\0-\177]
unicode -> "\\" hexchar hexchar:? hexchar:? hexchar:? hexchar:? hexchar:? ( "\r\n" | space ):?
escape -> unicode | "\\" [^\n\r\f0-9a-fA-F]
nmchar -> [_a-zA-Z0-9-] | nonascii | escape
num -> [0-9]:+ | [0-9]:* "." [0-9]:+
hexchar -> [0-9a-fA-F]
string -> string1 | string2
string1 -> "\"" ( [^\n\r\f\\"] | "\\" nl | nonascii | escape ):* "\""
string2 -> "'" ( [^\n\r\f\\'] | "\\" nl | nonascii | escape ):* "'"
nl -> "\n" | "\r\n" | "\r" | "\f"
function -> ident "("
dimension -> num ident
space -> [ \n\r\t\f]
