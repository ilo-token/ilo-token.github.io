import * as English from "./ast.ts";

export function unemphasized(word: string): English.Word {
  return { word, emphasis: false };
}
