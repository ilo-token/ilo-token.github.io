import { bundle } from "https://deno.land/x/emit@0.34.0/mod.ts";

const SOURCE = "./src/main.ts";
const DESTINATION = "./main.js";

const url = new URL(SOURCE, import.meta.url);
const result = await bundle(url);

const { code } = result;
await Deno.writeTextFile(DESTINATION, code);
