import { assertNotEquals } from "@std/assert";
import { parse } from "./parser.ts";
import { assertEquals } from "@std/assert/equals";

Deno.test("AST all distinct", () => {
  const ast = parse("sina ken ala toki pona e ijo la, sina sona ala e ijo.")
    .unwrap();
  for (const [i, a] of ast.entries()) {
    for (const b of ast.slice(i + 1)) {
      assertNotEquals(a, b);
    }
  }
});
Deno.test("just 6", () => {
  assertEquals(
    parse("sina ken ala toki pona e ijo la, sina sona ala e ijo.")
      .unwrap()
      .length,
    6,
  );
});
