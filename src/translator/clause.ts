import { ArrayResult } from "../array_result.ts";
import { nullableAsArray, throwError } from "../misc.ts";
import * as TokiPona from "../parser/ast.ts";
import * as English from "./ast.ts";
import { FilteredOutError, TranslationTodoError } from "./error.ts";
import { perspective } from "./noun.ts";
import { multiplePhrases, multiplePhrasesAsNoun } from "./phrase.ts";
import { predicate } from "./predicate.ts";
import { nounAsPreposition } from "./preposition.ts";
import { addModalToAll, verb } from "./verb.ts";
import { unemphasized } from "./word.ts";

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
                adverb: [],
                verb: {
                  modal: null,
                  first: unemphasized("is"),
                  rest: [],
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
            throw new FilteredOutError("verb as interjection");
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
      noun: unemphasized("I"),
      quantity: "singular",
      perspective: "first",
      postAdjective: null,
      preposition: [],
      emphasis: false,
    },
    verb: {
      type: "default",
      adverb: [],
      verb: {
        modal: null,
        first: unemphasized("wish"),
        rest: [],
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
      noun: unemphasized("you"),
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
            addModalToAll(unemphasized("should"), predicate),
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
              new FilteredOutError(`${phrase.type} within o vocative`),
            )
        );
    case "li clause":
      return liClause(clause);
    case "o clause":
      return oClause(clause);
    case "prepositions":
      return new ArrayResult(new TranslationTodoError(clause.type));
  }
}
export function contextClause(
  contextClause: TokiPona.ContextClause,
): ArrayResult<English.Clause> {
  switch (contextClause.type) {
    case "nanpa":
      return new ArrayResult(new TranslationTodoError("nanpa context clause"));
    default:
      return clause(contextClause);
  }
}
