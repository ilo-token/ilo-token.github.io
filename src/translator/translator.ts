import { ArrayResult } from "../array_result.ts";
import { parse } from "../parser/parser.ts";
import * as EnglishComposer from "./composer.ts";
import { multipleSentences } from "./sentence.ts";

export function translate(text: string): ArrayResult<string> {
  return parse(text)
    .flatMap(multipleSentences)
    .map(EnglishComposer.multipleSentences);
}
