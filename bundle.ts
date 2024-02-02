import { emit } from "./dev-deps.ts";

const SOURCE = "./src/main.ts";
const DESTINATION = "./main.js";

if (Deno.args[0] === "build") {
  const url = new URL(SOURCE, import.meta.url);
  const result = await emit.bundle(url, { minify: true });

  const { code } = result;
  await Deno.writeTextFile(DESTINATION, code);
} else if (Deno.args[0] === "watch") {
  throw new Error("todo");
} else {
  throw new Error(`Unrecognized build option, ${Deno.args[0]}`);
}
