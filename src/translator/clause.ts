import { IterableResult } from "../compound.ts";
import { nullableAsArray, throwError } from "../misc/misc.ts";
import * as TokiPona from "../parser/ast.ts";
import { addWay } from "./adjective.ts";
import * as English from "./ast.ts";
import { FilteredError, UntranslatableError } from "./error.ts";
import { nanpa } from "./nanpa.ts";
import { multiplePhrases } from "./phrase.ts";
import { predicate } from "./predicate.ts";
import { nounAsPreposition, preposition } from "./preposition.ts";
import { addVerbBefore } from "./verb.ts";
import { noEmphasis } from "./word.ts";
import { fromSimpleDefinition } from "./word_unit.ts";

function phraseClause(phrases: TokiPona.MultiplePhrases) {
  return multiplePhrases(phrases)
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
              singular: { subject: "it", object: "it" },
              plural: null,
              reduplicationCount: 1,
              wordEmphasis: false,
              perspective: "third",
              adjectiveName: null,
              postCompound: null,
              prepositions: [],
              phraseEmphasis: false,
              gerund: false,
            },
            verb: {
              type: "simple",
              verb: [
                {
                  verb: {
                    type: "non-modal",
                    presentPlural: "is",
                    presentSingular: "are",
                    past: "was",
                    reduplicationCount: 1,
                    emphasis: false,
                  },
                  preAdverbs: [],
                  postAdverb: null,
                },
              ],
              subjectComplement: {
                type: "adjective",
                adjective: phrase.adjective,
              },
              contentClause: null,
              object: null,
              objectComplement: null,
              prepositions: nullableAsArray(phrase.inWayPhrase)
                .map((object) =>
                  nounAsPreposition({ ...addWay(object), type: "simple" }, "in")
                ),
              hideVerb: true,
              forObject: false,
              predicateType: null,
              emphasis: false,
            },
            hideSubject: true,
          };
        case "verb":
          throw new FilteredError("verb as interjection");
      }
    });
}
export function subject(
  phrases: TokiPona.MultiplePhrases,
): IterableResult<English.NounPhrase> {
  return multiplePhrases(phrases)
    .map((phrase) =>
      phrase.type === "noun"
        ? phrase.noun
        : throwError(new FilteredError(`${phrase.type} as subject`))
    );
}
function liClause(clause: TokiPona.Clause & { type: "li clause" }) {
  return IterableResult.combine(
    subject(clause.subjects),
    predicate(clause.predicates, "li"),
  )
    .map(([subject, verb]): English.Clause => ({
      type: "simple",
      subject,
      verb,
      hideSubject: false,
    }));
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
      singular: { subject: "I", object: "me" },
      plural: null,
      wordEmphasis: false,
      reduplicationCount: 1,
      perspective: "first",
      adjectiveName: null,
      postCompound: null,
      prepositions: [],
      phraseEmphasis: false,
      gerund: false,
    },
    verb: {
      type: "simple",
      verb: [
        {
          verb: {
            type: "non-modal",
            presentPlural: "wish",
            presentSingular: "wishes",
            past: "wished",
            reduplicationCount: 1,
            emphasis: false,
          },
          preAdverbs: [],
          postAdverb: null,
        },
      ],
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
      forObject: false,
      predicateType: null,
      emphasis: false,
    },
    hideSubject: false,
  };
}

function oClause(clause: TokiPona.Clause & { type: "o clause" }) {
  const useSubject = clause.subjects != null
    ? subject(clause.subjects)
    : IterableResult.single<English.NounPhrase>({
      type: "simple",
      determiners: [],
      adjectives: [],
      singular: { subject: "you", object: "you" },
      reduplicationCount: 1,
      wordEmphasis: false,
      plural: null,
      perspective: "second",
      adjectiveName: null,
      postCompound: null,
      prepositions: [],
      phraseEmphasis: false,
      gerund: false,
    });
  return IterableResult.combine(useSubject, predicate(clause.predicates, "o"))
    .flatMap(([subject, predicate]) => {
      return IterableResult.fromArray<English.Clause>([
        iWish(subject, predicate),
        {
          type: "simple",
          subject,
          verb: addVerbBefore(predicate, {
            verb: { type: "modal", word: "should", emphasis: false },
            preAdverbs: [],
            postAdverb: null,
          }),
          hideSubject: false,
        },
      ]);
    });
}
export function clause(
  clause: TokiPona.Clause,
): IterableResult<English.Clause> {
  switch (clause.type) {
    case "phrases":
      return phraseClause(clause.phrases);
    case "o vocative":
      return multiplePhrases(clause.phrases)
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
          object: { ...object, type: "simple" },
          emphasis: false,
        }))
        .map((clause) => [clause]);
    case "anu":
      return IterableResult.errors([
        new UntranslatableError(`"anu la"`, "English clause"),
      ]);
    default:
      return IterableResult.concat(
        IterableResult.fromNullable(unwrapSingleWord(contextClause))
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
