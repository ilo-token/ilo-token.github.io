import { emit } from "./dev-deps.ts";

const SOURCE = "./src/main.ts";
const DESTINATION = "./main.js";

const url = new URL(SOURCE, import.meta.url);
const result = await emit.bundle(url);

const { code } = result;
await Deno.writeTextFile(DESTINATION, code);
