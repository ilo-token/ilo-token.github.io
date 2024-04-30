import { Debounce, Emit, TeloMisikeke } from "./dev-deps.ts";

const SOURCE = new URL("./src/main.ts", import.meta.url);
const DESTINATION = new URL("./main.js", import.meta.url);

async function build(options: Emit.BundleOptions): Promise<void> {
  const result = await Emit.bundle(SOURCE, options);
  const { code } = result;
  await Deno.writeTextFile(DESTINATION, code);
}
switch (Deno.args[0]) {
  case "build":
    console.log("Building telo misikeke...");
    await TeloMisikeke.build();
    console.log("Building main.js...");
    await build({ minify: true, type: "classic" });
    console.log("Building done!");
    break;
  case "watch": {
    const builder = Debounce.debounce(async () => {
      console.log("Starting to build...");
      try {
        await build({
          compilerOptions: { inlineSourceMap: true },
          type: "classic",
        });
        console.log("Building done!");
      } catch (error) {
        console.error(error);
      }
    }, 500);
    const watcher = Deno.watchFs(["./src/", "./telo-misikeke/"]);
    builder();
    for await (const _ of watcher) {
      builder();
    }
    throw new Error("unreachable");
  }
  default:
    throw new Error(`Unrecognized build option, ${Deno.args[0]}`);
}
