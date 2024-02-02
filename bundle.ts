import { emit } from "./dev-deps.ts";
import { debounce } from "./dev-deps.ts";

const SOURCE = "./src/main.ts";
const DESTINATION = "./main.js";

const url = new URL(SOURCE, import.meta.url);

if (Deno.args[0] === "build") {
  const result = await emit.bundle(url, { minify: true });
  const { code } = result;
  await Deno.writeTextFile(DESTINATION, code);
} else if (Deno.args[0] === "watch") {
  const builder = debounce.debounce(async () => {
    console.log("Starting to build...");
    const result = await emit.bundle(url, {
      compilerOptions: { inlineSourceMap: true },
    });
    const { code } = result;
    await Deno.writeTextFile(DESTINATION, code);
    console.log("Building done!");
  }, 500);
  const watcher = Deno.watchFs("./src/");
  builder();
  for await (const _ of watcher) {
    builder();
  }
} else {
  throw new Error(`Unrecognized build option, ${Deno.args[0]}`);
}
