import { Clause } from "./english-ast.ts";
import { Sentence } from "./english-ast.ts";
import { Output } from "./output.ts";
import { translate as translateToAst } from "./translator.ts";

function clause(clause: Clause): string {
  switch(clause.type) {
    case "free form":
      return clause.text;
    case "interjection":
      return clause.interjection;
    case "default":
    case "subject phrase":
    case "implied it's":
    case "vocative":
    case "compound":
    case "dependent":
      throw new Error("todo");
  }
}
function sentence(sentence: Sentence): string {
  return `${clause(sentence.clause)}${sentence.punctuation}`;
}
export function translate(src: string): Output<string> {
  return translateToAst(src)
    .map((sentences) => sentences.map(sentence).join(""));
}
