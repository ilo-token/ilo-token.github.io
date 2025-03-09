import { escape as escapeHtml } from "@std/html/entities";
import { escape as escapeRegex } from "@std/regexp/escape";
import nlp from "compromise/three";
import { ArrayResultError } from "../src/array_result.ts";
import {
  deduplicateErrors,
  mapNullable,
  nullableAsArray,
  throwError,
} from "../src/misc.ts";
import {
  all,
  allAtLeastOnce,
  character,
  choiceOnlyOne,
  end,
  match,
  matchString,
  optionalAll,
  Parser,
  sequence,
  sourceOnly,
  UnexpectedError,
  withSource,
} from "../src/parser/parser_lib.ts";
import {
  Definition,
  Determiner,
  Dictionary,
  Noun,
  NounForms,
  VerbForms,
} from "./type.ts";
import { Cache } from "../src/cache.ts";
import { memoize } from "@std/cache/memoize";

const RESERVED_SYMBOLS = "#()*+/:;<=>@[\\]^`{|}~";
const WORDS = new RegExp(`[^${escapeRegex(RESERVED_SYMBOLS)}]`);

const comment = match(/#[^\n\r]*/, "comment");
const spaces = sourceOnly(all(choiceOnlyOne(match(/\s/, "space"), comment)));
const tokiPonaWord = match(/[a-z][a-zA-Z]*/, "word");
const backtick = matchString("`", "backtick");
const openParenthesis = matchString("(", "open parenthesis");
const closeParenthesis = matchString(")", "close parenthesis");
const openBracket = matchString("[", "open bracket");
const closeBracket = matchString("]", "close bracket");
const comma = matchString(",", "comma");
const colon = matchString(":", "colon");
const semicolon = lex(matchString(";", "semicolon"));

function lex<T>(parser: Parser<T>): Parser<T> {
  return parser.skip(spaces);
}
const unescapedWord = allAtLeastOnce(
  choiceOnlyOne(
    match(WORDS, "word"),
    backtick
      .with(character)
      .skip(backtick),
    comment.map(() => ""),
  ),
)
  .map((word) => word.join("").replaceAll(/\s+/g, " ").trim())
  .filter((word) =>
    word !== "" || throwError(new ArrayResultError("missing word"))
  );
const word = unescapedWord.map(escapeHtml);
const slash = lex(matchString("/", "slash"));
const forms = sequence(word, all(slash.with(word)))
  .map(([first, rest]) => [first, ...rest]);

const keyword = memoize(<T extends string>(keyword: T): Parser<T> =>
  lex(match(/[a-z\-]+/, keyword))
    .filter((that) =>
      keyword === that ||
      throwError(new UnexpectedError(`"${that}"`, `"${keyword}"`))
    ) as Parser<T>
);
const number = choiceOnlyOne(keyword("singular"), keyword("plural"));
const optionalNumber = optionalAll(number);
const perspective = choiceOnlyOne(
  keyword("first"),
  keyword("second"),
  keyword("third"),
);
function tag<T>(parser: Parser<T>): Parser<T> {
  return lex(openParenthesis)
    .with(parser)
    .skip(lex(closeParenthesis));
}
function template<T>(parser: Parser<T>): Parser<T> {
  return lex(openBracket).with(parser).skip(lex(closeBracket));
}
const simpleUnit = memoize((kind: string) => word.skip(tag(keyword(kind))));
function detectRepetition(
  source: ReadonlyArray<string>,
): { before: string; repeat: string; after: string } {
  if (source.length === 1) {
    return { before: source[0], repeat: "", after: "" };
  }
  const [first, ...rest] = source;
  for (let i = 0; i < first.length; i++) {
    const before = first.slice(0, i);
    const repeatString = first.slice(i, i + 1);
    const after = first.slice(i + 1);
    const passed = [...rest.entries()]
      .every(([i, test]) =>
        test === `${before}${repeatString.repeat(i + 2)}${after}`
      );
    if (passed) {
      return { before, repeat: repeatString, after };
    }
  }
  throw new ArrayResultError(
    `"${source.join("/")}" has no repetition pattern found`,
  );
}
const nounOnly = choiceOnlyOne(
  sequence(
    unescapedWord,
    tag(
      keyword("n")
        .with(optionalAll(keyword("gerund"))),
    ),
  )
    .map<NounForms & { gerund: boolean }>(
      ([noun, gerund]) => {
        const sentence = nlp(noun);
        sentence.tag("Noun");
        const singular = sentence
          .nouns()
          .toSingular()
          .text();
        const plural = sentence
          .nouns()
          .toPlural()
          .text();
        if (singular === "" || plural === "") {
          throw new ArrayResultError(
            `no singular or plural form found for "${noun}". consider ` +
              "providing both singular and plural forms instead",
          );
        }
        if (noun !== singular) {
          throw new ArrayResultError(
            `conjugation error: "${noun}" is not "${singular}". ` +
              "consider providing both singular and plural forms instead",
          );
        }
        return {
          singular: escapeHtml(singular),
          plural: escapeHtml(plural),
          gerund: gerund != null,
        };
      },
    ),
  sequence(
    word,
    tag(
      keyword("n")
        .with(sequence(optionalAll(keyword("gerund")), number)),
    ),
  )
    .map<NounForms & { gerund: boolean }>(
      ([noun, [gerund, number]]) => {
        let singular: null | string;
        let plural: null | string;
        switch (number) {
          case "singular":
          case "plural":
            switch (number) {
              case "singular":
                singular = noun;
                plural = null;
                break;
              case "plural":
                singular = null;
                plural = noun;
                break;
            }
            break;
        }
        return { singular, plural, gerund: gerund != null };
      },
    ),
  sequence(
    word,
    optionalAll(slash.with(word)),
    tag(
      keyword("n")
        .with(optionalAll(keyword("gerund"))),
    ),
  )
    .map<NounForms & { gerund: boolean }>(
      ([singular, plural, gerund]) => ({
        singular,
        plural,
        gerund: gerund != null,
      }),
    ),
);
const determinerType = choiceOnlyOne(
  keyword("article"),
  keyword("demonstrative"),
  keyword("distributive"),
  keyword("interrogative"),
  keyword("possessive"),
  keyword("quantifier"),
  keyword("negative"),
  keyword("numeral"),
);
const determiner = sequence(
  word,
  optionalAll(slash.with(word)),
  tag(keyword("d").with(sequence(determinerType, optionalNumber))),
)
  .map<Determiner>(([determiner, plural, [kind, quantity]]) => ({
    determiner,
    plural,
    kind,
    quantity: quantity ?? "both",
  }));
const adjectiveKind = choiceOnlyOne(
  keyword("opinion"),
  keyword("size"),
  sequence(keyword("physical"), keyword("quality"))
    .map<"physical quality">(() => "physical quality"),
  keyword("age"),
  keyword("color"),
  keyword("origin"),
  keyword("material"),
  keyword("qualifier"),
);
const adjective = sequence(
  all(simpleUnit("adv")),
  word,
  tag(
    keyword("adj").with(
      sequence(adjectiveKind, optionalAll(keyword("gerund-like"))),
    ),
  ),
)
  .map(([adverb, adjective, [kind, gerundLike]]) => ({
    adverb,
    adjective,
    kind,
    gerundLike: gerundLike != null,
  }));
const noun = sequence(
  all(determiner),
  all(adjective),
  nounOnly,
  optionalAll(
    sequence(simpleUnit("adj"), word)
      .skip(tag(sequence(keyword("n"), keyword("proper")))),
  ),
)
  .map<Noun>(([determiner, adjective, noun, post]) => {
    return {
      ...noun,
      determiner,
      adjective,
      postAdjective: mapNullable(
        post,
        ([adjective, name]) => ({ adjective, name }),
      ),
    };
  });
function verbOnly(tagInside: Parser<unknown>): Parser<VerbForms> {
  return choiceOnlyOne(
    sequence(
      word.skip(slash),
      word.skip(slash),
      word,
    )
      .skip(tag(tagInside))
      .filter(([presentPlural, presentSingular, past]) => {
        const [_, ...pluralParticles] = presentPlural.split(" ");
        const [_1, ...singularParticles] = presentSingular.split(" ");
        const [_2, ...pastParticles] = past.split(" ");
        const allMatched =
          pluralParticles.length === singularParticles.length &&
          pluralParticles.length === pastParticles.length &&
          pluralParticles.every((particle, i) =>
            particle === singularParticles[i] && particle === pastParticles[i]
          );
        if (allMatched) {
          return true;
        } else {
          throw new ArrayResultError(
            "mismatched verb particles " +
              `"${presentPlural}/${presentSingular}/${past}"`,
          );
        }
      })
      .map(([presentPlural, presentSingular, past]) => ({
        presentPlural,
        presentSingular,
        past,
      })),
    unescapedWord
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
          throw new ArrayResultError(
            `no verb conjugation found for "${verb}". consider providing all ` +
              "conjugations instead",
          );
        }
        if (verb !== conjugations.Infinitive) {
          throw new ArrayResultError(
            `conjugation error: "${verb}" is not ` +
              `"${conjugations.Infinitive}". consider providing all ` +
              "conjugations instead",
          );
        }
        return {
          presentPlural: escapeHtml(conjugations.Infinitive),
          presentSingular: escapeHtml(conjugations.PresentTense),
          past: escapeHtml(conjugations.PastTense),
        };
      }),
  );
}
const definition = choiceOnlyOne<Definition>(
  adjective
    .skip(semicolon)
    .map((adjective) => ({ ...adjective, type: "adjective" })),
  sequence(
    adjective.skip(keyword("and")).skip(tag(keyword("c"))),
    adjective,
  )
    .filter(([first, second]) => {
      if (first.adverb.length === 0 && second.adverb.length === 0) {
        return true;
      } else {
        throw new ArrayResultError("compound adjective cannot have adverb");
      }
    })
    .skip(semicolon)
    .map((adjective) => ({ type: "compound adjective", adjective })),
  noun
    .skip(semicolon)
    .map((noun) => ({ ...noun, type: "noun" })),
  sequence(
    verbOnly(keyword("v")),
    optionalAll(template(keyword("object"))),
    optionalAll(
      sequence(simpleUnit("prep"), noun)
        .map(([preposition, object]) => ({ preposition, object })),
    )
      .map(nullableAsArray),
  )
    .skip(semicolon)
    .map(([verb, forObject, indirectObject]) => ({
      ...verb,
      type: "verb",
      directObject: null,
      indirectObject,
      forObject: forObject != null,
      predicateType: null,
    })),
  sequence(
    verbOnly(keyword("v")),
    optionalAll(noun),
    optionalAll(simpleUnit("prep").skip(template(keyword("object")))),
  )
    .skip(semicolon)
    .map(([verb, directObject, preposition]) => ({
      ...verb,
      type: "verb",
      directObject,
      indirectObject: [],
      forObject: preposition ?? false,
      predicateType: null,
    })),
  simpleUnit("i")
    .skip(semicolon)
    .map((preposition) => ({
      type: "interjection",
      interjection: preposition,
    })),
  word.skip(tag(sequence(keyword("particle"), keyword("def"))))
    .skip(semicolon)
    .map((definition) => ({ type: "particle definition", definition })),
  simpleUnit("adv")
    .skip(semicolon)
    .map((adverb) => ({ type: "adverb", adverb })),
  determiner
    .skip(semicolon)
    .map((determiner) => ({ ...determiner, type: "determiner" })),
  simpleUnit("prep")
    .skip(template(sequence(keyword("indirect"), keyword("object"))))
    .skip(semicolon)
    .map((preposition) => ({ type: "preposition", preposition })),
  simpleUnit("num")
    .skip(semicolon)
    .map((unit) => {
      const numeral = Number.parseInt(unit);
      if (Number.isNaN(numeral)) {
        throw new ArrayResultError(`"${unit}" is not a number`);
      } else {
        return { type: "numeral", numeral };
      }
    }),
  verbOnly(keyword("v"))
    .skip(template(keyword("predicate")))
    .skip(semicolon)
    .map((verb) => ({
      ...verb,
      type: "verb",
      directObject: null,
      indirectObject: [],
      forObject: false,
      predicateType: "verb",
    })),
  sequence(noun, simpleUnit("prep"))
    .skip(template(keyword("headword")))
    .skip(semicolon)
    .map(([noun, preposition]) => ({
      type: "noun preposition",
      noun,
      preposition,
    })),
  sequence(
    word.skip(slash),
    word.skip(slash),
    word.skip(slash),
    word,
    tag(
      keyword("personal")
        .with(keyword("pronoun"))
        .with(perspective),
    ),
  )
    .skip(semicolon)
    .map((
      [
        singularSubject,
        singularObject,
        pluralSubject,
        pluralObject,
        perspective,
      ],
    ) => ({
      type: "personal pronoun",
      singular: { subject: singularSubject, object: singularObject },
      plural: { subject: pluralSubject, object: pluralObject },
      perspective,
    })),
  sequence(
    word.skip(slash),
    word,
    tag(
      keyword("personal").with(keyword("pronoun")).with(
        sequence(perspective, number),
      ),
    ),
  )
    .skip(semicolon)
    .map(([subject, object, [perspective, number]]) => ({
      type: "personal pronoun",
      singular: null,
      plural: null,
      [number]: { subject, object },
      perspective,
    })),
  word
    .skip(tag(sequence(keyword("v"), keyword("modal"))))
    .skip(template(keyword("predicate")))
    .skip(semicolon).map((verb) => ({
      type: "modal verb",
      verb,
    })),
  verbOnly(sequence(keyword("v"), keyword("linking")))
    .skip(template(keyword("predicate")))
    .skip(semicolon).map((verb) => ({
      ...verb,
      type: "verb",
      directObject: null,
      indirectObject: [],
      forObject: false,
      predicateType: "noun adjective",
    })),
  forms.skip(tag(keyword("f")))
    .skip(semicolon)
    .map((unit) => ({
      ...detectRepetition(unit),
      type: "filler",
    })),
);
const singleWord = lex(tokiPonaWord);
const head = sequence(
  all(singleWord.skip(lex(comma))),
  singleWord,
)
  .skip(colon)
  .map(([init, last]) => [...init, last]);
const entry = withSource(spaces.with(all(definition)))
  .map(([definitions, src]) => ({ definitions, src: src.trimEnd() }));
const dictionaryParser = spaces
  .with(all(sequence(head, entry)))
  .skip(end)
  .map((entries) =>
    new Map(
      entries.flatMap(([words, definition]) =>
        words.map((word) => [word, definition])
      ),
    )
  )
  .parser();

const definitionExtractor = spaces
  .with(all(optionalAll(lex(head)).with(lex(match(/[^;]*;/, "definition")))))
  .skip(end)
  .parser();
const definitionParser = spaces.with(definition).skip(end).parser();

export function parseDictionary(sourceText: string): Dictionary {
  const arrayResult = dictionaryParser(sourceText);
  if (!arrayResult.isError()) {
    return arrayResult.array[0];
  } else {
    const definitions = definitionExtractor(sourceText);
    const errors = !definitions.isError()
      ? definitions.array[0].flatMap((definition) =>
        definitionParser(definition).errors.map((error) =>
          new ArrayResultError(
            `${error.message} at ${definition.trim()}`,
            { cause: error },
          )
        )
      )
      : arrayResult.errors;
    throw new AggregateError(deduplicateErrors(errors));
  }
}
