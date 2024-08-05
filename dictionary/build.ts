import nlp from "compromise/three";
import { AdjectiveType, Definition, DeterminerType } from "./type.ts";
import {
  all,
  choiceOnlyOne,
  match as rawMatch,
  Parser,
  sequence as rawSequence,
} from "../src/parser-lib.ts";
import { Dictionary } from "./type.ts";

const SOURCE = new URL("./dictionary", import.meta.url);
const DESTINATION = new URL("./dictionary.ts", import.meta.url);

type Tag =
  | { type: "filler" }
  | { type: "particle" }
  | { type: "noun"; number: null | "singular" | "plural" }
  | { type: "personal pronoun"; number: null | "singular" | "plural" }
  | { type: "adjective"; kind: AdjectiveType }
  | {
    type: "determiner";
    kind: DeterminerType;
    number: null | "singular" | "plural";
  }
  | { type: "numeral" }
  | { type: "adverb" }
  | { type: "verb"; kind: null | "transitive" | "intransitive" }
  | { type: "preposition" }
  | { type: "interjection" }
  | { type: "conjunction" }
  | { type: "adhoc" };

type Unit = { word: string; tag: Tag };

type TextParser<T> = Parser<string, T>;
function match(
  regex: RegExp,
  description: string,
): TextParser<RegExpMatchArray> {
  return rawMatch(regex, description, "EOL");
}
function textSequence<T extends Array<unknown>>(
  ...sequence: { [I in keyof T]: TextParser<T[I]> } & { length: T["length"] }
): TextParser<T> {
  // deno-lint-ignore no-explicit-any
  return rawSequence<string, T>(...sequence as any);
}
function space(): TextParser<null> {
  return all(
    choiceOnlyOne(match(/\s/, "space"), match(/\/\/[^\n]*\n/, "comment")),
  )
    .map((_) => null);
}
function lex<T>(parser: TextParser<T>): TextParser<T> {
  return parser.skip(space());
}
function definition(): TextParser<Definition> {
  throw new Error("todo");
}
function singleWord(): TextParser<string> {
  return lex(match(/[a-z]*/, "word")).map(([word]) => word);
}
function head(): TextParser<Array<string>> {
  return textSequence(
    all(singleWord().skip(lex(match(/,/, "comma")))),
    singleWord(),
  )
    .skip(lex(match(/:/, "colon")))
    .map(([init, last]) => [...init, last]);
}
function dictionary(): TextParser<Dictionary> {
  return all(textSequence(head(), all(definition()))).map((entries) => {
    const dictionary: Dictionary = {};
    for (const [words, definitions] of entries) {
      for (const word of words) {
        dictionary[word] = definitions;
      }
    }
    return dictionary;
  });
}
export async function build(): Promise<void> {
  const output = dictionary().parse(await Deno.readTextFile(SOURCE));
  if (output.isError()) {
    throw new AggregateError(output.errors);
  } else {
    const dictionary = JSON.stringify(output.output[0]);
    await Deno.writeTextFile(
      DESTINATION,
      `import{Dictionary}from"./type.ts";export const DICTIONARY:Dictionary=${dictionary}`,
    );
  }
}
