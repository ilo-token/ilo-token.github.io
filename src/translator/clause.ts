import { nullableAsArray, throwError } from "../../misc/misc.ts";
import { IterableResult } from "../compound.ts";
import * as TokiPona from "../parser/ast.ts";
import * as English from "./ast.ts";
import { FilteredError, TranslationTodoError } from "./error.ts";
import { nanpa } from "./nanpa.ts";
import { perspective } from "./noun.ts";
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
    .map((phrase) => {
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
              postAdjective: null,
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
            prepositions: [],
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
      verb(predicate, perspective(subject), subject.quantity)
        .map((verb) => ({
          type: "simple",
          subject,
          verb,
          hideSubject: false,
        }))
    );
}
function iWish(subject: English.NounPhrase, verb: English.VerbPhrase) {
  return {
    type: "simple",
    subject: {
      type: "simple",
      determiners: [],
      adjectives: [],
      noun: noEmphasis("I"),
      quantity: "singular",
      perspective: "first",
      postAdjective: null,
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
  } as const;
}
function oClause(clause: TokiPona.Clause & { type: "o clause" }) {
  const subject = clause.subjects != null
    ? multiplePhrasesAsNoun({
      phrases: clause.subjects,
      place: "subject",
      includeGerund: true,
      andParticle: "en",
    })
    : IterableResult.single({
      type: "simple",
      determiners: [],
      adjectives: [],
      noun: noEmphasis("you"),
      quantity: "plural",
      perspective: "second",
      postAdjective: null,
      postCompound: null,
      prepositions: [],
      emphasis: false,
    });
  return IterableResult.combine(subject, predicate(clause.predicates, "o"))
    .flatMap(([subject, predicate]) => {
      const subjectPerspective = perspective(subject);
      return IterableResult.concat(
        verb(predicate, subjectPerspective, subject.quantity)
          .map((verb) => iWish(subject, verb)),
        IterableResult.from(() => {
          const takeNegative = true;
          return verb(
            addModalToAll("should", predicate, takeNegative),
            subjectPerspective,
            subject.quantity,
          );
        })
          .map((verb) => ({
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
          prepositions.map((preposition) => ({
            ...preposition,
            type: "preposition",
          }))
        );
    case "nanpa":
      return nanpa(contextClause)
        .map((object) => [{
          type: "preposition",
          adverbs: [],
          preposition: noEmphasis("at"),
          object,
          emphasis: false,
        }]);
    case "anu":
      return IterableResult.errors([
        new TranslationTodoError(`${contextClause.type} context clause`),
      ]);
    default:
      return IterableResult.concat<ReadonlyArray<English.Clause>>(
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
          .map((adverb) => [{ type: "adverb", adverb }]),
        clause(contextClause).map((clause) => [{
          type: "dependent",
          conjunction: noEmphasis("given"),
          clause,
        }]),
      );
  }
}
export function unwrapSingleWord(
  clause: TokiPona.Clause,
): null | TokiPona.WordUnit {
  if (clause.type === "phrases" && clause.phrases.type === "single") {
    const { phrases: { phrase } } = clause;
    if (phrase.type === "simple" && phrase.modifiers.length === 0) {
      return phrase.headWord;
    }
  }
  return null;
}
