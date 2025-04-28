import { memoize } from "@std/cache/memoize";
import { escape as escapeHtml } from "@std/html/entities";
import { escape as escapeRegex } from "@std/regexp/escape";
import nlp from "compromise/three";
import { nullableAsArray, throwError } from "../misc/misc.ts";
import {
  all,
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
  UnrecognizedError,
  withPosition,
  withSource,
} from "../src/parser/parser_lib.ts";
import { Definition, Dictionary, Noun, PartialVerb } from "./type.ts";

const RESERVED_SYMBOLS = "#()*+/:;<=>@[\\]^`{|}~";

const hashSign = matchString("#", "hash sign");
const backtick = matchString("`", "backtick");
const colon = matchString(":", "colon");

const character = match(/./u, "character");
const wordCharacter = match(
  new RegExp(`[^${escapeRegex(RESERVED_SYMBOLS)}]`),
  "word character",
);
const comment = checkedSequence(
  hashSign,
  match(/[^\n]*?(?=\r?\n|$)/, "comment content"),
);
const spaces = checkedSequence(
  match(/\s/, "space"),
  match(/\s*/, "space"),
);
const ignore = allWithCheck(
  new CheckedParser(
    choiceOnlyOne(hashSign, spaces.check),
    choiceWithCheck(spaces, comment),
  ),
);
function lex<const T>(parser: Parser<T>) {
  return parser.skip(ignore);
}
const wordWithPosition = lex(
  withPosition(match(/[a-z][a-zA-Z]*/, "Toki Pona word")),
);
const openParenthesis = lex(matchString("(", "open parenthesis"));
const closeParenthesis = lex(matchString(")", "close parenthesis"));
const openBracket = lex(matchString("[", "open bracket"));
const closeBracket = lex(matchString("]", "close bracket"));
const comma = lex(matchString(",", "comma"));
const semicolon = lex(matchString(";", "semicolon"));
const slash = lex(matchString("/", "slash"));

const keyword = memoize(<const T extends string>(keyword: T) =>
  lex(withPosition(match(/[a-z\-]+/, `"${keyword}"`)))
    .map((positioned) =>
      positioned.value === keyword ? positioned.value : throwError(
        new UnexpectedError(
          `"${positioned.value}"`,
          `"${keyword}"`,
          positioned,
        ),
      )
    ) as Parser<T>
);
const checkedCharacter = checkedAsWhole(wordCharacter);
const escape = checkedSequence(backtick, character.skip(backtick))
  .map(([_, character]) => character);
const unescapedWord = sequence(
  choiceWithCheck(checkedCharacter, escape),
  allWithCheck(
    new CheckedParser(
      choiceOnlyOne(wordCharacter, backtick, hashSign),
      choiceWithCheck(checkedCharacter, escape, comment.map(() => "")),
    ),
  ),
)
  .map(([first, rest]) =>
    `${first}${rest.join("")}`.replaceAll(/\s+/g, " ").trim()
  );
const word = unescapedWord.map(escapeHtml);
const number = choiceOnlyOne(keyword("singular"), keyword("plural"));
const optionalNumber = optionalAll(number);
const perspective = choiceOnlyOne(
  keyword("first"),
  keyword("second"),
  keyword("third"),
);
function tag<const T>(parser: Parser<T>) {
  return openParenthesis.with(parser).skip(closeParenthesis);
}
function template<const T>(parser: Parser<T>) {
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
  .mapWithPositionedError(([[noun, plural], [gerund, number]]) => {
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
          throw `no singular or plural form found for "${noun}". consider ` +
            "providing both singular and plural forms instead";
        }
        if (noun !== singular) {
          throw `conjugation error: "${noun}" is not "${singular}". ` +
            "consider providing both singular and plural forms instead";
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
        throw "plural or singular keyword within tag " +
          "must not be provided when singular and plural forms are defined";
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
  .map(([[determiner, plural], [kind, quantity]]) => ({
    determiner,
    plural,
    kind,
    quantity: quantity ?? "both",
  }));
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
const adverb = checkedSequence(
  word.skip(openParenthesis).skip(keyword("adv")),
  optionalAll(keyword("negative")).skip(closeParenthesis),
)
  .map(([adverb, negative]) => ({
    adverb,
    negative: negative != null,
  }));
const adjective = checkedSequence(
  sequence(
    allWithCheck(adverb),
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
  .map(([determiner, adjective, noun, postAdjective]) => ({
    ...noun,
    determiner,
    adjective,
    postAdjective,
  }));
const checkedNoun = new CheckedParser(
  choiceOnlyOne(
    determiner.check,
    adjective.check,
    nounOnly.check,
  ),
  noun,
);
function checkedSimpleUnitWith<const T>(tag: string, after: Parser<T>) {
  return checkedSequence(
    word.skip(openParenthesis).skip(keyword(tag)),
    closeParenthesis.with(after),
  );
}
function checkedSimpleUnit(tag: string) {
  return checkedSimpleUnitWith(tag, nothing).map(([word]) => word);
}
function checkedSimpleUnitWithTemplate(
  tag: string,
  templateInside: Parser<unknown>,
) {
  return checkedSimpleUnitWith(tag, template(templateInside))
    .map(([word]) => word);
}
const interjectionDefinition = checkedSimpleUnit("i")
  .map((interjection) => ({ type: "interjection", interjection }));
const particleDefinition = checkedSequence(
  word.skip(openParenthesis).skip(keyword("particle")),
  sequence(keyword("def"), closeParenthesis),
)
  .map(([definition]) => ({ type: "particle definition", definition }));
const prepositionDefinition = checkedSimpleUnitWithTemplate(
  "prep",
  sequence(keyword("indirect"), keyword("object")),
)
  .map((preposition) => ({ type: "preposition", preposition }));
const numeralDefinition = checkedSimpleUnit("num")
  .mapWithPositionedError((num) => {
    const numeral = +num;
    if (!Number.isInteger(numeral)) {
      throw `"${num}" is not a number`;
    } else {
      return { type: "numeral", numeral };
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
  .mapWithPositionedError(([forms]) => {
    if (forms.length === 1) {
      return {
        type: "filler",
        before: forms[0],
        repeat: "",
        after: "",
      };
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
        return { type: "filler", before, repeat: repeatString, after };
      }
    }
    throw `"${forms.join("/")}" has no repetition pattern found`;
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
  ]) => ({
    type: "personal pronoun",
    singular: { subject: singularSubject, object: singularObject },
    plural: { subject: pluralSubject, object: pluralObject },
    perspective,
  }));
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
  .map(([[subject, object], [perspective, number]]) => ({
    type: "personal pronoun",
    singular: null,
    plural: null,
    [number]: { subject, object },
    perspective,
  }));
const nounDefinition = new CheckedParser(
  choiceWithCheck(
    new CheckedParser(
      determiner.check,
      sequence(
        determiner.parser,
        choiceOnlyOne(determiner.check, adjective.check, nounOnly.check),
      ),
    ),
    new CheckedParser(
      adjective.check,
      sequence(
        adjective.parser,
        choiceOnlyOne(adjective.check, nounOnly.check),
      ),
    ),
    checkedAsWhole(nounOnly.check),
  ),
  sequence(
    noun,
    optionalWithCheck(
      checkedSimpleUnitWithTemplate("prep", keyword("headword")),
    ),
  ),
)
  .map(([noun, preposition]) =>
    preposition == null
      ? { ...noun, type: "noun" }
      : { type: "noun preposition", noun, preposition }
  );
const compoundAdjectiveDefinition = checkedSequence(
  adjective
    .parser
    .skip(keyword("and"))
    .skip(openParenthesis)
    .skip(keyword("c")),
  closeParenthesis.with(adjective.parser),
)
  .map((adjective) => ({ type: "compound adjective", adjective }))
  .filterWithPositionedError(({ adjective }) =>
    adjective.every((adjective) => adjective.adverb.length === 0) ||
    throwError("compound adjective cannot have adverb")
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
  choiceWithCheck(
    checkedSequence(
      sequence(closeParenthesis, openBracket, keyword("object")),
      closeBracket
        .with(optionalWithCheck(
          checkedSimpleUnitWith("prep", noun)
            .map(([preposition, object]) => ({ preposition, object })),
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
    checkedSequence(
      closeParenthesis,
      sequence(
        optionalWithCheck(checkedNoun),
        optionalWithCheck(
          checkedSimpleUnitWith(
            "prep",
            choiceWithCheck<"template" | Noun>(
              checkedSequence(
                openBracket,
                sequence(keyword("object"), closeBracket),
              )
                .map(() => "template"),
              checkedNoun,
            ),
          ),
        ),
      ),
    )
      .map<PartialVerb>(([_, [directObject, rawIndirectObject]]) => {
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
  .mapWithPositionedError<Definition>(([[verb, forms], rest]) => {
    if (rest == null) {
      if (forms != null) {
        throw "modal verbs shouldn't be conjugated";
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
          throw `no verb conjugation found for "${verb}". consider providing ` +
            "all conjugations instead";
        }
        if (verb !== conjugations.Infinitive) {
          throw `conjugation error: "${verb}" is not ` +
            `"${conjugations.Infinitive}". consider providing all ` +
            "conjugations instead";
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
const definition = choiceWithCheck(
  // noun parser must come before adjective, compound adjective, and determiner parsers
  nounDefinition,
  // compound adjective parser must come before adjective parser
  compoundAdjectiveDefinition,
  // adjective parser must come before adverb parser
  adjective.map((adjective) => ({ ...adjective, type: "adjective" })),
  verbDefinition,
  adverb.map((adverb) => ({ ...adverb, type: "adverb" })),
  interjectionDefinition,
  particleDefinition,
  determiner.map((determiner) => ({ ...determiner, type: "determiner" })),
  prepositionDefinition,
  numeralDefinition,
  fillerDefinition,
  twoFormPersonalPronounDefinition,
  fourFormPersonalPronounDefinition,
);
const positionedHead = sequence(
  all(wordWithPosition.skip(comma)),
  wordWithPosition,
)
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
export const dictionaryParser: Parser<Dictionary> = ignore
  .with(
    allWithCheck(new CheckedParser(notEnd, sequence(positionedHead, entry))),
  )
  .map((allEntries) => {
    const entries = allEntries.flatMap(([words, definition]) =>
      words.map((word) => [word, definition] as const)
    );
    const recorded: Set<string> = new Set();
    const errors: Array<UnrecognizedError> = [];
    for (const [head] of entries) {
      if (recorded.has(head.value)) {
        errors.push(
          new UnrecognizedError(
            `duplicate Toki Pona word "${head.value}"`,
            head,
          ),
        );
      } else {
        recorded.add(head.value);
      }
    }
    if (errors.length > 0) {
      throw new AggregateError(errors);
    } else {
      return new Map(
        entries.map(([head, definition]) => [head.value, definition]),
      );
    }
  });
