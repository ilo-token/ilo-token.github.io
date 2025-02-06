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
  VerbOnly,
} from "./type.ts";
import {
  all,
  choiceOnlyOne,
  eol,
  match,
  matchCapture,
  matchString,
  optionalAll,
  Parser,
  sequence,
  withSource,
} from "../src/parser-lib.ts";
import { Output, OutputError } from "../src/output.ts";
import { UnrecognizedError } from "../src/error.ts";
import { escapeHtml, nullableAsArray, repeat } from "../src/misc.ts";

function comment(): Parser<string> {
  return match(/#[^\r\n]*/, "comment");
}
function space(): Parser<null> {
  return all(
    choiceOnlyOne(match(/\s/, "space"), comment()),
  )
    .map(() => null);
}
function lex<T>(parser: Parser<T>): Parser<T> {
  return parser.skip(space());
}
function word(): Parser<string> {
  return all(
    choiceOnlyOne(
      match(/[^():;#/`]/, "word"),
      matchCapture(/`([^`])`/u, "quoted character").map(([_, words]) => words),
      comment().map(() => ""),
    ),
  )
    .map((word) => word.join("").replaceAll(/\s+/g, " ").trim())
    .filter((word) => word.length > 0)
    .map(escapeHtml);
}
function slash(): Parser<string> {
  return lex(matchString("/", "slash"));
}
function forms(): Parser<Array<string>> {
  return sequence(word(), all(slash().with(word())))
    .map(([first, rest]) => [first, ...rest]);
}
function keyword<T extends string>(keyword: T): Parser<T> {
  return lex(match(/[a-z]+/, keyword))
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
        test === `${before}${repeat(repeatString, i + 2)}${after}`
      );
    if (passed) {
      return { before, repeat: repeatString, after };
    }
  }
  throw new OutputError(
    `${source.join("/")} has no repetition pattern found`,
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
                `no singular or plural form found for ${first}`,
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
              "number inside tag may not be provided when two forms of noun " +
                "are already provided",
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
        .skip(tag(sequence(keyword("n"), keyword("proper")))),
    ),
  )
    .map(([determiner, adjective, noun, post]) => {
      let postAdjective: null | { adjective: string; name: string };
      if (post == null) {
        postAdjective = null;
      } else {
        const [adjective, name] = post;
        postAdjective = { adjective, name };
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
      .map(() => "physical quality"),
    keyword("age"),
    keyword("color"),
    keyword("origin"),
    keyword("material"),
    keyword("qualifier"),
  );
}
function verbOnly(tagInside: Parser<unknown>): Parser<VerbOnly> {
  return choiceOnlyOne(
    sequence(
      word().skip(slash()),
      word().skip(slash()),
      word().skip(tag(tagInside)),
    )
      .filter(([presentPlural, presentSingular, past]) => {
        const [_, ...pluralParticles] = presentPlural.split(" ");
        const [_1, ...singularParticles] = presentSingular.split(" ");
        const [_2, ...pastParticles] = past.split(" ");
        if (
          pluralParticles.length !== singularParticles.length ||
          pluralParticles.length !== pastParticles.length ||
          pluralParticles.some((particle, i) =>
            particle !== singularParticles[i] || particle !== pastParticles[i]
          )
        ) {
          throw new UnrecognizedError(
            `mismatched verb particles ${presentPlural}/${presentSingular}/${past}`,
          );
        }
        return true;
      })
      .map(([presentPlural, presentSingular, past]) => ({
        presentPlural,
        presentSingular,
        past,
      })),
    word()
      .skip(tag(tagInside))
      .map((verb) => {
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
          throw new OutputError(`no verb conjugation found for ${verb}`);
        }
        return {
          presentPlural: conjugations.Infinitive,
          presentSingular: conjugations.PresentTense,
          past: conjugations.PastTense,
        };
      }),
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
function semicolon(): Parser<string> {
  return lex(matchString(";", "semicolon"));
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
      verbOnly(keyword("v")),
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
          ...verb,
          directObject: null,
          indirectObject,
          forObject: forObject != null,
          predicateType: null,
        }) as Definition
      ),
    sequence(
      verbOnly(keyword("v")),
      optionalAll(noun()),
      optionalAll(simpleUnit("prep").skip(template(keyword("object")))),
    )
      .skip(semicolon())
      .map(([verb, directObject, preposition]) =>
        ({
          type: "verb",
          ...verb,
          directObject,
          indirectObject: [],
          forObject: preposition ?? false,
          predicateType: null,
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
    verbOnly(keyword("v"))
      .skip(template(keyword("predicate")))
      .skip(semicolon())
      .map((verb) =>
        ({
          type: "verb",
          ...verb,
          directObject: null,
          indirectObject: [],
          forObject: false,
          predicateType: "verb",
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
      word().skip(slash()),
      word().skip(slash()),
      word().skip(slash()),
      word(),
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
      word().skip(slash()),
      word(),
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
      .skip(tag(sequence(keyword("v"), keyword("modal"))))
      .skip(template(keyword("predicate")))
      .skip(semicolon()).map((verb) =>
        ({
          type: "modal verb",
          verb,
        }) as Definition
      ),
    verbOnly(sequence(keyword("v"), keyword("linking")))
      .skip(template(keyword("predicate")))
      .skip(semicolon()).map((verb) =>
        ({
          type: "verb",
          ...verb,
          directObject: null,
          indirectObject: [],
          forObject: false,
          predicateType: "noun adjective",
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
  return lex(match(/[a-z][a-zA-Z]*/, "word"));
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
const DICTIONARY = space()
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
const DEFINITION_EXTRACT = space()
  .with(all(optionalAll(head()).with(lex(match(/[^;]*;/, "definition")))))
  .skip(eol());
const DEFINITION = space().with(definition()).skip(eol());

export function parseDictionary(sourceText: string): Dictionary {
  const output = DICTIONARY.parse(sourceText);
  if (!output.isError()) {
    return output.output[0];
  } else {
    const definitions = DEFINITION_EXTRACT.parse(sourceText);
    let errors: Output<never>;
    if (!definitions.isError()) {
      errors = Output.newErrors(
        definitions.output[0]
          .flatMap((definition) =>
            DEFINITION.parse(definition).errors.map((error) =>
              new OutputError(`${error.message} at ${definition.trim()}`)
            )
          ),
      );
    } else {
      errors = Output.newErrors(output.errors);
    }
    throw new AggregateError(errors.deduplicateErrors().errors);
  }
}
