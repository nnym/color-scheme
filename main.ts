import "https://cdnjs.cloudflare.com/ajax/libs/codemirror/6.65.7/codemirror.min.js";
import * as cm from "codemirror";
import * as cma from "@codemirror/autocomplete";
import * as cmc from "@codemirror/commands";
import {cpp} from "@codemirror/lang-cpp";
import * as cml from "@codemirror/language";
import * as cmli from "@codemirror/lint";
import * as cms from "@codemirror/state";
import * as cmv from "@codemirror/view";
import * as cmse from "@codemirror/search";
import {tags} from "@lezer/highlight";

declare global {
	interface Window {
		setFontFamily: () => Promise<void>;
		setFontSize: () => void;
	}
}

const {log} = console;
// @ts-ignore
const $ = (...args) => document.querySelector(...args) as HTMLElement;

const gray = "808080";
const gray05 = "d8d8d8";
const white = "d0d0d0";
const yellow = "eedd82";
const green = "32cd32";
const lightBlue = "6897bb";
const darkGreen = "629755";
const orange = "cc7832";
const purple = "9876aa";
const darkRed = "a34a27";

const colors = {
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
	modifier: null,
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
	processingInstruction: null,
	definition: null,
	constant: lightBlue,
	function: yellow,
	standard: null,
	local: null,
	special: green
};

const colorCompartment = new cms.Compartment;

const view = new cmv.EditorView({
	parent: document.body,
	extensions: [
		colorCompartment.of([]),
		cpp(),
		cm.basicSetup
	],
	doc: `
		#include <cstdio>

		template<typename T>
		struct Node {
			T value;
			Node<T> *left, *right;

			Node(T value = T(), Node<T> *left = nullptr, Node<T> *right = nullptr) : value(value), left(left), right(right) {}

			void traverseInOrder(auto process) {
				if (this->left) this->left->traverseInOrder(process);
				process(*this);
				if (this->right) this->right->traverseInOrder(process);
			}

			~Node() {
				if (this->left) delete this->left;
				if (this->right) delete this->right;
			}
		};

		int main() {
			auto l = new Node("foo");
			auto rr = new Node("quux");
			auto r = new Node<const char*>("baz", nullptr, rr);
			Node root("bar", l, r);
			root.traverseInOrder([](auto &node) {
				puts(node.value);
			});
		}
	`.replaceAll(/(?<=\n)\t{2}/g, "").trim()
});

window.setFontFamily = async () => {
	const input = $("#font-family") as HTMLInputElement;
	input.value = input.value.trim();
	const style = $(".cm-scroller")!.style;

	if (!["", "serif", "sans-serif", "monospace"].includes(input.value.toLowerCase())) {
		const fonts = await document.fonts.ready;
		const urlPrefix = "https://fonts.googleapis.com/css?family=";
		const correctedURL = urlPrefix + input.value.replaceAll(/(?<=\b)\p{L}/gu, m => m[0].toUpperCase());

		for (const url of new Set([correctedURL, urlPrefix + input.value])) {
			const link = document.createElement("link");
			link.rel = "stylesheet";
			link.href = url;
			document.head.appendChild(link);
		}
	}

	style.fontFamily = input.value + (input.value && ", ") + "monospace";
};

window.setFontSize = () => {
	const input = $("#font-size") as HTMLInputElement;
	input.value = input.value.replaceAll(/[^\d]/g, "");
	if (input.value.length) $(".cm-content")!.style.fontSize = input.value + "px";
};

function applyHighlighting() {
	view.dispatch({effects: colorCompartment.reconfigure(cml.syntaxHighlighting(cml.HighlightStyle.define(
		Object.entries(colors).map(([name, color]) => ({tag: tags[name], color: "#" + color}))
	)))});
}

window.setFontFamily();
window.setFontSize();
applyHighlighting();

const colorList = $("#colors")!;

for (const name in tags) {
	const hex = document.createElement("input");
	hex.type = "text";
	hex.value = "#" + (colors[name] ?? "");
	hex.maxLength = 7;

	const color = document.createElement("input");
	color.type = "color";
	color.value = hex.value

	hex.oninput = e => {
		const value = hex.value.trim();
		hex.value = value.startsWith("#") ? value : ("#" + value).substring(0, hex.maxLength);
		color.value = hex.value;
		colors[name] = hex.value.substring(1);
		applyHighlighting();
	};

	color.oninput = e => {
		hex.value = color.value;
		colors[name] = hex.value.substring(1);
		applyHighlighting();
	};

	colorList.appendChild(document.createTextNode(name.split(/(?<=[a-z])(?=[A-Z\d])/).map(s => s.toLowerCase()).join(" ")));
	colorList.appendChild(hex);
	colorList.appendChild(color);
}
