import * as cm from "codemirror";
import * as cma from "@codemirror/autocomplete";
import * as cmc from "@codemirror/commands";
import * as cml from "@codemirror/language";
import {languages} from "@codemirror/language-data";
import * as cmli from "@codemirror/lint";
import * as cms from "@codemirror/state";
import * as cmv from "@codemirror/view";
import * as cmse from "@codemirror/search";
import {tags} from "@lezer/highlight";

declare global {
	interface Window {
		setFontFamily: () => Promise<void>;
		setFontSize: () => void;
		setLanguage: () => void;
	}
}

const FONT = "font";
const FONT_SIZE = "fontSize";
const LANGUAGE = "language";

const {log} = console;
// @ts-ignore
const $ = (...args) => document.querySelector(...args) as HTMLElement;

const fontFamily = $("#font-family") as HTMLInputElement;
const fontSize = $("#font-size") as HTMLInputElement;
const languageSelect = $("#language") as HTMLSelectElement;

const previewKey = () => "preview/" + languageSelect.value;

function map<V, T>(o: {[k: string]: V}, mapper: (key: string, value: V) => T): {[k: string]: T} {
	for (let key in o) {
		let value = mapper(key, o[key]);

		if (value instanceof Array) {
			delete o[key];
			[key, value] = value;
		}

		(o as any)[key] = value;
	}

	return o as any as {string: T};
}

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

const scheme: {[k: string]: {[k: string]: string | null}} = {
	editor: {
		background: gray01,
		selection: gray02,
		caret: gray04
	},
	syntax: {
		...map({...tags}, _ => null),
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
};

const compartment = new cms.Compartment;

const view = new cmv.EditorView({
	parent: document.body,
	extensions: [
		compartment.of([]),
		cml.indentUnit.of("\t"),
		cmv.keymap.of([cmc.indentWithTab]),
		cmv.EditorView.updateListener.of(u => {
			if (u.docChanged) localStorage.setItem(previewKey(), view.state.doc.toString());
		}),
		cm.basicSetup
	]
});

view.focus();

window.setFontFamily = async () => {
	fontFamily.value = fontFamily.value.trim();
	localStorage.setItem(FONT, fontFamily.value);
	const style = $(".cm-scroller")!.style;

	if (!["", "serif", "sans-serif", "monospace"].includes(fontFamily.value.toLowerCase())) {
		const urlPrefix = "https://fonts.googleapis.com/css?family=";
		const correctedURL = urlPrefix + fontFamily.value.replaceAll(/(?<=\b)\p{L}/gu, m => m[0].toUpperCase());

		for (const url of new Set([correctedURL, urlPrefix + fontFamily.value])) {
			const link = document.createElement("link");
			link.rel = "stylesheet";
			link.href = url;
			document.head.appendChild(link);
		}
	}

	style.fontFamily = fontFamily.value + (fontFamily.value && ", ") + "monospace";
};

window.setFontSize = () => {
	fontSize.value = fontSize.value.replaceAll(/[^\d]/g, "");
	localStorage.setItem(FONT_SIZE, fontSize.value);
	if (fontSize.value.length) $(".cm-content")!.style.fontSize = fontSize.value + "px";
};

window.setLanguage = async () => {
	const {value} = languageSelect;
	localStorage.setItem(LANGUAGE, value);
	const doc = localStorage.getItem(previewKey()) || await fetch(previewKey()).then(r => r.text()).catch(_ => "");
	// @ts-ignore
	view.dispatch({changes: [{from: 0, to: view.state.doc.length, insert: doc}]})
	applyHighlighting();
}

async function applyHighlighting() {
	view.dispatch({effects: compartment.reconfigure([
		await languages.find(l => l.alias.includes(languageSelect.value))!.load(),
		cmv.EditorView.theme({
			"&, .cm-gutters": {
				background: scheme.editor.background
			},
			".cm-cursor": {
				borderColor: scheme.editor.caret
			},
			"&.cm-focused:not(#_) .cm-selectionBackground": {
				background: scheme.editor.selection
			}
		}, {dark: true}),
		// @ts-ignore
		cml.syntaxHighlighting(cml.HighlightStyle.define(Object.entries(scheme.syntax).map(([name, color]) => ({tag: tags[name], color}))))
	])});
}

const brain = languages.find(l => l.extensions.includes("bf"));
// @ts-ignore
[brain.name, brain.alias] = ["Brain****", ["brain****"]];

for (const language of languages.sort((a, b) => a.name.localeCompare(b.name))) {
	const option = document.createElement("option");
	option.value = language.alias[0];
	option.textContent = language.name;
	languageSelect.appendChild(option);
}

languageSelect.value = localStorage.getItem(LANGUAGE) ?? "cpp";
languageSelect.oninput = window.setLanguage;

fontFamily.value = localStorage.getItem(FONT) ?? "";
fontSize.value = localStorage.getItem(FONT_SIZE) ?? fontSize.value;
window.setFontFamily();
window.setFontSize();
window.setLanguage();

const colorList = $("#colors")!;
const hexInputs: HTMLInputElement[] = [];

for (const set of Object.values(scheme)) {
	for (const name in set) {
		const hex = document.createElement("input");
		hex.type = "text";
		hex.value = set[name] ?? "";

		const index = hexInputs.length;
		hexInputs.push(hex);

		const color = document.createElement("input");
		const setColor = () => color.value = hex.value.length == 4 ? "#" + [...hex.value.substring(1)].map(c => c + c).join("") : hex.value;
		color.type = "color";
		setColor();

		hex.oninput = _ => {
			const value = hex.value.trim();
			hex.value = value.replace(/^#*/, "#").substring(0, 7);
			setColor();
			set[name] = hex.value;
			applyHighlighting();
		};

		hex.onkeydown = e => {
			const target =
				e.key == "ArrowDown" ? hexInputs[index + 1]
				: e.key == "ArrowUp" ? hexInputs[index - 1]
				: null;

			if (target) {
				target.focus();
				target.selectionStart = target.selectionEnd = target.value.length;
				return false;
			}
		};

		color.oninput = _ => {
			hex.value = color.value;
			set[name] = hex.value;
			applyHighlighting();
		};

		colorList.append(document.createTextNode(name.replaceAll(/(?<=[a-z])[A-Z\d]/g, m => " " + m[0].toLowerCase())));
		colorList.append(hex, color);
	}
}
