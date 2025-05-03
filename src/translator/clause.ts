import { nullableAsArray, throwError } from "../../misc/misc.ts";
import { IterableResult } from "../compound.ts";
import * as TokiPona from "../parser/ast.ts";
import * as English from "./ast.ts";
import { FilteredError, TranslationTodoError } from "./error.ts";
import { nanpa } from "./nanpa.ts";
import { perspective, quantity } from "./noun.ts";
import { multiplePhrases, multiplePhrasesAsNoun } from "./phrase.ts";
import { predicate } from "./predicate.ts";
import { nounAsPreposition, preposition } from "./preposition.ts";
import { addModalToAll, noAdverbs, verb } from "./verb.ts";
import { noEmphasis } from "./word.ts";
import { fromSimpleDefinition } from "./word_unit.ts";

function phraseClause(phrases: TokiPona.MultiplePhrases) {
  return multiplePhrases({
    phrases,
    place: "object",
    includeGerund: true,
    andParticle: "en",
    includeVerb: false,
  })
    .map((phrase): English.Clause => {
      switch (phrase.type) {
        case "noun":
          return {
            type: "subject phrase",
            subject: phrase.noun,
          };
        case "adjective":
          return {
            type: "simple",
            subject: {
              type: "simple",
              determiners: [],
              adjectives: [],
              noun: {
                word: "it",
                emphasis: false,
              },
              quantity: "singular",
              perspective: "third",
              adjectiveName: null,
              postCompound: null,
              prepositions: [],
              emphasis: false,
            },
            verb: {
              type: "simple",
              verb: {
                modal: null,
                verbs: [noAdverbs(noEmphasis("is"))],
              },
              subjectComplement: {
                type: "adjective",
                adjective: phrase.adjective,
              },
              contentClause: null,
              object: null,
              objectComplement: null,
              prepositions: nullableAsArray(phrase.inWayPhrase)
                .map((object) => nounAsPreposition(object, "in")),
              hideVerb: true,
            },
            hideSubject: true,
          };
        case "verb":
          throw new FilteredError("verb as interjection");
      }
    });
}
function liClause(clause: TokiPona.Clause & { type: "li clause" }) {
  return IterableResult.combine(
    multiplePhrasesAsNoun({
      phrases: clause.subjects,
      place: "subject",
      includeGerund: true,
      andParticle: "en",
    }),
    predicate(clause.predicates, "li"),
  )
    .flatMap(([subject, predicate]) =>
      verb(predicate, perspective(subject), quantity(subject))
        .map((verb): English.Clause => ({
          type: "simple",
          subject,
          verb,
          hideSubject: false,
        }))
    );
}
function iWish(
  subject: English.NounPhrase,
  verb: English.VerbPhrase,
): English.Clause {
  return {
    type: "simple",
    subject: {
      type: "simple",
      determiners: [],
      adjectives: [],
      noun: noEmphasis("I"),
      quantity: "singular",
      perspective: "first",
      adjectiveName: null,
      postCompound: null,
      prepositions: [],
      emphasis: false,
    },
    verb: {
      type: "simple",
      verb: {
        modal: null,
        verbs: [noAdverbs(noEmphasis("wish"))],
      },
      subjectComplement: null,
      contentClause: {
        type: "simple",
        subject,
        verb,
        hideSubject: false,
      },
      object: null,
      objectComplement: null,
      prepositions: [],
      hideVerb: false,
    },
    hideSubject: false,
  };
}
function oClause(clause: TokiPona.Clause & { type: "o clause" }) {
  const subject = clause.subjects != null
    ? multiplePhrasesAsNoun({
      phrases: clause.subjects,
      place: "subject",
      includeGerund: true,
      andParticle: "en",
    })
    : IterableResult.single<English.NounPhrase>({
      type: "simple",
      determiners: [],
      adjectives: [],
      noun: noEmphasis("you"),
      quantity: "plural",
      perspective: "second",
      adjectiveName: null,
      postCompound: null,
      prepositions: [],
      emphasis: false,
    });
  return IterableResult.combine(subject, predicate(clause.predicates, "o"))
    .flatMap(([subject, predicate]) => {
      const subjectPerspective = perspective(subject);
      const subjectQuantity = quantity(subject);
      return IterableResult.concat(
        verb(predicate, subjectPerspective, subjectQuantity)
          .map((verb) => iWish(subject, verb)),
        IterableResult.from(() => {
          return verb(
            addModalToAll({
              modal: "should",
              verb: predicate,
              takeNegative: true,
            }),
            subjectPerspective,
            subjectQuantity,
          );
        })
          .map((verb): English.Clause => ({
            type: "simple",
            subject,
            verb,
            hideSubject: false,
          })),
      );
    });
}
export function clause(
  clause: TokiPona.Clause,
): IterableResult<English.Clause> {
  switch (clause.type) {
    case "phrases":
      return phraseClause(clause.phrases);
    case "o vocative":
      return multiplePhrases({
        phrases: clause.phrases,
        place: "object",
        includeGerund: true,
        andParticle: "en",
        includeVerb: false,
      })
        .map((phrase) =>
          phrase.type === "noun"
            ? { type: "vocative", call: "hey", addressee: phrase.noun }
            : throwError(
              new FilteredError(`${phrase.type} within o vocative`),
            )
        );
    case "li clause":
      return liClause(clause);
    case "o clause":
      return oClause(clause);
  }
}
export function contextClause(
  contextClause: TokiPona.ContextClause,
): IterableResult<ReadonlyArray<English.Clause>> {
  switch (contextClause.type) {
    case "prepositions":
      return IterableResult.combine(
        ...contextClause.prepositions.map(preposition),
      )
        .map((prepositions) =>
          prepositions.map((preposition): English.Clause => ({
            ...preposition,
            type: "preposition",
          }))
        );
    case "nanpa":
      return nanpa(contextClause)
        .map((object): English.Clause => ({
          type: "preposition",
          adverbs: [],
          preposition: noEmphasis("at"),
          object,
          emphasis: false,
        }))
        .map((clause) => [clause]);
    case "anu":
      return IterableResult.errors([
        new TranslationTodoError(`${contextClause.type} context clause`),
      ]);
    default:
      return IterableResult.concat(
        IterableResult.fromArray(
          nullableAsArray(unwrapSingleWord(contextClause)),
        )
          .flatMap((wordUnit) =>
            fromSimpleDefinition(
              wordUnit,
              (definition) =>
                definition.type === "adverb" ? definition.adverb : null,
            )
          )
          .map(
            (adverb): English.Clause => ({ type: "adverb", adverb }),
          ),
        clause(contextClause).map((clause): English.Clause => ({
          type: "dependent",
          conjunction: noEmphasis("given"),
          clause,
        })),
      )
        .map((clause) => [clause]);
  }
}
export function unwrapSingleWord(
  clause: TokiPona.Clause,
): null | TokiPona.WordUnit {
  if (clause.type === "phrases" && clause.phrases.type === "simple") {
    const { phrases: { phrase } } = clause;
    if (phrase.type === "simple" && phrase.modifiers.length === 0) {
      return phrase.headWord;
    }
  }
  return null;
}
