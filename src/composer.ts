import { Clause } from "./english-ast.ts";
import { Sentence } from "./english-ast.ts";
import { OutputError, TodoError } from "./error.ts";
import { Output } from "./output.ts";
import { translate as translateToAst } from "./translator.ts";

function clause(clause: Clause): string {
  switch (clause.type) {
    case "free form":
      return clause.text;
    case "interjection":
      return clause.interjection;
    default:
      throw new TodoError(`composing ${clause.type}`);
  }
}
function sentence(sentence: Sentence): string {
  return `${clause(sentence.clause)}${sentence.punctuation}`;
}
export function translate(src: string): Output<string> {
  try {
    return translateToAst(src)
      .map((sentences) => sentences.map(sentence).join(" "));
  } catch (error) {
    if (error instanceof OutputError) {
      return new Output(error);
    } else {
      throw error;
    }
  }
}
