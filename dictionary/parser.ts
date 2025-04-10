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
  end,
  lookAhead,
  match,
  matchString,
  optionalAll,
  optionalWithCheck,
  Parser,
  sequence,
  UnexpectedError,
  withSource,
} from "../src/parser/parser_lib.ts";
import { Definition, Dictionary, VerbForms } from "./type.ts";
const RESERVED_SYMBOLS = "#()*+/:;<=>@[\\]^`{|}~";
const UNRESERVED_CHARACTER = new RegExp(`[^${escapeRegex(RESERVED_SYMBOLS)}]`);

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
const unreservedCharacter = match(UNRESERVED_CHARACTER, "word");
const unescapedWord = allAtLeastOnceWithCheck(
  new CheckedParser(
    choiceOnlyOne(unreservedCharacter, backtick),
    choiceWithCheck(
      checkedAsWhole(unreservedCharacter),
      checkedSequence(backtick, character.skip(backtick))
        .map(([_, character]) => character),
      comment.map(() => ""),
    ),
  ),
)
  .map((word) => word.join("").replaceAll(/\s+/g, " ").trim())
  .filter((word) =>
    word !== "" || throwError(new ArrayResultError("missing word"))
  );
const word = unescapedWord.map(escapeHtml);
const forms = sequence(
  word,
  allWithCheck(checkedSequence(slash, word).map(([_, character]) => character)),
)
  .map(([first, rest]) => [first, ...rest]);
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

function detectRepetition(
  source: ReadonlyArray<string>,
): Readonly<{ before: string; repeat: string; after: string }> {
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
        // TODO: error message
        throw new ArrayResultError("");
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
  choiceOnlyOne(determiner.check, adjective.check, nounOnly.check),
  noun,
);
function verbOnly(tagInside: Parser<unknown>): Parser<VerbForms> {
  return choiceWithCheck(
    checkedSequence(
      word.skip(slash),
      sequence(
        word.skip(slash),
        word.skip(tag(tagInside)),
      ),
    )
      .map(([presentPlural, [presentSingular, past]]) => ({
        presentPlural,
        presentSingular,
        past,
      }))
      .filter(({ presentPlural, presentSingular, past }) => {
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
      }),
    checkedAsWhole(unescapedWord.skip(tag(tagInside)))
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
        return {
          presentPlural: escapeHtml(conjugations.Infinitive),
          presentSingular: escapeHtml(conjugations.PresentTense),
          past: escapeHtml(conjugations.PastTense),
        };
      }),
  );
}
const verb = verbOnly(keyword("v"));
const linkingVerb = verbOnly(sequence(keyword("v"), keyword("linking")));
function simpleDefinition(tag: Parser<unknown>): CheckedParser<string> {
  return checkedSequence(
    word.skip(openParenthesis).skip(tag),
    closeParenthesis,
  )
    .map(([word]) => word);
}
function simpleDefinitionWithTemplate(
  tag: Parser<unknown>,
  templateInside: Parser<unknown>,
): CheckedParser<string> {
  return checkedSequence(
    word.skip(openParenthesis).skip(tag),
    closeParenthesis.skip(template(templateInside)),
  )
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
  forms.skip(openParenthesis).skip(keyword("f")),
  closeParenthesis,
)
  .map(([forms]) =>
    ({
      ...detectRepetition(forms),
      type: "filler",
    }) as const
  );
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
  sequence(
    allWithCheck(determiner),
    allWithCheck(adjective),
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
// const verbDefinition_ = checkedSequence(
//   sequence(
//     unescapedWord,
//     optionalWithCheck(
//       checkedSequence(slash, sequence(word.skip(slash), word))
//         .map(([_, forms]) => forms),
//     )
//       .parser
//       .skip(sequence(openParenthesis, keyword("v"))),
//   ),
// );

// (v modal)
// (v linking) [predicate]
// (v) [predicate]
// (v) [object] Noun?
// (v) Noun? (prep)? [object]?

const verbDefinition = choiceOnlyOne<Definition>(
  sequence(
    verb,
    optionalAll(template(keyword("object"))),
    optionalWithCheck(
      checkedSequence(simpleUnit("prep"), noun)
        .map(([preposition, object]) => ({ preposition, object })),
    )
      .map(nullableAsArray),
  )
    .skip(lookAhead(semicolon))
    .map(([verb, forObject, indirectObject]) => ({
      ...verb,
      type: "verb",
      directObject: null,
      indirectObject,
      forObject: forObject != null,
      predicateType: null,
    })),
  sequence(
    verb,
    optionalWithCheck(checkedNoun),
    optionalWithCheck(
      checkedSequence(
        simpleUnit("prep"),
        template(keyword("object")),
      )
        .map(([preposition]) => preposition),
    ),
  )
    .skip(lookAhead(semicolon))
    .map(([verb, directObject, preposition]) => ({
      ...verb,
      type: "verb",
      directObject,
      indirectObject: [],
      forObject: preposition ?? false,
      predicateType: null,
    })),
  verb
    .skip(template(keyword("predicate")))
    .skip(lookAhead(semicolon))
    .map((verb) => ({
      ...verb,
      type: "verb",
      directObject: null,
      indirectObject: [],
      forObject: false,
      predicateType: "verb",
    })),
  word
    .skip(tag(sequence(keyword("v"), keyword("modal"))))
    .skip(template(keyword("predicate")))
    .skip(lookAhead(semicolon))
    .map((verb) => ({
      type: "modal verb",
      verb,
    })),
  linkingVerb
    .skip(template(keyword("predicate")))
    .skip(lookAhead(semicolon))
    .map((verb) => ({
      ...verb,
      type: "verb",
      directObject: null,
      indirectObject: [],
      forObject: false,
      predicateType: "noun adjective",
    })),
);
const definition = choiceWithCheck<Definition>(
  interjectionDefinition,
  particleDefinition,
  prepositionDefinition,
  numeralDefinition,
  fillerDefinition,
  fourFormPersonalPronounDefinition,
  twoFormPersonalPronounDefinition,
  // noun parser must come before adjective, compound adjective, and determiner parsers
  nounDefinition,
  // compound adjective parser must come before adjective parser
  compoundAdjectiveDefinition,
  // adjective parser must come before adverb parser
  adjective.map((adjective) => ({ ...adjective, type: "adjective" })),
  adverbDefinition,
  determiner.map((determiner) => ({ ...determiner, type: "determiner" })),
  checkedAsWhole(verbDefinition),
);
const head = sequence(all(tokiPonaWord.skip(comma)), tokiPonaWord)
  .skip(colon)
  .map(([init, last]) => [...init, last]);
const entry = withSource(
  ignore.with(
    allWithCheck(
      new CheckedParser(
        sequence(word, choiceOnlyOne(openParenthesis, slash)),
        definition.skip(semicolon),
      ),
    ),
  ),
)
  .map(([definitions, source]) => ({ definitions, source: source.trimEnd() }));
const dictionaryParser = ignore
  .with(allWithCheck(checkedSequence(head, entry)))
  .skip(end)
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
