import { ArrayResult } from "../array_result.ts";
import { nullableAsArray, throwError } from "../../misc/misc.ts";
import * as TokiPona from "../parser/ast.ts";
import * as English from "./ast.ts";
import { FilteredError, TranslationTodoError } from "./error.ts";
import { perspective } from "./noun.ts";
import { multiplePhrases, multiplePhrasesAsNoun } from "./phrase.ts";
import { predicate } from "./predicate.ts";
import { nounAsPreposition, preposition } from "./preposition.ts";
import { addModalToAll, noAdverbs, verb } from "./verb.ts";
import { noEmphasis } from "./word.ts";

function phraseClause(
  phrases: TokiPona.MultiplePhrases,
): ArrayResult<English.Clause> {
  return multiplePhrases({
    phrases,
    place: "object",
    includeGerund: true,
    andParticle: "en",
    includeVerb: false,
  })
    .map<English.Clause>(
      (phrase) => {
        switch (phrase.type) {
          case "noun":
            return {
              type: "subject phrase",
              subject: phrase.noun,
            };
          case "adjective":
            return {
              type: "default",
              subject: {
                type: "simple",
                determiner: [],
                adjective: [],
                noun: {
                  word: "it",
                  emphasis: false,
                },
                quantity: "singular",
                perspective: "third",
                postAdjective: null,
                preposition: [],
                emphasis: false,
              },
              verb: {
                type: "default",
                verb: {
                  modal: null,
                  verb: [noAdverbs(noEmphasis("is"))],
                },
                subjectComplement: {
                  type: "adjective",
                  adjective: phrase.adjective,
                },
                contentClause: null,
                object: null,
                objectComplement: null,
                preposition: nullableAsArray(phrase.inWayPhrase)
                  .map((object) => nounAsPreposition(object, "in")),
                hideVerb: true,
              },
              preposition: [],
              hideSubject: true,
            };
          case "verb":
            throw new FilteredError("verb as interjection");
        }
      },
    );
}
function liClause(
  clause: TokiPona.Clause & { type: "li clause" },
): ArrayResult<English.Clause> {
  return ArrayResult.combine(
    multiplePhrasesAsNoun({
      phrases: clause.subjects,
      place: "subject",
      includeGerund: true,
      andParticle: "en",
    }),
    predicate(clause.predicates, "li"),
  )
    .flatMap(([subject, predicate]) => {
      return verb(predicate, perspective(subject), subject.quantity)
        .map((verb) => ({
          type: "default",
          subject,
          verb,
          hideSubject: false,
        }));
    });
}
function iWish(
  subject: English.NounPhrase,
  verb: English.VerbPhrase,
): English.Clause {
  return {
    type: "default",
    subject: {
      type: "simple",
      determiner: [],
      adjective: [],
      noun: noEmphasis("I"),
      quantity: "singular",
      perspective: "first",
      postAdjective: null,
      preposition: [],
      emphasis: false,
    },
    verb: {
      type: "default",
      verb: {
        modal: null,
        verb: [noAdverbs(noEmphasis("wish"))],
      },
      subjectComplement: null,
      contentClause: {
        type: "default",
        subject,
        verb,
        hideSubject: false,
      },
      object: null,
      objectComplement: null,
      preposition: [],
      hideVerb: false,
    },
    hideSubject: false,
  };
}
function oClause(
  clause: TokiPona.Clause & { type: "o clause" },
): ArrayResult<English.Clause> {
  const subject = clause.subjects != null
    ? multiplePhrasesAsNoun({
      phrases: clause.subjects,
      place: "subject",
      includeGerund: true,
      andParticle: "en",
    })
    : new ArrayResult<English.NounPhrase>([{
      type: "simple",
      determiner: [],
      adjective: [],
      noun: noEmphasis("you"),
      quantity: "plural",
      perspective: "second",
      postAdjective: null,
      preposition: [],
      emphasis: false,
    }]);
  return ArrayResult.combine(subject, predicate(clause.predicates, "o"))
    .flatMap(([subject, predicate]) => {
      const subjectPerspective = perspective(subject);
      return ArrayResult.concat(
        verb(predicate, subjectPerspective, subject.quantity)
          .map<English.Clause>((verb) => iWish(subject, verb)),
        ArrayResult.from(() =>
          verb(
            addModalToAll(
              noAdverbs(noEmphasis("should")),
              predicate,
            ),
            subjectPerspective,
            subject.quantity,
          )
        )
          .map((verb) => ({
            type: "default",
            subject,
            verb,
            hideSubject: false,
          })),
      );
    });
}
export function clause(clause: TokiPona.Clause): ArrayResult<English.Clause> {
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
): ArrayResult<ReadonlyArray<English.Clause>> {
  switch (contextClause.type) {
    case "prepositions":
      return ArrayResult.combine(...contextClause.prepositions.map(preposition))
        .map((prepositions) =>
          prepositions.map((preposition) => ({
            ...preposition,
            type: "preposition",
          }))
        );
    case "nanpa":
    case "anu":
      return new ArrayResult(
        new TranslationTodoError(`${contextClause.type} context clause`),
      );
    default:
      return clause(contextClause).map((clause) => [{
        type: "dependent",
        conjunction: noEmphasis("given"),
        clause,
      }]);
  }
}
