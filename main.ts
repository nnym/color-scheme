import * as cm from "codemirror";
import * as cmc from "@codemirror/commands";
import * as cml from "@codemirror/language";
import {languages} from "@codemirror/language-data";
import * as cms from "@codemirror/state";
import * as cmv from "@codemirror/view";
import {tags} from "@lezer/highlight";
import {importSchemes} from "./util" with {type: "macro"};

const editorSchema = {
	background: null,
	selection: null,
	caret: null
};

export interface Scheme {
	name: string;
	editor: {[key in keyof typeof editorSchema]: string | null};
	syntax: {[key in keyof typeof tags]: string | null}
}

export interface InternalScheme extends Scheme {
	default: boolean;
};

const FONT = "font";
const FONT_SIZE = "fontSize";
const LANGUAGE = "language";
const SCHEME = "scheme";

const {log} = console;
// @ts-ignore
const $ = (...args) => document.querySelector(...args) as HTMLElement;
// @ts-ignore
const children: (HTMLElement) => HTMLElement[] = e => [...e.children];
const focusEnd = (e: HTMLInputElement) => {
	e.focus();
	e.selectionStart = e.selectionEnd = e.value.length;
};

const fontFamily = $("#font-family") as HTMLInputElement;
const fontSize = $("#font-size") as HTMLInputElement;
const languageSelect = $("#language") as HTMLSelectElement;
const schemeSelect = $("#scheme") as HTMLSelectElement;
const schemeName = $("#scheme-name") as HTMLInputElement;
const defaultGroup = $("optgroup[label=default]");
const customGroup = $("optgroup[label=custom]");
const copySchemeButton = $("#copy-scheme") as HTMLButtonElement;
const renameSchemeButton = $("#rename-scheme") as HTMLButtonElement;
const removeSchemeButton = $("#remove-scheme") as HTMLButtonElement;

const previewKey = () => "preview/" + languageSelect.value;
const schemeKey = (scheme: string = schemeSelect.value) => "scheme/" + scheme;

function map<K extends string, V, T>(o: {[k in K]: V}, mapper: (key: K, value: V) => T | [K, T]): {[k in K]: T} {
	for (let key in o) {
		let value = mapper(key, o[key]);

		if (value instanceof Array) {
			delete o[key];
			[key, value] = value;
		}

		(o as any)[key] = value;
	}

	return o as any as {[k in K]: T};
}

const schemes = (await importSchemes()).map(s => ({default: true, ...s})) as InternalScheme[];

schemes.push(...[...Array(localStorage.length).keys()]
	.map(i => localStorage.key(i)!)
	.filter(k => k.startsWith(schemeKey("")))
	.map(k => JSON.parse(localStorage.getItem(k)!) as InternalScheme)
);

function addSchemes() {
	schemes.sort((a, b) => a.name.localeCompare(b.name));
	children(defaultGroup).concat(children(customGroup)).forEach(o => o.remove());

	for (const scheme of schemes) {
		const option = document.createElement("option");
		option.value = option.innerText = scheme.name;
		(scheme.default ? defaultGroup : customGroup).append(option);
	}
}

addSchemes();

const inputs = map({...editorSchema, ...tags}, () => ({
	hex: document.createElement("input"),
	color: document.createElement("input"),
	setColor() {
		// @ts-ignore
		const {hex, color} = this;
		color.value = hex.value.length == 4 ? "#" + [...hex.value.substring(1)].map(c => c + c).join("") : hex.value
	}
}));

let scheme: InternalScheme;

function editScheme(copy: boolean = false, rename?: string) {
	if (copy || scheme.default) schemes.push(scheme = {
		...window.structuredClone(scheme),
		name: rename ?? incrementCounter(scheme.name),
		default: false
	}); else if (rename == null) return scheme;
	else scheme.name = rename!;

	addSchemes();
	setScheme(scheme.name);
}

const languageCompartment = new cms.Compartment;
const schemeCompartment = new cms.Compartment;

const view = new cmv.EditorView({
	parent: document.body,
	extensions: [
		languageCompartment.of([]),
		schemeCompartment.of([]),
		cml.indentUnit.of("\t"),
		cmv.keymap.of([cmc.indentWithTab]),
		cmv.EditorView.updateListener.of(u => {
			if (u.docChanged) localStorage.setItem(previewKey(), view.state.doc.toString());
		}),
		cm.basicSetup
	]
});

view.focus();

function incrementCounter(name: string) {
	const counter = /( \d*)?$/;
	let base = name.replace(counter, " ");
	base += schemes.map(s1 => s1.name.match(counter))
		.filter(m => m?.index == base.length - 1)
		.map(m => Number(m![0]))
		.sort().at(-1)! + 1;
	return base;
}

async function setFontFamily() {
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
}

function setFontSize() {
	fontSize.value = fontSize.value.replaceAll(/[^\d]/g, "");
	localStorage.setItem(FONT_SIZE, fontSize.value);
	if (fontSize.value.length) $(".cm-content")!.style.fontSize = fontSize.value + "px";
}

async function setLanguage() {
	const {value} = languageSelect;
	localStorage.setItem(LANGUAGE, value);
	const doc = localStorage.getItem(previewKey()) || await fetch(previewKey()).then(r => r.text()).catch(_ => "");

	view.dispatch({
		changes: [{from: 0, to: view.state.doc.length, insert: doc}],
		effects: languageCompartment.reconfigure(await languages.find(l => l.alias.includes(languageSelect.value))!.load())
	})
}

function setScheme(name?: string) {
	if (name != null) schemeSelect.value = name;
	if (!schemeSelect.value) schemeSelect.value = "Darcula";

	scheme = schemes.find(s => s.name == schemeSelect.value)!;
	localStorage.setItem(SCHEME, schemeSelect.value);
	toggleSchemeInput(true);
	removeSchemeButton.disabled = scheme.default;
}

function loadScheme() {
	setScheme();

	for (const [name, color] of Object.entries({...scheme.editor, ...scheme.syntax})) {
		const input = inputs[name];
		input.hex.value = color ?? "";
		input.setColor();
	}

	applyHighlighting();
}

function saveScheme() {
	localStorage.setItem(schemeKey(), JSON.stringify(scheme));
}

function removeScheme() {
	// @ts-ignore
	const option = children(defaultGroup).concat(children(customGroup)).find(s1 => s1.value == scheme.name) as HTMLOptionElement;
	// @ts-ignore
	schemeSelect.value = (option.nextElementSibling ?? option.previousElementSibling)?.value;
	option.remove();

	schemes.splice(schemes.indexOf(scheme), 1);
	localStorage.removeItem(schemeKey(scheme.name));

	loadScheme();
}

function toggleSchemeInput(select: boolean = schemeName.type == "text") {
	schemeName.type = select ? "hidden" : "text";
	schemeSelect.style.display = select ? "block" : "none";

	if (!select) {
		schemeName.value = schemeSelect.value;
		focusEnd(schemeName);
	}
}

function applyHighlighting() {
	view.dispatch({effects: schemeCompartment.reconfigure([
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

fontFamily.value = localStorage.getItem(FONT) ?? "";
fontSize.value = localStorage.getItem(FONT_SIZE) ?? fontSize.value;
languageSelect.value = localStorage.getItem(LANGUAGE) ?? "cpp";
schemeSelect.value = localStorage.getItem(SCHEME)!;

fontFamily.onchange = setFontFamily;
fontSize.oninput = setFontSize;
languageSelect.oninput = setLanguage;
schemeSelect.onchange = loadScheme;

copySchemeButton.onclick = () => {
	editScheme(true);
	saveScheme();
	toggleSchemeInput(false);
};

renameSchemeButton.onclick = () => toggleSchemeInput();
removeSchemeButton.onclick = removeScheme;

schemeName.onblur = _ => toggleSchemeInput(true);

schemeName.onkeydown = e => {
	if (e.key in ["Enter", "Escape"]) toggleSchemeInput(true)
};

schemeName.onchange = _ => {
	let name = schemeName.value = schemeName.value.trim();
	if (schemes.find(s => s.name == name)) name = incrementCounter(name);

	localStorage.removeItem(schemeKey());
	editScheme(false, name);
	saveScheme();
};

setFontFamily();
setFontSize();
setLanguage();
loadScheme();

const colorList = $("#colors");

for (const [i, [name, entry]] of Object.entries(inputs).entries()) {
	const {hex, color} = entry;
	color.type = "color";

	function set(name: string, value: string) {
		if ((scheme.editor[name] ?? scheme.syntax[name]) != (hex.value = value)) {
			editScheme();
			(scheme.editor[name] == undefined ? scheme.syntax : scheme.editor)[name] = hex.value;
			saveScheme();
			applyHighlighting();
		}
	}

	hex.oninput = _ => {
		set(name, hex.value.trim().replace(/^#*/, "#").substring(0, 7));
		entry.setColor();
	};

	hex.onkeydown = e => {
		const target =
			e.key == "ArrowDown" ? Object.values(inputs)[i + 1]
			: e.key == "ArrowUp" ? Object.values(inputs)[i - 1]
			: null;

		if (target) {
			focusEnd(target.hex);
			return false;
		}
	};

	color.oninput = _ => set(name, color.value);

	const span = document.createElement("span");
	span.append(hex, color);
	colorList.append(document.createTextNode(name.replaceAll(/(?<=[a-z])[A-Z\d]/g, m => " " + m[0].toLowerCase())));
	colorList.append(span);
}

document.body.style.visibility = "visible";
