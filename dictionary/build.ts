import nlp from "compromise/three";
import { AdjectiveType, Definition, DeterminerType } from "./type.ts";
import {
  all,
  choiceOnlyOne,
  eol,
  match as rawMatch,
  optionalAll,
  Parser,
  sequence as rawSequence,
} from "../src/parser-lib.ts";
import { Dictionary } from "./type.ts";
import { Output } from "../src/output.ts";
import { UnexpectedError } from "../src/error.ts";

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

function rest(): TextParser<string> {
  return new Parser((src) => new Output([{ value: src, rest: src }]));
}
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
    choiceOnlyOne(match(/\s/, "space"), match(/\/\/[^\n]*/, "comment")),
  )
    .map((_) => null);
}
function lex<T>(parser: TextParser<T>): TextParser<T> {
  return parser.skip(space());
}
function word(): TextParser<string> {
  return all(
    choiceOnlyOne(
      match(/\\(\S)/, "escape sequence").map(([_, character]) => character),
      match(/[^\\():;]/, "word").map(([character]) => character),
    ),
  )
    .map((value) => value.join("").replaceAll(/\s+/g, " ").trim());
}
function keyword<T extends string>(keyword: T): TextParser<T> {
  return lex(match(/[a-z]+/, keyword))
    .map(([keyword]) => keyword)
    .filter((that) => {
      if (that === keyword) {
        return true;
      } else {
        throw new UnexpectedError(that, keyword);
      }
    }) as TextParser<T>;
}
function optionalNumber(): TextParser<null | "singular" | "plural"> {
  return optionalAll(choiceOnlyOne(keyword("singular"), keyword("plural")));
}
function tagInside(): TextParser<Tag> {
  return choiceOnlyOne(
    keyword("f").map((_) => ({ type: "filler" }) as Tag),
    keyword("particle").map((_) => ({ type: "particle" }) as Tag),
    textSequence(keyword("n"), optionalNumber())
      .map(([_, number]) => ({ type: "noun", number }) as Tag),
    textSequence(keyword("pn"), optionalNumber())
      .map(([_, number]) => ({ type: "personal pronoun", number }) as Tag),
    textSequence(
      keyword("aj"),
      choiceOnlyOne(
        keyword("opinion"),
        keyword("size"),
        textSequence(keyword("physical"), keyword("quality")).map((_) =>
          "physical quality"
        ),
        keyword("age"),
        keyword("color"),
        keyword("origin"),
        keyword("material"),
        keyword("qualifier"),
      ),
    )
      .map(([_, kind]) => ({ type: "adjective", kind }) as Tag),
    textSequence(
      keyword("d"),
      choiceOnlyOne(
        keyword("article"),
        keyword("demonstrative"),
        keyword("distributive"),
        keyword("interrogative"),
        keyword("possessive"),
        keyword("quantifier"),
        keyword("relative"),
      ),
      optionalNumber(),
    )
      .map(([_, kind, number]) =>
        ({ type: "determiner", kind, number }) as Tag
      ),
    keyword("num").map((_) => ({ type: "numeral" }) as Tag),
    keyword("av").map((_) => ({ type: "adverb" }) as Tag),
    textSequence(
      optionalAll(choiceOnlyOne(keyword("tra"), keyword("int"))),
      keyword("v"),
    )
      .map(([type]) => {
        let kind: null | "transitive" | "intransitive";
        switch (type) {
          case null:
            kind = null;
            break;
          case "tra":
            kind = "transitive";
            break;
          case "int":
            kind = "intransitive";
            break;
        }
        return { type: "verb", kind };
      }),
    keyword("pp").map((_) => ({ type: "preposition" }) as Tag),
    keyword("i").map((_) => ({ type: "interjection" }) as Tag),
    keyword("c").map((_) => ({ type: "conjunction" }) as Tag),
    keyword("adhoc").map((_) => ({ type: "adhoc" }) as Tag),
  );
}
function tag(): TextParser<Tag> {
  return textSequence(
    lex(match(/\(/, "open parenthesis")),
    tagInside(),
    lex(match(/\)/, "close parenthesis")),
  )
    .map(([_, tag]) => tag);
}
function unit(): TextParser<Unit> {
  return textSequence(word(), tag()).map(([word, tag]) => ({ word, tag }));
}
function definition(): TextParser<Definition> {
  return all(unit()).skip(lex(match(/;/, "semicolon")))
    .flatMapValue((definition) => {
      throw new Error("todo");
    });
}
function singleWord(): TextParser<string> {
  return lex(match(/[a-z]+/, "word")).map(([word]) => word);
}
function head(): TextParser<Array<string>> {
  return textSequence(
    all(singleWord().skip(lex(match(/,/, "comma")))),
    singleWord(),
  )
    .skip(lex(match(/:/, "colon")))
    .map(([init, last]) => [...init, last]);
}
const dictionary = space()
  .with(all(textSequence(head(), all(definition()))))
  .skip(eol("EOL"))
  .map((entries) => {
    const dictionary: Dictionary = {};
    for (const [words, definitions] of entries) {
      for (const word of words) {
        dictionary[word] = definitions;
      }
    }
    return dictionary;
  });
export async function build(): Promise<void> {
  const output = dictionary.parse(await Deno.readTextFile(SOURCE));
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
