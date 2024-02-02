import { emit } from "./dev-deps.ts";
import { debounce } from "./dev-deps.ts";

const SOURCE = "./src/main.ts";
const DESTINATION = "./main.js";

const url = new URL(SOURCE, import.meta.url);

async function build(options: emit.BundleOptions): Promise<void> {
  const result = await emit.bundle(url, options);
  const { code } = result;
  await Deno.writeTextFile(DESTINATION, code);
}
if (Deno.args[0] === "build") {
  await build({ minify: true });
} else if (Deno.args[0] === "watch") {
  const builder = debounce.debounce(async () => {
    console.log("Starting to build...");
    await build({ compilerOptions: { inlineSourceMap: true } });
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
