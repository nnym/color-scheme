import fs from "fs";
import {Scheme} from "./main";

export function importSchemes(): Promise<Scheme[]> {
	return Promise.all(fs.readdirSync("schemes").map(async s => (await import("./schemes/" + s)).default as Scheme));
}
