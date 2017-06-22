# 🔎 css-selector-inspector (CSI)

CSI is a complete spec-based CSS3 selector parser and utility written in JavaScript.

**Features:**

* Parse and tokenize any valid [CSS3 selector](https://www.w3.org/TR/css3-selectors/) string, guaranteed!
  * Supports [escaped characters](https://mathiasbynens.be/notes/css-escapes), including escaped unicode code points
  * Properly handles all valid whitespace
  * Parses around comment blocks
* Validate that a selector is well-formed
* Calculate [specificity level](https://www.w3.org/TR/2009/CR-CSS2-20090908/cascade.html#specificity) of each compound selector
* Sort theoretical property declarations in proper [cascading order](https://www.w3.org/TR/2009/CR-CSS2-20090908/cascade.html#cascading-order)
based on selector specificity, origin (user or author stylesheet or inline), and `!important` directive
* Normalize selector strings by parsing and reassembling the components in a deterministic manner
* Escape raw values to use as CSS [identifiers](https://drafts.csswg.org/cssom/#serialize-an-identifier) or
[strings](https://drafts.csswg.org/cssom/#serialize-a-string)

## Usage

Install CSI into your project:

```sh
npm install css-selector-inspector --save
```

```js
import CSI from 'css-selector-inspector';

console.log(CSI.parse('div.content:last-child > p:not([aria-hidden])::before'));
/* output:
[
  {
    tokens: [
      {
        type: "typeSelector",
        namespace: null,
        name: "div",
        location: 0,
        raw: "div",
        specificityType: "d"
      },
      {
        type: "classSelector",
        name: "content",
        location: 3,
        raw: ".content",
        specificityType: "c"
      },
      {
        type: "pseudoClassSelector",
        name: "last-child",
        location: 11,
        raw: ":last-child",
        specificityType: "c",
        expression: null
      },
      {
        type: "childCombinator",
        location: 22,
        raw: " > ",
        specificityType: null
      },
      {
        type: "typeSelector",
        namespace: null,
        name: "p",
        location: 25,
        raw: "p",
        specificityType: "d"
      },
      {
        type: "negationSelector",
        tokens: [
          {
            namespace: null,
            name: "aria-hidden",
            location: 31,
            raw: "[aria-hidden]",
            specificityType: "c",
            type: "attributePresenceSelector"
          }
        ],
        location: 26,
        raw: ":not([aria-hidden])",
        specificityType: null
      },
      {
        name: "before",
        location: 45,
        raw: "::before",
        type: "pseudoElementSelector",
        specificityType: "d"
      }
    ],
    specificity: {
      a: 0,
      b: 0,
      c: 3,
      d: 3
    }
  }
]
 */

console.log(CSI.parse('html, /* comments are ok! */ *|body'));
/* output:
[
  {
    tokens: [
      {
        type: "typeSelector",
        namespace: null,
        name: "html",
        location: 0,
        raw: "html",
        specificityType: "d"
      }
    ],
    specificity: {
      a: 0,
      b: 0,
      c: 0,
      d: 1
    }
  },
  {
    tokens: [
      {
        type: "typeSelector",
        namespace: {
          type: "wildcard"
        },
        name: "body",
        location: 29,
        raw: "body",
        specificityType: "d"
      }
    ],
    specificity: {
      a: 0,
      b: 0,
      c: 0,
      d: 1
    }
  }
]
```

## Objects

### `CSI`

This is the main object containing static methods for most of the selector utilities.

#### Static Methods

##### `parse()`

Parse a string containing selectors (one or more separated by commas) into its component tokens.

**Params**

* _string_ `selector` - selector list string, excluding braces `{}`

**Returns**

_array_ an array of `Selector` objects (even if there is only one selector)

**Throws**

* Syntax error if the string cannot be parsed, usually providing the location of the first invalid portion
* If the parsing results in multiple, differing results, an ambiguity error is thrown (please file an issue if this error is encountered)

<br>

##### `isValid()`

Determine if a selector string is syntactically valid. This is a convenience method if you don't care about the parsed result,
and it will not throw an error if passed an invalid selector. This will not determine if the components are supported by a
CSS implementation (e.g. if a particular pseudo class actually exists in any browser).

**Params**

* _string_ `selector` - selector list string, excluding braces `{}`

**Returns**

_bool_ determination of whether the selector string appears to be syntactically valid

<br>

##### `normalize()`

Normalize a selector string by parsing and reassembling. Removes extraneous whitespace, unencodes unnecessary unicode escapes,
removes comments, and normalizes nth formulas.

**Params**

* _string_ `selector` - selector list string, excluding braces `{}`

**Returns**

_string_ normalized selector string

**Throws**

* Uses `parse()`, so has the potential to throw errors due to invalid selector strings.

<br>

##### `sort()`

Sort selectors and/or theoretical properties based on the cascading precedence order. All arguments are internally
converted to `TheoreticalProperty` objects for comparison purposes but are returned as the original passed object(s).
Selectors/properties are sorted in precedence order from highest to lowest, meaning the first item in the resulting
array is the property that would win out. For items that are otherwise equal based on precedence and specificity,
the item passed latest will appear first in the resulting array.

**Params**

* _array_ `testObjects` | _object_ `...testObject` - `Selector` or `TheoreticalProperty` objects or plain objects to be casted as `TheoreticalProperty` objects
(can be passed as a single array of objects or as multiple object arguments)

**Returns**

_array_ original passed objects in proper cascade order (does not mutate or return the original array if passed)

**Throws**

* `TheoreticalProperty` objects may throw errors if invalid values are passed. See its documentation for more details.

<br>

##### `escape()`

Escape a JS value to use as a CSS identity. This is an implementation of the CSS spec which defines the
[`CSS.escape()`](https://developer.mozilla.org/en-US/docs/Web/API/CSS/escape) method, available in many browsers.

**Params**

* _mixed_ `ident` - raw value (will be casted as a string) to use as a CSS identity

**Returns**

_string_ escaped identity that can be safely used to compose a CSS selector string

<br>

##### `escapeString()`

Escape a JS value to use as a CSS string. While `escape()` can be used for this purpose as well, it escapes more characters
than necessary. This method only acts upon characters that must be escaped for use as a string, and returns the value with
surronding double quotes.

**Params**

* _mixed_ `string` - raw value (will be casted as a string) to use as a CSS string

**Returns**

_string_ escaped string, including surrounding double quote characters, that can be safely used to compose a CSS selector string

<br>

### `Selector`

The `Selector` object is returned as the result of parsing a selector string, which gives access to the token data
and specificity level. `Selector` objects must be instantiated with a token array, so such objects typically
result from calling `parse()` rather than direct instantiation.

**Constructor**

* _array_ `tokens` - token objects

#### Properties

##### `specificity`

_object_ contains properties `a`, `b`, `c`, and `d`, each with a count of the corresponding selectors of each specificity type

<br>

##### `tokens`

_array_ array of token objects that comprise the compound selector, including combinators

**Combinator Token Types**

All combinator token objects have the following properties:

* _string_ `type` - the type of token
* _int_ `location` - the index in the original string where the token was located
* _string_ `raw` - the raw string that was parsed into the token

| Type | Example | Additional Properties |
| - | - | - |
| `adjacentSiblingCombinator` | `sibling + nextsibling` | <ul><li>_null_ `specificityType`</li></ul> |
| `childCombinator` | `parent > child` | <ul><li>_null_ `specificityType`</li></ul> |
| `descendantCombinator` | `ancestor descendant` | <ul><li>_null_ `specificityType`</li></ul> |
| `generalSiblingCombinator` | `sibling ~ sibling` | <ul><li>_null_ `specificityType`</li></ul> |

**Simple Selector Token Types**

All simple selector token objects have the following properties:

* _string_ `type` - the type of token
* _int_ `location` - the index in the original string where the token was located
* _string_ `raw` - the raw string that was parsed into the token

| Type | Example | Additional Properties |
| - | - | - |
| `attributePresenceSelector` | `[attr]` | <ul><li>_string_ `name` - attribute name</li><li>_string \| object \| null_ `namespace` - namespace string, if provided; object with `type: 'wildcard'` if namespace is `*`; `null` if no namespace</li><li>_string_ `specificityType` - `c`</li></ul> |
| `attributeValueSelector` | `[attr="value"]` | <ul><li>_string_ `name` - attribute name</li><li>_string_ `value` - attribute value</li><li>_string_ `operator` - value comparison operator, one of: `=`, `~=`, `\|=`, `^=`, `$=`, `*=`</li><li>_string \| object \| null_ `namespace` - namespace string, if provided; object with `type: 'wildcard'` if namespace is `*`; `null` if no namespace</li><li>_string_ `specificityType` - `c`</li></ul> |
| `classSelector` | `.class` | <ul><li>_string_ `name` - class name</li><li>_string_ `specificityType` - `c`</li></ul> |
| `idSelector` | `#id` | <ul><li>_string_ `name` - ID</li><li>_string_ `specificityType` - `b`</li></ul> |
| `negationSelector` | `:not(.class)` | <ul><li>_array_ `tokens` - simple selector token objects</li><li>_null_ `specificityType`</li></ul> |
| `pseudoClassSelector` | `:pseudo-class(expression)` | <ul><li>_string_ `name` - pseudo element name</li><li>_object \| null_ `expression` - optional parenthetical expression as a data token object</li><li>_string_ `specificityType` - `c`</li></ul> |
| `pseudoElementSelector` | `::pseudo-element` | <ul><li>_string_ `name` - pseudo element name</li><li>_string_ `specificityType` - `d`</li></ul> |
| `typeSelector` | `element` | <ul><li>_string_ `name` - element name</li><li>_string \| object \| null_ `namespace` - namespace string, if provided; object with `type: 'wildcard'` if namespace is `*`; `null` if no namespace</li><li>_string_ `specificityType` - `d`</li></ul> |
| `universalSelector` | `*` | <ul><li>_string \| object \| null_ `namespace` - namespace string, if provided; object with `type: 'wildcard'` if namespace is `*`; `null` if no namespace</li><li>_null_ `specificityType`</li></ul> |

**Data Token Types**

All data token objects have the following properties:

* _string_ `type` - the type of token
* _string_ `raw` - the raw string that was parsed into the token

| Type | Example | Additional Properties |
| - | - | - |
| `identity` | `identity` | <ul><li>_string_ `parsed` - identity name</li></ul> |
| `nthFormula` | `3n+4` | <ul><li>_object_ `parsed` - object with properties `a` and `b` with their respective integer values from the `an+b` formula |
| `nthKeyword` | `even` | <ul><li>_string_ `parsed` - `even` or `odd`</li></ul> |
| `string` | `"string"` | <ul><li>_string_ `parsed` - value of string</li></ul> |

<br>

#### Methods

##### `toString()`

**Returns**

_string_ properly formed selector string

<br>

### `TheoreticalProperty`

`TheoreticalProperty` objects are used primarily to compare and sort different selectors. They are "theoretical"
properties because they are not concerned with any property name or value, but rather the source of the property
(e.g. user or author stylesheet or inline) and whether the `!important` directive is set, all which contribute
to determining the cascading order of precedence of defined properties for an element.

The easiest way to use these objects is to not use them at all! Instead, you can pass `Selector` objects
or plain objects to `CSI.sort()` and the `TheoreticalProperty` objects will be created under the hood
for the comparison. However, it is more efficient to create and reuse `TheoreticalProperty` objects when
doing multiple/repeated comparisons.

**Constructor**

* _object_ `options` | _Selector_ `selector` | _undefined_ - the constructor accepts a plain object which sets corresponding
properties on the `TheoreticalProperty` object; as a shortcut, a `Selector` object may be passed instead, setting the `selector`
property to that object and the `origin` property to `"author"`; if no argument is passed, the default properties are used,
which make the object a non-important inline style

#### Properties

##### `important`

_bool_ whether the property was defined with the `!important` directive (properties originating from a `userAgent`
should not ever be important and will throw an error if used in a comparison)

**Default:** `false`

<br>

##### `origin`

_string_ where the CSS property originates from, one of: `user` (configured in the user's browser settings),
`userAgent` (defined by the browser itself), `author` (defined in an external stylesheet or `<style>` block),
or `inline` (defined in an element's `style=""` attribute)

**Default:** `"inline"`

<br>

##### `selector`

_Selector | null_ for CSS properties not originating from an inline style attribute, this should be set to a
`Selector` object, otherwise this should be `null` (if the expected value does not match the defined origin,
an error will be thrown upon comparison)

**Default:** `null`

#### Methods

##### `getSpecificity()`

Get the specificity of the selector/property. If the property's origin is a selector, the specificity object
comes directly from the `Selector` object, otherwise it is always `{a: 1, b: 0, c: 0, d: 0}` for inline styles.

**Returns**

_object_ plain object with properties `a`, `b`, `c`, `d`, based on
[how specificity is tallied](https://www.w3.org/TR/2009/CR-CSS2-20090908/cascade.html#specificity)

**Throws**

* An error is thrown if the `origin` is invalid or does not match the expected value of `selector`

<br>

##### `getPrecedenceLevel()`

Based on the origin of the property and whether it is `!important`, determine the precendence level.
A lower value indicates a higher precedence.

**Returns**

_int_ precedence value, lower being higher precedence

**Throws**

* An error is thrown if the origin type is invalid.

## Notes

* This package uses a number methods introduced by ECMAScript 2015 which may not be available in all environments.
You may need to use a polyfill for the following methods:
  * [`String.fromCodePoint`](https://github.com/mathiasbynens/String.fromCodePoint)
  * [`String.prototype.codePointAt`](https://github.com/mathiasbynens/String.prototype.codePointAt)
  * [`Object.assign`](https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/Object/assign#Polyfill)
* The parsing functionality is built upon [nearley](https://github.com/Hardmath123/nearley), a JS implementation of
the [Earley Parsing Algorithm](https://en.wikipedia.org/wiki/Earley_parser). I was introduced to nearley and inspired
to use it for the purposes of CSS selector parsing by [scalpel](https://github.com/gajus/scalpel).
* After evaluating several CSS selector parsers, my goal was to produce one that could handle any valid selector string
based on the spec. As such, **please file an issue if you come across any valid selector strings that cannot be parsed!**
