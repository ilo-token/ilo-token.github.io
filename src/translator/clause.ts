import * as Dictionary from "../../dictionary/type.ts";
import { ArrayResult } from "../array_result.ts";
import { nullableAsArray } from "../misc.ts";
import * as TokiPona from "../parser/ast.ts";
import * as English from "./ast.ts";
import { FilteredOutError, TranslationTodoError } from "./error.ts";
import { multiplePhrases, multiplePhrasesAsNoun } from "./phrase.ts";
import { predicate } from "./predicate.ts";
import { nounAsPreposition } from "./preposition.ts";
import { verb } from "./verb.ts";
import { unemphasized } from "./word.ts";

function phraseClause(
  phrases: TokiPona.MultiplePhrases,
): ArrayResult<English.Clause> {
  return multiplePhrases(phrases, "object", true, "en", false)
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
                  finite: [],
                  infinite: unemphasized("is"),
                },
                subjectComplement: {
                  type: "adjective",
                  adjective: phrase.adjective,
                },
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
    multiplePhrasesAsNoun(clause.subjects, "subject", true, "en"),
    predicate(clause.predicates, "li"),
  )
    .flatMap(([subject, predicate]) => {
      let perspective: Dictionary.Perspective;
      if (subject.type === "simple") {
        perspective = subject.perspective;
      } else {
        perspective = "third";
      }
      return verb(predicate, perspective, subject.quantity)
        .map((verb) => ({
          type: "default",
          subject,
          verb,
          hideSubject: false,
        }));
    });
}
export function clause(clause: TokiPona.Clause): ArrayResult<English.Clause> {
  switch (clause.type) {
    case "phrases":
      return phraseClause(clause.phrases);
    case "o vocative":
      return multiplePhrases(clause.phrases, "object", true, "en", false)
        .map((phrase) => {
          if (phrase.type === "noun") {
            return { type: "vocative", call: "hey", addressee: phrase.noun };
          } else {
            throw new FilteredOutError(`${phrase.type} within o vocative`);
          }
        });
    case "li clause":
      return liClause(clause);
    case "prepositions":
    case "o clause":
    case "quotation":
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
