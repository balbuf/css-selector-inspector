/**
 * Escape methods are in their own file so they can be used within the Selector object
 */
export default {

	/**
	 * Escape a string to use as a CSS identity.
	 * @param  {String} ident unescaped identity
	 * @return {String}       escape string
	 * @see  https://drafts.csswg.org/cssom/#serialize-an-identifier
	 */
	escape(ident) {
		ident = String(ident);
		return ident.split('').map((char, index) => {
			if (char === '\0') return String.fromCodePoint(0xfffd);
			if (char === '-' && ident.length === 1) return '\\-';

			var codePoint = char.codePointAt(0);
			if ((codePoint >= 0x1 && codePoint <= 0x1f) || codePoint === 0x7f
				|| ((index === 0 || (index === 1 && ident[0] === '-')) && codePoint >= 0x30 && codePoint <= 0x39)
			) return '\\' + codePoint.toString(16) + ' ';

			if (codePoint >= 0x80 || /[-_0-9a-zA-Z]/.test(char)) return char;

			return '\\' + char;
		}).join('');
	},

	/**
	 * Escape a string to use as a CSS string, quotes included.
	 * @param  {String} str
	 * @return {String}     escaped string, with encapsulating quotes
	 */
	escapeString(str) {
		str = String(str);
		return '"' + str.split('').map((char, index) => {
			if (char === '\0') return String.fromCodePoint(0xfffd);

			var codePoint = char.codePointAt(0);
			if ((codePoint >= 0x1 && codePoint <= 0x1f) || codePoint === 0x7f) return '\\' + codePoint.toString(16) + ' ';

			if (char === '"' || char === '\\') return '\\' + char;

			return char;
		}).join('') + '"';
	},

};
