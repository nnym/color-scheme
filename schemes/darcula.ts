import {Scheme} from "../main.ts";

const gray = "#808080";
const gray01 = "#282828";
const gray02 = "#383838";
const gray04 = "#b8b8b8";
const gray05 = "#d8d8d8";
const white = "#d0d0d0";
const yellow = "#eedd82";
const green = "#32cd32";
const lightBlue = "#6897bb";
const darkGreen = "#629755";
const orange = "#cc7832";
const purple = "#9876aa";
const darkRed = "#a34a27";

export default {
	name: "Darcula",
	editor: {
		background: gray01,
		selection: gray02,
		caret: gray04
	},
	syntax: {
		comment: gray,
		lineComment: gray,
		blockComment: gray,
		docComment: gray,
		name: white,
		variableName: white,
		typeName: orange,
		tagName: white,
		propertyName: yellow,
		attributeName: yellow,
		className: white,
		labelName: purple,
		namespace: purple,
		macroName: green,
		literal: lightBlue,
		string: darkGreen,
		docString: darkGreen,
		character: lightBlue,
		attributeValue: yellow,
		number: lightBlue,
		integer: lightBlue,
		float: lightBlue,
		bool: lightBlue,
		regexp: darkGreen,
		escape: white,
		color: darkGreen,
		url: lightBlue,
		keyword: orange,
		self: orange,
		null: lightBlue,
		atom: null,
		unit: null,
		modifier: gray05,
		operatorKeyword: orange,
		controlKeyword: orange,
		definitionKeyword: orange,
		moduleKeyword: orange,
		operator: gray05,
		derefOperator: gray05,
		arithmeticOperator: gray05,
		logicOperator: gray05,
		bitwiseOperator: gray05,
		compareOperator: gray05,
		updateOperator: gray05,
		definitionOperator: gray05,
		typeOperator: gray05,
		controlOperator: gray05,
		punctuation: white,
		separator: white,
		bracket: white,
		angleBracket: white,
		squareBracket: white,
		paren: white,
		brace: white,
		content: white,
		heading: white,
		heading1: orange,
		heading2: yellow,
		heading3: darkRed,
		heading4: gray,
		heading5: purple,
		heading6: darkGreen,
		contentSeparator: null,
		list: null,
		quote: darkGreen,
		emphasis: white,
		strong: white,
		link: null,
		monospace: null,
		strikethrough: null,
		inserted: null,
		deleted: null,
		changed: null,
		invalid: null,
		meta: null,
		documentMeta: null,
		annotation: null,
		processingInstruction: orange,
		definition: null,
		constant: lightBlue,
		function: yellow,
		standard: null,
		local: null,
		special: green
	}
} satisfies Scheme;
