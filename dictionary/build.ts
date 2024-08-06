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
  eol,
  match as rawMatch,
  optionalAll,
  Parser,
  sequence as rawSequence,
} from "../src/parser-lib.ts";
import { OutputError } from "../src/output.ts";
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
      match(/[^\\():;#]/, "word").map(([character]) => character),
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
function conjugate(verb: string): {
  presentSingular: string;
  presentPlural: string;
  past: string;
  condensed: string;
} {
  const conjugations = nlp(`I ${verb}`).verbs().conjugate()[0] as undefined | {
    Infinitive: string;
    PastTense: string;
    PresentTense: string;
    Gerund: string;
    FutureTense: string;
  };
  if (conjugations == null) {
    throw new OutputError(`no verb conjugation found for ${verb}`);
  }
  const presentSingular = conjugations.Infinitive;
  const past = conjugations.PastTense;
  const [first, ...rest] = presentSingular.split(" ");
  return {
    presentSingular,
    presentPlural: conjugations.PresentTense,
    past,
    condensed: [condense(first, past.split(" ")[0]), ...rest]
      .join(" "),
  };
}
function noun(): TextParser<Noun> {
  return sequence(all(determiner()), all(adjective()), specificUnit("noun"))
    .map(([determiner, adjective, noun]) => {
      let singular: null | string = null;
      let plural: null | string = null;
      let condensed: string;
      switch (noun.tag.number) {
        case null:
          singular = nlp(`${noun.word} is good`).nouns().toSingular().text();
          plural = nlp(`${noun.word} is good`).nouns().toPlural().text();
          if (singular === "" || plural === "") {
            throw new OutputError(
              `no singular or plural form found for ${noun.word}`,
            );
          }
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
    // TODO: improve this
    specificUnit("filler").map((unit) =>
      ({
        type: "filler",
        before: unit.word[0],
        repeat: unit.word[1],
        after: "",
      }) as Definition
    ),
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
    specificUnit("personal pronoun").map((unit) => {
      const forms = unit.word.split("/").map((form) => form.trim());
      const number = unit.tag.number;
      switch (number) {
        case null:
          if (forms.length !== 4) {
            throw new UnrecognizedError(
              `personal pronoun with ${forms.length} forms`,
            );
          }
          return {
            type: "personal pronoun",
            singular: {
              subject: forms[0],
              object: forms[1],
            },
            plural: {
              subject: forms[2],
              object: forms[3],
            },
            condensed: {
              subject: condense(forms[0], forms[2]),
              object: condense(forms[1], forms[3]),
            },
          } as Definition;
        case "singular":
        case "plural": {
          if (forms.length !== 2) {
            throw new UnrecognizedError(
              `${number} personal pronoun with ${forms.length} forms`,
            );
          }
          const pronoun = {
            subject: forms[0],
            object: forms[1],
          };
          return {
            type: "personal pronoun",
            singular: null,
            plural: null,
            [number]: pronoun,
            condensed: pronoun,
          } as Definition;
        }
      }
    }),
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
    specificUnit("verb")
      .filter((unit) => unit.tag.kind != null)
      .map((unit) =>
        ({
          type: "verb",
          ...conjugate(unit.word),
          directObject: null,
          indirectObject: [],
          forObject: unit.tag.kind === "transitive",
        }) as Definition
      ),
    sequence(
      specificUnit("verb").filter((unit) => unit.tag.kind == null),
      noun(),
    )
      .map(([verb, directObject]) =>
        ({
          type: "verb",
          ...conjugate(verb.word),
          directObject,
          indirectObject: [],
          forObject: false,
        }) as Definition
      ),
    sequence(
      specificUnit("verb").filter((unit) => unit.tag.kind == null),
      specificUnit("preposition"),
      noun(),
    )
      .map(([verb, preposition, object]) =>
        ({
          type: "verb",
          ...conjugate(verb.word),
          directObject: null,
          indirectObject: [{
            preposition: preposition.word,
            object,
          }],
          forObject: false,
        }) as Definition
      ),
    sequence(
      specificUnit("verb").filter((unit) => unit.tag.kind == null),
      specificUnit("preposition"),
    )
      .map(([verb, preposition]) =>
        ({
          type: "verb",
          ...conjugate(verb.word),
          directObject: null,
          indirectObject: [],
          forObject: preposition.word,
        }) as Definition
      ),
    sequence(
      specificUnit("verb").filter((unit) => unit.tag.kind == null),
      noun(),
      specificUnit("preposition"),
    )
      .map(([verb, directObject, preposition]) =>
        ({
          type: "verb",
          ...conjugate(verb.word),
          directObject,
          indirectObject: [],
          forObject: preposition.word,
        }) as Definition
      ),
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
const dictionary = space()
  .with(all(sequence(head(), all(definition()))))
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
const insideDefinitionParser = space().with(insideDefinition()).skip(eol(";"));

export async function build(): Promise<boolean> {
  const sourceText = await Deno.readTextFile(SOURCE);
  const output = dictionary.parse(sourceText);
  if (output.isError()) {
    const rawTexts = all(
      optionalAll(head())
        .with(
          lex(match(/([^;]*);/, "definition"))
            .map(([_, definition]) => definition),
        ),
    )
      .skip(eol("EOL"))
      .parse(sourceText);
    for (const text of rawTexts.output[0]) {
      const output = insideDefinitionParser.parse(text);
      for (const error of output.errors) {
        console.error(error.message);
      }
    }
    return false;
  } else {
    const dictionary = JSON.stringify(output.output[0]);
    await Deno.writeTextFile(
      DESTINATION,
      `import{Dictionary}from"./type.ts";export const DICTIONARY:Dictionary=${dictionary}`,
    );
    return true;
  }
}
await build();
