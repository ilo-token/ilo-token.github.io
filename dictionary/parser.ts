import { memoize } from "@std/cache/memoize";
import { escape as escapeHtml } from "@std/html/entities";
import { escape as escapeRegex } from "@std/regexp/escape";
import nlp from "compromise/three";
import { nullableAsArray, throwError } from "../misc/misc.ts";
import { ArrayResultError } from "../src/array_result.ts";
import {
  all,
  allAtLeastOnceWithCheck,
  allWithCheck,
  checkedAsWhole,
  CheckedParser,
  checkedSequence,
  choiceOnlyOne,
  choiceWithCheck,
  match,
  matchString,
  notEnd,
  nothing,
  optionalAll,
  optionalWithCheck,
  Parser,
  sequence,
  UnexpectedError,
  withSource,
} from "../src/parser/parser_lib.ts";
import { Definition, Dictionary, Noun, PartialVerb } from "./type.ts";

const RESERVED_SYMBOLS = "#()*+/:;<=>@[\\]^`{|}~";

function lex<T>(parser: Parser<T>): Parser<T> {
  return parser.skip(ignore);
}
const comment = checkedSequence(
  matchString("#", "hash sign"),
  match(/[^\n]*?(?=\r?\n)/, "comment content"),
)
  .map(() => null);
const spaces = checkedSequence(
  match(/\s/, "space"),
  match(/\s*/, "space"),
)
  .map(() => null);
const ignore = allWithCheck(
  new CheckedParser(
    choiceOnlyOne(comment.check, spaces.check),
    choiceWithCheck(spaces, comment),
  ),
)
  .map(() => null);
const backtick = matchString("`", "backtick");
const colon = matchString(":", "colon");
const character = match(/./u, "character");
const wordCharacter = match(
  new RegExp(`[^${escapeRegex(RESERVED_SYMBOLS)}]`),
  "word",
);
const tokiPonaWord = lex(match(/[a-z][a-zA-Z]*/, "word"));
const openParenthesis = lex(matchString("(", "open parenthesis"));
const closeParenthesis = lex(matchString(")", "close parenthesis"));
const openBracket = lex(matchString("[", "open bracket"));
const closeBracket = lex(matchString("]", "close bracket"));
const comma = lex(matchString(",", "comma"));
const semicolon = lex(matchString(";", "semicolon"));
const slash = lex(matchString("/", "slash"));

const keyword = memoize(<T extends string>(keyword: T) =>
  lex(match(/[a-z\-]+/, keyword))
    .filter((that) =>
      keyword === that ||
      throwError(new UnexpectedError(`"${that}"`, `"${keyword}"`))
    ) as Parser<T>
);
const unescapedWord = allAtLeastOnceWithCheck(
  new CheckedParser(
    choiceOnlyOne(wordCharacter, backtick),
    choiceWithCheck(
      checkedAsWhole(wordCharacter),
      checkedSequence(backtick, character.skip(backtick))
        .map(([_, character]) => character),
      comment.map(() => ""),
    ),
  ),
)
  .map((word) => word.join("").replaceAll(/\s+/g, " ").trim());
const word = unescapedWord.map(escapeHtml);
const number = choiceOnlyOne(keyword("singular"), keyword("plural"));
const optionalNumber = optionalAll(number);
const perspective = choiceOnlyOne(
  keyword("first"),
  keyword("second"),
  keyword("third"),
);
function tag<T>(parser: Parser<T>): Parser<T> {
  return openParenthesis.with(parser).skip(closeParenthesis);
}
function template<T>(parser: Parser<T>): Parser<T> {
  return openBracket.with(parser).skip(closeBracket);
}
const simpleUnit = memoize((kind: string) => word.skip(tag(keyword(kind))));

const nounOnly = checkedSequence(
  sequence(
    unescapedWord,
    optionalWithCheck(
      checkedSequence(slash, word).map(([_, word]) => word),
    )
      .skip(openParenthesis)
      .skip(keyword("n")),
  ),
  sequence(optionalAll(keyword("gerund")), optionalNumber)
    .skip(closeParenthesis),
)
  .map(([[noun, plural], [gerund, number]]) => {
    if (plural == null) {
      if (number == null) {
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
      } else {
        const escaped = escapeHtml(noun);
        let singular: null | string;
        let plural: null | string;
        switch (number) {
          case "singular":
            singular = escaped;
            plural = null;
            break;
          case "plural":
            singular = null;
            plural = escaped;
            break;
        }
        return { singular, plural, gerund: gerund != null };
      }
    } else {
      if (number != null) {
        throw new ArrayResultError(
          "plural or singular keyword within tag " +
            "must not be provided when singular and plural forms are defined",
        );
      }
      return {
        singular: escapeHtml(noun),
        plural,
        gerund: gerund != null,
      };
    }
  });
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
const determiner = checkedSequence(
  sequence(
    word,
    optionalWithCheck(checkedSequence(slash, word).map(([_, word]) => word))
      .skip(openParenthesis)
      .skip(keyword("d")),
  ),
  sequence(determinerType, optionalNumber.skip(closeParenthesis)),
)
  .map(([[determiner, plural], [kind, quantity]]) =>
    ({
      determiner,
      plural,
      kind,
      quantity: quantity ?? "both",
    }) as const
  );
const adjectiveKind = choiceWithCheck(
  checkedSequence(keyword("physical"), keyword("quality"))
    .map(() => "physical quality" as const),
  checkedAsWhole(
    choiceOnlyOne(
      keyword("opinion"),
      keyword("size"),
      keyword("age"),
      keyword("color"),
      keyword("origin"),
      keyword("material"),
      keyword("qualifier"),
    ),
  ),
);
const adjective = checkedSequence(
  sequence(
    all(simpleUnit("adv")),
    word.skip(openParenthesis).skip(keyword("adj")),
  ),
  sequence(
    adjectiveKind,
    optionalAll(keyword("gerund-like")).skip(closeParenthesis),
  ),
)
  .map(([[adverb, adjective], [kind, gerundLike]]) => ({
    adverb,
    adjective,
    kind,
    gerundLike: gerundLike != null,
  }));
const noun = sequence(
  allWithCheck(determiner),
  allWithCheck(adjective),
  nounOnly.parser,
  optionalWithCheck(
    checkedSequence(
      simpleUnit("adj"),
      word.skip(tag(sequence(keyword("n"), keyword("proper")))),
    )
      .map(([adjective, name]) => ({ adjective, name })),
  ),
)
  .map(([determiner, adjective, noun, postAdjective]) =>
    ({
      ...noun,
      determiner,
      adjective,
      postAdjective,
    }) as const
  );
const checkedNoun = new CheckedParser(
  choiceOnlyOne(
    determiner.check,
    adjective.check,
    nounOnly.check,
  ),
  noun,
);
function simpleDefinitionWith<T>(
  tag: Parser<unknown>,
  after: Parser<T>,
): CheckedParser<readonly [string, T]> {
  return checkedSequence(
    word.skip(openParenthesis).skip(tag),
    closeParenthesis.with(after),
  );
}
function simpleDefinition(tag: Parser<unknown>): CheckedParser<string> {
  return simpleDefinitionWith(tag, nothing).map(([word]) => word);
}
function simpleDefinitionWithTemplate(
  tag: Parser<unknown>,
  templateInside: Parser<unknown>,
): CheckedParser<string> {
  return simpleDefinitionWith(tag, template(templateInside))
    .map(([word]) => word);
}
const interjectionDefinition = simpleDefinition(keyword("i"))
  .map((interjection) => ({ type: "interjection", interjection }) as const);
const particleDefinition = simpleDefinition(
  sequence(keyword("particle"), keyword("def")),
)
  .map((definition) => ({ type: "particle definition", definition }) as const);
const adverbDefinition = simpleDefinition(keyword("adv"))
  .map((adverb) => ({ type: "adverb", adverb }) as const);
const prepositionDefinition = simpleDefinitionWithTemplate(
  keyword("prep"),
  sequence(keyword("indirect"), keyword("object")),
)
  .map((preposition) => ({ type: "preposition", preposition }) as const);
const numeralDefinition = simpleDefinition(keyword("num"))
  .map((num) => {
    const numeral = Number.parseInt(num);
    if (Number.isNaN(numeral)) {
      throw new ArrayResultError(`"${num}" is not a number`);
    } else {
      return { type: "numeral", numeral } as const;
    }
  });
const fillerDefinition = checkedSequence(
  sequence(
    word,
    allWithCheck(
      checkedSequence(slash, word).map(([_, character]) => character),
    ),
  )
    .skip(openParenthesis)
    .skip(keyword("f"))
    .map(([first, rest]) => [first, ...rest]),
  closeParenthesis,
)
  .map(([forms]) => {
    if (forms.length === 1) {
      return {
        type: "filler",
        before: forms[0],
        repeat: "",
        after: "",
      } as const;
    }
    const [first, ...rest] = forms;
    for (let i = 0; i < first.length; i++) {
      const before = first.slice(0, i);
      const repeatString = first.slice(i, i + 1);
      const after = first.slice(i + 1);
      const passed = [...rest.entries()]
        .every(([i, test]) =>
          test === `${before}${repeatString.repeat(i + 2)}${after}`
        );
      if (passed) {
        return { type: "filler", before, repeat: repeatString, after } as const;
      }
    }
    throw new ArrayResultError(
      `"${forms.join("/")}" has no repetition pattern found`,
    );
  });
const fourFormPersonalPronounDefinition = checkedSequence(
  sequence(
    word.skip(slash),
    word.skip(slash),
    word.skip(slash),
    word.skip(openParenthesis).skip(keyword("personal")),
  ),
  keyword("pronoun").with(perspective).skip(closeParenthesis),
)
  .map(([
    [singularSubject, singularObject, pluralSubject, pluralObject],
    perspective,
  ]) =>
    ({
      type: "personal pronoun",
      singular: { subject: singularSubject, object: singularObject },
      plural: { subject: pluralSubject, object: pluralObject },
      perspective,
    }) as const
  );
const twoFormPersonalPronounDefinition = checkedSequence(
  sequence(
    word.skip(slash),
    word.skip(openParenthesis).skip(keyword("personal")),
  ),
  sequence(
    keyword("pronoun").with(perspective),
    number.skip(closeParenthesis),
  ),
)
  .map(([[subject, object], [perspective, number]]) =>
    ({
      type: "personal pronoun",
      singular: null,
      plural: null,
      [number]: { subject, object },
      perspective,
    }) as const
  );
const nounDefinition = new CheckedParser(
  choiceOnlyOne(
    sequence(
      determiner.parser,
      choiceOnlyOne(
        determiner.check,
        adjective.check,
      ),
    )
      .map(() => null),
    sequence(
      adjective.parser,
      choiceOnlyOne(
        adjective.check,
        nounOnly.check,
      ),
    )
      .map(() => null),
    nounOnly.check,
  ),
  sequence(
    noun,
    optionalWithCheck(
      simpleDefinitionWithTemplate(keyword("prep"), keyword("headword")),
    ),
  ),
)
  .map(([noun, preposition]) =>
    preposition == null
      ? { ...noun, type: "noun" } as const
      : { type: "noun preposition", noun, preposition } as const
  );
const compoundAdjectiveDefinition = checkedSequence(
  adjective
    .parser
    .skip(keyword("and"))
    .skip(openParenthesis)
    .skip(keyword("c")),
  closeParenthesis.with(adjective.parser),
)
  .map((adjective) => ({ type: "compound adjective", adjective }) as const)
  .filter(({ adjective }) =>
    adjective.every((adjective) => adjective.adverb.length === 0) ||
    throwError(new ArrayResultError("compound adjective cannot have adverb"))
  );
const verbDefinition = checkedSequence(
  sequence(
    unescapedWord,
    optionalWithCheck(
      checkedSequence(slash, sequence(word.skip(slash), word))
        .map(([_, forms]) => forms),
    )
      .skip(sequence(openParenthesis, keyword("v"))),
  ),
  choiceWithCheck<null | PartialVerb>(
    checkedSequence(
      sequence(closeParenthesis, openBracket, keyword("object")),
      closeBracket
        .with(optionalWithCheck(
          simpleDefinitionWith(keyword("prep"), noun)
            .map(([preposition, object]) => ({ preposition, object }) as const),
        ))
        .map(nullableAsArray),
    )
      .map(([_, indirectObject]) => ({
        directObject: null,
        indirectObject,
        forObject: true,
        predicateType: null,
      })),
    checkedSequence(
      sequence(closeParenthesis, openBracket, keyword("predicate")),
      closeBracket,
    )
      .map(() => ({
        directObject: null,
        indirectObject: [],
        forObject: false,
        predicateType: "verb",
      })),
    checkedSequence(
      keyword("modal"),
      sequence(closeParenthesis, template(keyword("predicate"))),
    )
      .map(() => null),
    checkedSequence(
      keyword("linking"),
      sequence(closeParenthesis, template(keyword("predicate"))),
    )
      .map(() => ({
        directObject: null,
        indirectObject: [],
        forObject: false,
        predicateType: "noun adjective",
      })),
    new CheckedParser(
      nothing,
      sequence(
        closeParenthesis
          .with(
            optionalWithCheck(checkedNoun),
          ),
        optionalWithCheck(
          simpleDefinitionWith(
            keyword("prep"),
            choiceWithCheck<"template" | Noun>(
              checkedSequence(
                openBracket,
                sequence(keyword("object"), closeBracket),
              )
                .map(() => "template" as const),
              checkedNoun,
            ),
          ),
        ),
      ),
    )
      .map<PartialVerb>(([directObject, rawIndirectObject]) => {
        if (rawIndirectObject == null) {
          return {
            directObject,
            indirectObject: [],
            forObject: false,
            predicateType: null,
          };
        } else {
          const [preposition, indirectObject] = rawIndirectObject;
          if (indirectObject === "template") {
            return {
              directObject,
              indirectObject: [],
              forObject: preposition,
              predicateType: null,
            };
          } else {
            return {
              directObject,
              indirectObject: [{
                preposition,
                object: indirectObject,
              }],
              forObject: false,
              predicateType: null,
            };
          }
        }
      }),
  ),
)
  .map<Definition>(([[verb, forms], rest]) => {
    if (rest == null) {
      if (forms != null) {
        throw new ArrayResultError("modal verbs shouldn't be conjugated");
      }
      return { type: "modal verb", verb: escapeHtml(verb) };
    } else {
      let presentPlural: string;
      let presentSingular: string;
      let past: string;
      if (forms == null) {
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
            `no verb conjugation found for "${verb}". consider providing ` +
              "all conjugations instead",
          );
        }
        if (verb !== conjugations.Infinitive) {
          throw new ArrayResultError(
            `conjugation error: "${verb}" is not ` +
              `"${conjugations.Infinitive}". consider providing all ` +
              "conjugations instead",
          );
        }
        presentPlural = escapeHtml(conjugations.Infinitive);
        presentSingular = escapeHtml(conjugations.PresentTense);
        past = escapeHtml(conjugations.PastTense);
      } else {
        presentPlural = escapeHtml(verb);
        [presentSingular, past] = forms;
      }
      return { ...rest, type: "verb", presentPlural, presentSingular, past };
    }
  });
const definition = choiceWithCheck<Definition>(
  // noun parser must come before adjective, compound adjective, and determiner parsers
  nounDefinition,
  // compound adjective parser must come before adjective parser
  compoundAdjectiveDefinition,
  // adjective parser must come before adverb parser
  adjective.map((adjective) => ({ ...adjective, type: "adjective" })),
  verbDefinition,
  adverbDefinition,
  interjectionDefinition,
  particleDefinition,
  determiner.map((determiner) => ({ ...determiner, type: "determiner" })),
  prepositionDefinition,
  numeralDefinition,
  fillerDefinition,
  twoFormPersonalPronounDefinition,
  fourFormPersonalPronounDefinition,
);
const head = sequence(all(tokiPonaWord.skip(comma)), tokiPonaWord)
  .skip(colon)
  .map(([init, last]) => [...init, last]);
const entry = withSource(
  ignore.with(
    allWithCheck(
      new CheckedParser(
        sequence(unescapedWord, choiceOnlyOne(openParenthesis, slash)),
        definition.skip(semicolon),
      ),
    ),
  ),
)
  .map(([definitions, source]) => ({ definitions, source: source.trimEnd() }));
const dictionaryParser = ignore
  .with(allWithCheck(new CheckedParser(notEnd, sequence(head, entry))))
  .map((entries) =>
    new Map(
      entries.flatMap(([words, definition]) =>
        words.map((word) => [word, definition])
      ),
    )
  );
export function parseDictionary(sourceText: string): Dictionary {
  return dictionaryParser.parse(sourceText).unwrap()[0];
}
