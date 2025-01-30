import nlp from "compromise/three";
import {
  Adjective,
  AdjectiveType,
  Definition,
  Determiner,
  DeterminerType,
  Dictionary,
  Entry,
  Noun,
} from "./type.ts";
import {
  all,
  choiceOnlyOne,
  eol,
  match,
  matchString,
  optionalAll,
  Parser,
  sequence,
  withSource,
} from "../src/parser-lib.ts";
import { Output, OutputError } from "../src/output.ts";
import { UnrecognizedError } from "../src/error.ts";
import { escapeHtml, fs, join, nullableAsArray, repeat } from "../src/misc.ts";

function space(): Parser<null> {
  return all(
    choiceOnlyOne(match(/\s/, "space"), match(/#[^\n]*/, "comment")),
  )
    .map((_) => null);
}
function lex<T>(parser: Parser<T>): Parser<T> {
  return parser.skip(space());
}
function word(): Parser<string> {
  return all(
    choiceOnlyOne(
      match(/[^():;#/`]/, "word").map(([character]) => character),
      match(/`([^`]*)`/, "quoted words").map(([_, words]) => words),
      match(/#[^\n]*/, "comment").map((_) => ""),
    ),
  )
    .map((word) => join(word).replaceAll(/\s+/g, " ").trim())
    .filter((word) => word.length > 0)
    .map(escapeHtml);
}
function slash(): Parser<null> {
  return lex(matchString("/", "slash")).map((_) => null);
}
function forms(): Parser<Array<string>> {
  return sequence(word(), all(slash().with(word())))
    .map(([first, rest]) => [first, ...rest]);
}
function keyword<T extends string>(keyword: T): Parser<T> {
  return lex(match(/[a-z]+/, keyword))
    .map(([keyword]) => keyword)
    .filter((that) => that === keyword) as Parser<T>;
}
function number(): Parser<"singular" | "plural"> {
  return choiceOnlyOne(keyword("singular"), keyword("plural"));
}
function optionalNumber(): Parser<null | "singular" | "plural"> {
  return optionalAll(number());
}
function tag<T>(parser: Parser<T>): Parser<T> {
  return lex(matchString("(", "open parenthesis"))
    .with(parser)
    .skip(lex(matchString(")", "close parenthesis")));
}
function template<T>(parser: Parser<T>): Parser<T> {
  return lex(matchString("[", "open square bracket"))
    .with(parser)
    .skip(lex(matchString("]", "close square bracket")));
}
function simpleUnit(kind: string): Parser<string> {
  return word().skip(tag(keyword(kind)));
}
function conjugate(verb: string): {
  presentSingular: string;
  presentPlural: string;
  past: string;
} {
  const sentence = nlp(verb);
  sentence.tag("Verb");
  const conjugations = sentence.verbs().conjugate()[0] as undefined | {
    Infinitive: string;
    PastTense: string;
    PresentTense: string;
    Gerund: string;
    FutureTense: string;
  };
  if (conjugations == null) {
    throw new OutputError(fs`no verb conjugation found for ${verb}`);
  }
  return {
    presentSingular: conjugations.PresentTense,
    presentPlural: conjugations.Infinitive,
    past: conjugations.PastTense,
  };
}
function detectRepetition(
  source: Array<string>,
): { before: string; repeat: string; after: string } {
  if (source.length === 1) {
    return { before: source[0], repeat: "", after: "" };
  }
  const [first, ...rest] = source;
  if (first.length <= 0) {
    throw new UnrecognizedError('no word before "/"');
  }
  for (let i = 0; i < first.length; i++) {
    const before = first.slice(0, i);
    const repeatString = first.slice(i, i + 1);
    const after = first.slice(i + 1);
    const passed = [...rest.entries()]
      .every(([i, test]) =>
        test === fs`${before}${repeat(repeatString, i + 2)}${after}`
      );
    if (passed) {
      return { before, repeat: repeatString, after };
    }
  }
  throw new OutputError(
    fs`${join(source, "/")} has no repetition pattern found`,
  );
}
function nounOnly(): Parser<
  { singular: null | string; plural: null | string; gerund: boolean }
> {
  return sequence(
    word(),
    optionalAll(slash().with(word())),
    tag(
      keyword("n")
        .with(sequence(optionalAll(keyword("gerund")), optionalNumber())),
    ),
  )
    .map(([first, second, [gerund, number]]) => {
      let singular: null | string = null;
      let plural: null | string = null;
      switch (number) {
        case null: {
          if (second == null) {
            const sentence = nlp(first);
            sentence.tag("Noun");
            singular = sentence
              .nouns()
              .toSingular()
              .text();
            plural = sentence
              .nouns()
              .toPlural()
              .text();
            if (singular === "" || plural === "") {
              throw new OutputError(
                fs`no singular or plural form found for ${first}`,
              );
            }
          } else {
            singular = first;
            plural = second;
          }
          break;
        }
        case "singular":
        case "plural":
          if (second != null) {
            throw new OutputError(
              "number inside tag may not be provided when two forms of noun are already provided",
            );
          }
          switch (number) {
            case "singular":
              singular = first;
              break;
            case "plural":
              plural = first;
              break;
          }
          break;
      }
      return { singular, plural, gerund: gerund != null };
    });
}
function noun(): Parser<Noun> {
  return sequence(
    all(determiner()),
    all(adjective()),
    nounOnly(),
    optionalAll(
      sequence(simpleUnit("adj"), word())
        .skip(tag(sequence(keyword("proper"), keyword("n")))),
    ),
  )
    .map(([determiner, adjective, noun, post]) => {
      let postAdjective: null | { adjective: string; name: string };
      if (post == null) {
        postAdjective = null;
      } else {
        postAdjective = { adjective: post[0], name: post[1] };
      }
      return {
        determiner,
        adjective,
        ...noun,
        postAdjective,
      };
    });
}
function determinerType(): Parser<DeterminerType> {
  return choiceOnlyOne(
    keyword("article"),
    keyword("demonstrative"),
    keyword("distributive"),
    keyword("interrogative"),
    keyword("possessive"),
    keyword("quantifier"),
    keyword("negative"),
    keyword("numeral"),
  );
}
function adjectiveKind(): Parser<AdjectiveType> {
  return choiceOnlyOne(
    keyword("opinion"),
    keyword("size"),
    sequence(keyword("physical"), keyword("quality"))
      .map((_) => "physical quality"),
    keyword("age"),
    keyword("color"),
    keyword("origin"),
    keyword("material"),
    keyword("qualifier"),
  );
}
function determiner(): Parser<Determiner> {
  return sequence(
    word(),
    optionalAll(slash().with(word())),
    tag(keyword("d").with(sequence(determinerType(), optionalNumber()))),
  )
    .map(([determiner, plural, [kind, number]]) => ({
      determiner,
      plural,
      kind,
      number: number ?? "both",
    }));
}
function adjective(): Parser<Adjective> {
  return sequence(
    all(simpleUnit("adv")),
    word(),
    tag(keyword("adj").with(adjectiveKind())),
  )
    .map(([adverb, adjective, kind]) => ({ adverb, adjective, kind }));
}
function semicolon(): Parser<null> {
  return lex(matchString(";", "semicolon")).map((_) => null);
}
function definition(): Parser<Definition> {
  return choiceOnlyOne(
    adjective()
      .skip(semicolon())
      .map((adjective) => ({ type: "adjective", ...adjective }) as Definition),
    sequence(
      adjective(),
      simpleUnit("c").filter((word) => word === "and").with(adjective()),
    )
      .filter(([first, second]) =>
        first.adverb.length === 0 && second.adverb.length === 0
      )
      .skip(semicolon())
      .map((adjective) =>
        ({ type: "compound adjective", adjective }) as Definition
      ),
    noun()
      .skip(semicolon())
      .map((noun) => ({ type: "noun", ...noun }) as Definition),
    sequence(
      simpleUnit("v"),
      optionalAll(template(keyword("object"))),
      optionalAll(
        sequence(simpleUnit("prep"), noun())
          .map(([preposition, object]) => ({ preposition, object })),
      )
        .map(nullableAsArray),
    )
      .skip(semicolon())
      .map(([verb, forObject, indirectObject]) =>
        ({
          type: "verb",
          ...conjugate(verb),
          directObject: null,
          indirectObject,
          forObject: forObject != null,
        }) as Definition
      ),
    sequence(
      simpleUnit("v"),
      optionalAll(noun()),
      optionalAll(simpleUnit("prep").skip(template(keyword("object")))),
    )
      .skip(semicolon())
      .map(([verb, directObject, preposition]) =>
        ({
          type: "verb",
          ...conjugate(verb),
          directObject,
          indirectObject: [],
          forObject: preposition ?? false,
        }) as Definition
      ),
    simpleUnit("i")
      .skip(semicolon())
      .map((preposition) =>
        ({ type: "interjection", interjection: preposition }) as Definition
      ),
    word().skip(tag(sequence(keyword("particle"), keyword("def"))))
      .skip(semicolon())
      .map((definition) =>
        ({ type: "particle definition", definition }) as Definition
      ),
    simpleUnit("adv")
      .skip(semicolon())
      .map((adverb) => ({ type: "adverb", adverb }) as Definition),
    determiner()
      .skip(semicolon())
      .map((determiner) =>
        ({ type: "determiner", ...determiner }) as Definition
      ),
    simpleUnit("prep")
      .skip(template(sequence(keyword("indirect"), keyword("object"))))
      .skip(semicolon())
      .map((preposition) =>
        ({ type: "preposition", preposition }) as Definition
      ),
    simpleUnit("num")
      .skip(semicolon())
      .map((unit) => {
        const numeral = Number.parseInt(unit);
        if (Number.isNaN(numeral)) {
          throw new UnrecognizedError("non-number on numeral");
        } else {
          return { type: "numeral", numeral } as Definition;
        }
      }),
    sequence(simpleUnit("v"), optionalAll(simpleUnit("particle")))
      .skip(template(sequence(keyword("predicate"), keyword("v"))))
      .skip(semicolon())
      .map(([verb, particle]) =>
        ({
          type: "preverb as finite verb",
          ...conjugate(verb),
          particle,
        }) as Definition
      ),
    sequence(noun(), simpleUnit("prep"))
      .skip(template(keyword("headword")))
      .skip(semicolon())
      .map(([noun, preposition]) =>
        ({
          type: "noun preposition",
          noun,
          preposition,
        }) as Definition
      ),
    sequence(
      word(),
      slash().with(word()),
      slash().with(word()),
      slash().with(word()),
    )
      .skip(tag(sequence(keyword("personal"), keyword("pronoun"))))
      .skip(semicolon())
      .map(([singularSubject, singularObject, pluralSubject, pluralObject]) =>
        ({
          type: "personal pronoun",
          singular: { subject: singularSubject, object: singularObject },
          plural: { subject: pluralSubject, object: pluralObject },
        }) as Definition
      ),
    sequence(
      word(),
      slash().with(word()),
      tag(keyword("personal").with(keyword("pronoun")).with(number())),
    )
      .skip(semicolon())
      .map(([subject, object, number]) =>
        ({
          type: "personal pronoun",
          singular: null,
          plural: null,
          [number]: { subject, object },
        }) as Definition
      ),
    word()
      .skip(tag(sequence(keyword("modal"), keyword("v"))))
      .skip(template(keyword("predicate")))
      .skip(semicolon()).map((verb) =>
        ({
          type: "preverb as modal verb",
          verb,
        }) as Definition
      ),
    word()
      .skip(tag(sequence(keyword("linking"), keyword("v"))))
      .skip(template(keyword("predicate")))
      .skip(semicolon()).map((linkingVerb) =>
        ({
          type: "preverb as linking verb",
          ...conjugate(linkingVerb),
        }) as Definition
      ),
    forms().skip(tag(keyword("f")))
      .skip(semicolon())
      .map((unit) =>
        ({
          type: "filler",
          ...detectRepetition(unit),
        }) as Definition
      ),
  );
}
function singleWord(): Parser<string> {
  return lex(match(/[a-z][a-zA-Z]*/, "word")).map(([word]) => word);
}
function head(): Parser<Array<string>> {
  return sequence(
    all(singleWord().skip(lex(matchString(",", "comma")))),
    singleWord(),
  )
    .skip(lex(matchString(":", "colon")))
    .map(([init, last]) => [...init, last]);
}
function entry(): Parser<Entry> {
  return withSource(all(definition()))
    .map(([definitions, src]) => ({ definitions, src }));
}
const dictionary = space()
  .with(all(sequence(head(), entry())))
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
const rawTextParser = space()
  .with(all(
    optionalAll(head())
      .with(
        lex(match(/[^;]*;/, "definition"))
          .map(([definition]) => definition),
      ),
  ))
  .skip(eol());
const insideDefinitionParser = space().with(definition()).skip(eol());

export function parseDictionary(sourceText: string): Output<Dictionary> {
  const output = dictionary.parse(sourceText);
  if (!output.isError()) {
    return output;
  } else {
    const definitions = rawTextParser.parse(sourceText);
    if (!definitions.isError()) {
      return Output.newErrors(
        definitions.output[0]
          .flatMap((definition) =>
            insideDefinitionParser.parse(definition).errors.map((error) =>
              new OutputError(fs`${error.message} at ${definition.trim()}`)
            )
          ),
      );
    } else {
      return Output.newErrors(output.errors);
    }
  }
}
