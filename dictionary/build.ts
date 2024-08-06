import nlp from "compromise/three";
import {
  Adjective,
  AdjectiveType,
  Definition,
  Determiner,
  DeterminerType,
  Dictionary,
  Noun,
} from "./type.ts";
import {
  all,
  choiceOnlyOne,
  match as rawMatch,
  optionalAll,
  Parser,
  sequence as rawSequence,
} from "../src/parser-lib.ts";
import { Output, OutputError } from "../src/output.ts";
import { UnrecognizedError } from "../src/error.ts";

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
function sequence<T extends Array<unknown>>(
  ...sequence: { [I in keyof T]: TextParser<T[I]> } & { length: T["length"] }
): TextParser<T> {
  // deno-lint-ignore no-explicit-any
  return rawSequence<string, T>(...sequence as any);
}
function space(): TextParser<null> {
  return all(
    choiceOnlyOne(match(/\s/, "space"), match(/#[^\n]*/, "comment")),
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
    .filter((that) => that === keyword) as TextParser<T>;
}
function optionalNumber(): TextParser<null | "singular" | "plural"> {
  return optionalAll(choiceOnlyOne(keyword("singular"), keyword("plural")));
}
function tagInside(): TextParser<Tag> {
  return choiceOnlyOne(
    keyword("f").map((_) => ({ type: "filler" }) as Tag),
    keyword("particle").map((_) => ({ type: "particle" }) as Tag),
    sequence(keyword("n"), optionalNumber())
      .map(([_, number]) => ({ type: "noun", number }) as Tag),
    sequence(keyword("pn"), optionalNumber())
      .map(([_, number]) => ({ type: "personal pronoun", number }) as Tag),
    sequence(
      keyword("aj"),
      choiceOnlyOne(
        keyword("opinion"),
        keyword("size"),
        sequence(keyword("physical"), keyword("quality")).map((_) =>
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
    sequence(
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
    sequence(
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
  return sequence(
    lex(match(/\(/, "open parenthesis")),
    tagInside(),
    lex(match(/\)/, "close parenthesis")),
  )
    .map(([_, tag]) => tag);
}
function unit(): TextParser<Unit> {
  return sequence(word(), tag()).map(([word, tag]) => ({ word, tag }));
}
function specificUnit<T extends Tag["type"]>(
  type: T,
): TextParser<Unit & { tag: Tag & { type: T } }> {
  return unit().filter((unit) => unit.tag.type === type) as TextParser<
    Unit & { tag: Tag & { type: T } }
  >;
}
function condense(first: string, second: string): string {
  if (first === second) {
    return first;
  } else if (
    second.length > first.length && second.slice(0, first.length) === first
  ) {
    return `${first}(${second.slice(first.length)})`;
  } else {
    return `${first}/${second}`;
  }
}
function noun(): TextParser<Noun> {
  return sequence(all(determiner()), all(adjective()), specificUnit("noun"))
    .map(([determiner, adjective, noun]) => {
      let singular: null | string = null;
      let plural: null | string = null;
      let condensed: string;
      switch (noun.tag.number) {
        case null:
          singular = nlp(noun.word).nouns().toSingular().text();
          plural = nlp(noun.word).nouns().toPlural().text();
          condensed = condense(singular, plural);
          break;
        case "singular":
          condensed = singular = noun.word;
          break;
        case "plural":
          condensed = plural = noun.word;
          break;
      }
      return { determiner, adjective, singular, plural, condensed };
    });
}
function determiner(): TextParser<Determiner> {
  return specificUnit("determiner")
    .map((unit) => ({
      determiner: unit.word,
      kind: unit.tag.kind,
      number: unit.tag.number ?? "both",
    }));
}
function adjective(): TextParser<Adjective> {
  return sequence(
    all(specificUnit("adverb").map((unit) => unit.word)),
    specificUnit("adjective"),
  )
    .map(([adverb, adjective]) => ({
      adverb,
      adjective: adjective.word,
      kind: adjective.tag.kind,
    }));
}
function insideDefinition(): TextParser<Definition> {
  return choiceOnlyOne(
    // TODO: filler
    specificUnit("particle")
      .map((unit) =>
        ({ type: "particle", definition: unit.word }) as Definition
      ),
    noun().map((noun) => ({ type: "noun", ...noun }) as Definition),
    sequence(noun(), specificUnit("preposition"))
      .map(([noun, preposition]) =>
        ({
          type: "noun preposition",
          noun,
          preposition: preposition.word,
        }) as Definition
      ),
    // TODO: personal pronoun
    determiner().map((determiner) => {
      const forms = determiner.determiner.split("/");
      switch (forms.length) {
        case 1:
          return { type: "determiner", ...determiner } as Definition;
        case 2: {
          const singular = forms[0].trim();
          const plural = forms[1].trim();
          return {
            type: "quantified determiner",
            singular,
            plural,
            condensed: condense(singular, plural),
            kind: determiner.kind,
            number: determiner.number,
          } as Definition;
        }
        default:
          throw new UnrecognizedError(`determiner with ${forms.length} forms`);
      }
    }),
    specificUnit("numeral").map((unit) => {
      const numeral = Number.parseInt(unit.word);
      if (Number.isNaN(numeral)) {
        throw new UnrecognizedError("non-number on numeral");
      } else {
        return { type: "numeral", numeral } as Definition;
      }
    }),
    adjective()
      .map((adjective) => ({ type: "adjective", ...adjective }) as Definition),
    sequence(
      specificUnit("adjective"),
      specificUnit("conjunction").filter((unit) => unit.word === "and"),
      specificUnit("adjective"),
    )
      .map(([left, _, right]) =>
        ({
          type: "compound adjective",
          adjective: [left, right]
            .map((unit) => ({
              adverb: [],
              adjective: unit.word,
              kind: unit.tag.kind,
            })),
        }) as Definition
      ),
    specificUnit("adverb")
      .map((unit) => ({ type: "adverb", adverb: unit.word }) as Definition),
    // TODO: verb
    specificUnit("preposition")
      .map((unit) =>
        ({ type: "preposition", preposition: unit.word }) as Definition
      ),
    sequence(specificUnit("preposition"), noun())
      .map(([preposition, object]) =>
        ({
          type: "preposition object",
          preposition: preposition.word,
          object,
        }) as Definition
      ),
    specificUnit("interjection")
      .map((unit) =>
        ({ type: "interjection", interjection: unit.word }) as Definition
      ),
    specificUnit("adhoc")
      .map((unit) => ({ type: "adhoc", definition: unit.word }) as Definition),
  );
}
function definition(): TextParser<Definition> {
  return insideDefinition().skip(lex(match(/;/, "semicolon")));
}
function singleWord(): TextParser<string> {
  return lex(match(/[a-z]+/, "word")).map(([word]) => word);
}
function head(): TextParser<Array<string>> {
  return sequence(
    all(singleWord().skip(lex(match(/,/, "comma")))),
    singleWord(),
  )
    .skip(lex(match(/:/, "colon")))
    .map(([init, last]) => [...init, last]);
}
function eol(): TextParser<null> {
  return new Parser((src) => {
    if (src === "") {
      return new Output([{ value: null, rest: "" }]);
    } else {
      const line = src.match(/[^\n]*/)![0].trim();
      return new Output(
        new OutputError(`Problem encountered at definition ${line}`),
      );
    }
  });
}
const dictionary = space()
  .with(all(sequence(head(), all(definition()))))
  .skip(eol())
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
